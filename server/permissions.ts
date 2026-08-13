export type AppRole = "admin" | "auditor" | "operator" | "viewer" | "user";
export type Permission =
  | "manage_links"
  | "manage_captures"
  | "export_data"
  | "manage_settings"
  | "view_audit"
  | "view_health";

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: ["manage_links", "manage_captures", "export_data", "manage_settings", "view_audit", "view_health"],
  auditor: ["export_data", "view_audit", "view_health"],
  operator: ["manage_links", "manage_captures", "export_data", "view_health"],
  viewer: ["view_health"],
  user: ["manage_links", "manage_captures", "export_data", "view_health"],
};

export function can(role: string | null | undefined, permission: Permission): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role as AppRole]?.includes(permission));
}

export function roleLabel(role: string | null | undefined): string {
  return ({ admin: "超级管理员", auditor: "审计员", operator: "运营员", viewer: "只读用户", user: "普通用户" } as Record<string, string>)[role || ""] || "未知角色";
}
