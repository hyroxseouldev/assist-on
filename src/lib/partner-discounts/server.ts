import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type VisiblePartnerDiscountCode = {
  id: string;
  brand_name: string;
  brand_logo_url: string;
  title: string;
  description: string;
  terms_text: string;
  use_url: string;
  code_text: string;
  visibility_scope: "all_members" | "program_members";
  program_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

function isVisiblePartnerDiscountScope(value: string): value is VisiblePartnerDiscountCode["visibility_scope"] {
  return value === "all_members" || value === "program_members";
}

export async function getVisiblePartnerDiscountCodes(tenantSlug: string): Promise<VisiblePartnerDiscountCode[]> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return [];
  }

  const { data, error } = await supabase
    .from("partner_discount_codes")
    .select(
      "id, brand_name, brand_logo_url, title, description, terms_text, use_url, code_text, visibility_scope, program_id, starts_at, ends_at"
    )
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .eq("mobile_visibility", "public")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        brand_name: string;
        brand_logo_url: string;
        title: string;
        description: string;
        terms_text: string;
        use_url: string;
        code_text: string;
        visibility_scope: string;
        program_id: string | null;
        starts_at: string | null;
        ends_at: string | null;
      }>
    >();

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    brand_name: row.brand_name,
    brand_logo_url: row.brand_logo_url,
    title: row.title,
    description: row.description,
    terms_text: row.terms_text,
    use_url: row.use_url,
    code_text: row.code_text,
    visibility_scope: isVisiblePartnerDiscountScope(row.visibility_scope) ? row.visibility_scope : "all_members",
    program_id: row.program_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  }));
}
