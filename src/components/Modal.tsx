'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-4xl',
  };

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[100] overflow-y-auto transition-all duration-300 ${
        isOpen
          ? 'bg-slate-950/45'
          : 'pointer-events-none bg-slate-950/0'
      }`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      aria-hidden={!isOpen}
    >
      <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out focus:outline-none ${
          isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.97] opacity-0'
        }`}
      >
        <div className="relative border-b border-slate-200 bg-slate-50/70 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Make updates in a focused workspace without leaving the current page.
              </p>
            </div>
          <button
            onClick={onClose}
            className="group inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700 hover:shadow-md"
            aria-label="Close modal"
          >
            <X size={18} className="transition-transform group-hover:rotate-90" />
          </button>
          </div>
        </div>
        <div className="relative max-h-[calc(100vh-11rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {children}
        </div>
      </div>
      </div>
    </div>
  );
}
