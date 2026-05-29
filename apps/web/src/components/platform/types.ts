export type PlatformTenant = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  subdomain: string;
  schoolName: string | null;
  featureFlags: Record<string, boolean>;
  createdAt: string;
};

export type PlatformAuditEntry = {
  id: string;
  action: string;
  tenantId: string | null;
  actorEmail: string | null;
  createdAt: string;
};
