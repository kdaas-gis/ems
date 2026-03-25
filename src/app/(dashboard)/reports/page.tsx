'use client';

import { Mail, FileText, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { getLocalDateString } from '@/lib/date';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportLog {
  employee: { name: string; employee_id: string };
  project?: { name: string; code: string } | null;
  task: string | null;
  status: string | null;
  description: string | null;
  work_date?: string;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [email, setEmail] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePreview = async () => {
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, action: 'preview' })
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewHtml(data.html);
        setLogs(data.logs || []);
      } else {
        setError(data.error);
      }
    } catch { setError('Failed to generate preview'); } finally { setLoading(false); }
  };

  const handleSend = async () => {
    setSending(true); setError(''); setMessage('');
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, email, action: 'send' })
      });
      const data = await res.json();
      if (res.ok) { setMessage(data.message); } else { setError(data.error); }
    } catch { setError('Failed to send report'); } finally { setSending(false); }
  };

  const generatePDF = () => {
    if (logs.length === 0) {
      setError('No data to export. Please preview the report first.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('GIS Team Daily Work Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report Period: ${startDate} to ${endDate}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

    const tableRows = logs.map(log => {
      const employeeLabel = `${log.employee.name}\n(${log.employee.employee_id})`;
      const projectName = log.project ? `\n[${log.project.name}]` : '';
      const taskLabel = `${log.task}${projectName}`;

      return [
        log.work_date || '',
        employeeLabel,
        taskLabel,
        log.description || '-',
        log.status === 'completed' ? 'Completed' : 'In Progress'
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['Date', 'Employee', 'Task / Project', 'Description', 'Status']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        4: { cellWidth: 25 }
      }
    });

    doc.save(`GIS-TEAM-Report-${startDate}-to-${endDate}.pdf`);
  };

  const generateExcel = () => {
    if (logs.length === 0) {
      setError('No data to export. Please preview the report first.');
      return;
    }

    const aoaData = [
      ['GIS Team Daily Work Report'],
      [`Report Period: ${startDate} to ${endDate}`],
      [],
      ['Date', 'Employee Name', 'Employee ID', 'Task', 'Project', 'Description', 'Status']
    ];

    logs.forEach(log => {
      aoaData.push([
        log.work_date || '',
        log.employee.name,
        log.employee.employee_id,
        log.task || '',
        log.project ? log.project.name : '-',
        log.description || '-',
        log.status === 'completed' ? 'Completed' : 'In Progress'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

    // Merge cells for title and subtitle
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
    ];

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Employee ID
      { wch: 30 }, // Task
      { wch: 20 }, // Project
      { wch: 40 }, // Description
      { wch: 15 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Work Report');
    XLSX.writeFile(workbook, `GIS-TEAM-Report-${startDate}-to-${endDate}.xlsx`);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Reports</h1>
        <p className="text-slate-500 text-sm font-medium">Generate and download daily work reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Generate Report</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-bold text-slate-700 mb-1.5">Start Date</label>
                <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-bold text-slate-700 mb-1.5">End Date</label>
                <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <button onClick={handlePreview} disabled={loading} className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {loading ? 'Generating...' : 'Preview Report'}
            </button>
          </div>

          <hr className="border-slate-100 my-6" />

          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Download Options</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={generatePDF}
              disabled={logs.length === 0}
              className="py-2.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={14} /> PDF
            </button>
            <button
              onClick={generateExcel}
              disabled={logs.length === 0}
              className="py-2.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>

          <hr className="border-slate-100 my-6" />

          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Send via Email</h3>
          <div className="space-y-3">
            <div><label htmlFor="recipient-email" className="block text-sm font-bold text-slate-700 mb-1.5">Recipient Email</label><input id="recipient-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Leave blank to send to all team leads" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
            <button onClick={handleSend} disabled={sending} className="w-full py-3 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors flex items-center justify-center gap-2">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {sending ? 'Sending...' : 'Send Report'}
            </button>
          </div>
          {message && <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">{message}</div>}
          {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Report Preview</h3>
            {logs.length > 0 && <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-md">{logs.length} entries</span>}
          </div>
          <div className="p-2 min-h-[500px]">
            {previewHtml ? (
              <iframe srcDoc={previewHtml} className="w-full min-h-[600px] rounded-xl bg-white" title="Report Preview" />
            ) : (
              <div className="flex items-center justify-center h-[500px] text-slate-500 text-sm">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-3 text-slate-300" strokeWidth={1} />
                  Select dates and click &ldquo;Preview Report&rdquo;
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
