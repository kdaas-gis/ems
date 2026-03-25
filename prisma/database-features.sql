CREATE OR REPLACE VIEW employee_daily_work_summary AS
SELECT
  ws.employee_id,
  e.name AS employee_name,
  ws.work_date::date AS work_date,
  COUNT(*) AS total_logs,
  COUNT(*) FILTER (WHERE ws.status = 'completed') AS completed_logs,
  COUNT(*) FILTER (WHERE ws.status = 'in-progress') AS in_progress_logs
FROM work_status ws
LEFT JOIN employees e ON e.employee_id = ws.employee_id
GROUP BY ws.employee_id, e.name, ws.work_date::date;

CREATE OR REPLACE VIEW employee_task_status_summary AS
SELECT
  ta.employee_id,
  e.name AS employee_name,
  COUNT(*) AS total_assignments,
  COUNT(*) FILTER (WHERE ta.status = 'todo') AS todo_count,
  COUNT(*) FILTER (WHERE ta.status = 'in-progress') AS in_progress_count,
  COUNT(*) FILTER (WHERE ta.status = 'completed') AS completed_count,
  MAX(ta.updated_at) AS last_task_update
FROM task_assignment ta
JOIN employees e ON e.employee_id = ta.employee_id
GROUP BY ta.employee_id, e.name;

CREATE OR REPLACE VIEW project_overview AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.code AS project_code,
  p.status,
  COUNT(DISTINCT pa.employee_id) AS assigned_employees,
  COUNT(DISTINCT t.id) AS total_tasks,
  COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'completed') AS completed_task_assignments,
  COUNT(DISTINCT ws.id) AS total_work_logs
FROM project p
LEFT JOIN project_assignment pa ON pa.project_id = p.id
LEFT JOIN task t ON t.project_id = p.id
LEFT JOIN task_assignment ta ON ta.task_id = t.id
LEFT JOIN work_status ws ON ws.project_id = p.id
GROUP BY p.id, p.name, p.code, p.status;

CREATE OR REPLACE VIEW leave_request_overview AS
SELECT
  lr.id,
  lr.employee_id,
  e.name AS employee_name,
  lr.leave_type,
  lr.status,
  lr.start_date::date AS start_date,
  lr.end_date::date AS end_date,
  ((lr.end_date::date - lr.start_date::date) + 1) AS total_days,
  lr.created_at
FROM leave_request lr
JOIN employees e ON e.employee_id = lr.employee_id;

CREATE OR REPLACE VIEW attendance_daily_summary AS
SELECT
  a.attendance_date::date AS attendance_date,
  COUNT(*) AS total_present,
  COUNT(*) FILTER (WHERE a.check_out IS NOT NULL) AS checked_out,
  COUNT(*) FILTER (WHERE a.check_in IS NOT NULL AND a.check_out IS NULL) AS working_now
FROM attendance a
GROUP BY a.attendance_date::date;

CREATE OR REPLACE FUNCTION audit_row_changes()
RETURNS TRIGGER AS $$
DECLARE
  actor_id text;
  record_identifier text;
  row_snapshot jsonb;
BEGIN
  actor_id := NULLIF(current_setting('app.current_user_id', true), '');

  row_snapshot := CASE
    WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
    ELSE to_jsonb(NEW)
  END;

  record_identifier := COALESCE(
    row_snapshot->>'id',
    row_snapshot->>'employee_id',
    row_snapshot->>'code',
    row_snapshot->>'task_id',
    row_snapshot->>'project_id'
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_pk, operation, actor_employee_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, record_identifier, TG_OP, actor_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_pk, operation, actor_employee_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, record_identifier, TG_OP, actor_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_pk, operation, actor_employee_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, record_identifier, TG_OP, actor_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_employees_changes ON employees;
CREATE TRIGGER audit_employees_changes
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();

DROP TRIGGER IF EXISTS audit_project_changes ON project;
CREATE TRIGGER audit_project_changes
AFTER INSERT OR UPDATE OR DELETE ON project
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();

DROP TRIGGER IF EXISTS audit_work_status_changes ON work_status;
CREATE TRIGGER audit_work_status_changes
AFTER INSERT OR UPDATE OR DELETE ON work_status
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();

DROP TRIGGER IF EXISTS audit_task_changes ON task;
CREATE TRIGGER audit_task_changes
AFTER INSERT OR UPDATE OR DELETE ON task
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();

DROP TRIGGER IF EXISTS audit_task_assignment_changes ON task_assignment;
CREATE TRIGGER audit_task_assignment_changes
AFTER INSERT OR UPDATE OR DELETE ON task_assignment
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();

DROP TRIGGER IF EXISTS audit_attendance_changes ON attendance;
CREATE TRIGGER audit_attendance_changes
AFTER INSERT OR UPDATE OR DELETE ON attendance
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();

DROP TRIGGER IF EXISTS audit_leave_request_changes ON leave_request;
CREATE TRIGGER audit_leave_request_changes
AFTER INSERT OR UPDATE OR DELETE ON leave_request
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();

DROP TRIGGER IF EXISTS audit_project_assignment_changes ON project_assignment;
CREATE TRIGGER audit_project_assignment_changes
AFTER INSERT OR UPDATE OR DELETE ON project_assignment
FOR EACH ROW EXECUTE FUNCTION audit_row_changes();
