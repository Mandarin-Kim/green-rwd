type Role = 'ADMIN' | 'SPONSOR' | 'CRA' | 'USER'

type Permission =
  | 'dashboard:view'
  | 'campaign:view' | 'campaign:create' | 'campaign:edit' | 'campaign:approve' | 'campaign:delete'
  | 'segment:view' | 'segment:create'
  | 'report:view' | 'report:order'
  | 'sending:view' | 'sending:approve' | 'sending:execute'
  | 'eclinical:view' | 'eclinical:manage'
  | 'admin:users' | 'admin:datasources' | 'admin:orders' | 'admin:settings'

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    'dashboard:view',
    'campaign:view', 'campaign:create', 'campaign:edit', 'campaign:approve', 'campaign:delete',
    'segment:view', 'segment:create',
    'report:view', 'report:order',
    'sending:view', 'sending:approve', 'sending:execute',
    'eclinical:view', 'eclinical:manage',
    'admin:users', 'admin:datasources', 'admin:orders', 'admin:settings',
  ],
  SPONSOR: [
    'dashboard:view',
    'campaign:view', 'campaign:create', 'campaign:edit',
    'segment:view', 'segment:create',
    'report:view', 'report:order',
    'sending:view',
    'eclinical:view',
  ],
  CRA: [
    'dashboard:view',
    'campaign:view',
    'segment:view',
    'report:view',
    'sending:view', 'sending:approve', 'sending:execute',
    'eclinical:view', 'eclinical:manage',
  ],
  USER: [
    'dashboard:view',
    'campaign:view',
    'segment:view',
    'report:view',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function getPermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? []
}
