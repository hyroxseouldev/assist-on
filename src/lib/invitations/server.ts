import { createHash } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type InvitationPreview = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: "owner" | "coach" | "member";
  programId: string | null;
  programTitle: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isExpired: boolean;
  isExhausted: boolean;
  teamName: string;
  logoUrl: string;
};

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getInvitationPreviewByToken(token: string): Promise<InvitationPreview | null> {
  const admin = createSupabaseAdminClient();
  const tokenHash = hashInvitationToken(token);

  const { data: invitation } = await admin
    .from("tenant_invitations")
    .select("id, tenant_id, role, program_id, max_uses, used_count, expires_at, tenants:tenant_id(slug, name), program:program_id(title)")
    .eq("token_hash", tokenHash)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      role: "owner" | "coach" | "member";
      program_id: string | null;
      max_uses: number;
      used_count: number;
      expires_at: string;
      tenants: { slug: string; name: string } | null;
      program: { title: string | null } | null;
    }>();

  if (!invitation || !invitation.tenants) {
    return null;
  }

  const { data: branding } = await admin
    .from("programs")
    .select("team_name, logo_url")
    .eq("tenant_id", invitation.tenant_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ team_name: string | null; logo_url: string | null }>();

  return {
    id: invitation.id,
    tenantId: invitation.tenant_id,
    tenantSlug: invitation.tenants.slug,
    tenantName: invitation.tenants.name,
    role: invitation.role,
    programId: invitation.program_id,
    programTitle: invitation.program?.title?.trim() || null,
    maxUses: invitation.max_uses,
    usedCount: invitation.used_count,
    expiresAt: invitation.expires_at,
    isExpired: Date.parse(invitation.expires_at) <= Date.now(),
    isExhausted: invitation.used_count >= invitation.max_uses,
    teamName: branding?.team_name?.trim() || invitation.tenants.name,
    logoUrl: branding?.logo_url?.trim() || "/xon_logo.jpg",
  };
}
