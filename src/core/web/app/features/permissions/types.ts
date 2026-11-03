export interface RolePermissionRow {
  role: string;
  permission: string;
  allowed: boolean;
  updatedAt?: string;
}

export interface UserOverrideRow {
  userId: string;
  permission: string;
  allowed: boolean;
  setBy?: string | null;
  updatedAt?: string;
}

export type OrganizationAccessLevel = "read" | "review" | "manage";

export interface OrganizationScopeGrant {
  id: string;
  userId: string;
  orgId: string;
  accessLevel: OrganizationAccessLevel;
  reason: string;
  grantedBy: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScopeGrantInput {
  userId: string;
  orgId: string;
  accessLevel: OrganizationAccessLevel;
  reason: string;
  expiresAt?: string | null;
  grantedBy: string;
}
