export interface AuthUser {
  id?: string;
  sub?: string;
  company_id?: string;
  companyId?: string;
}

export function getUserId(user?: AuthUser): string | undefined {
  return user?.id ?? user?.sub;
}
