export type AppRole = 'admin' | 'teamlead' | 'employee';

export function normalizeRole(role?: string | null): AppRole {
  if (role === 'admin' || role === 'teamlead') return role;
  return 'employee';
}

export function isAdmin(role?: string | null) {
  return normalizeRole(role) === 'admin';
}

export function isTeamLead(role?: string | null) {
  return normalizeRole(role) === 'teamlead';
}

export function canViewTeamData(role?: string | null) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'admin' || normalizedRole === 'teamlead';
}

export function canManageEmployees(role?: string | null) {
  return isAdmin(role);
}

export function canAccessReports(role?: string | null) {
  return canViewTeamData(role);
}

export function canApproveLeave(role?: string | null) {
  return canViewTeamData(role);
}

export function canAssignWork(role?: string | null) {
  return canViewTeamData(role);
}

export function canManageProjects(role?: string | null) {
  return canViewTeamData(role);
}
