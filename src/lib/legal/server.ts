import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type LegalDocumentType = "terms_of_service" | "privacy_policy";
export type LegalDocumentLocale = "ko" | "en";

export type PublishedLegalDocument = {
  id: string;
  type: LegalDocumentType;
  locale: LegalDocumentLocale;
  title: string;
  content_html: string;
  version: string;
  published_at: string | null;
  updated_at: string;
};

const LEGAL_DOCUMENT_SELECT = "id, type, locale, title, content_html, version, published_at, updated_at";

function stripDocumentWrappers(html: string) {
  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<html[^>]*>|<\/html>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<body[^>]*>|<\/body>/gi, "")
    .trim();
}

export function normalizeLegalContentHtml(html: string) {
  return stripDocumentWrappers(html);
}

export async function getPublishedLegalDocumentsByTenantSlug(tenantSlug: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [] as PublishedLegalDocument[];
  }

  const { data } = await supabase
    .from("legal_documents")
    .select(LEGAL_DOCUMENT_SELECT)
    .eq("tenant_id", tenant.id)
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .returns<PublishedLegalDocument[]>();

  const rows = data ?? [];
  const latestByScope = new Map<string, PublishedLegalDocument>();

  for (const row of rows) {
    const key = `${row.type}:${row.locale}`;
    if (!latestByScope.has(key)) {
      latestByScope.set(key, row);
    }
  }

  return Array.from(latestByScope.values()).sort((a, b) => {
    if (a.type === b.type) {
      return a.locale.localeCompare(b.locale, "ko");
    }
    return a.type.localeCompare(b.type, "ko");
  });
}

export async function getPublishedLegalDocumentByType(
  tenantSlug: string,
  type: LegalDocumentType,
  preferredLocale: LegalDocumentLocale = "ko"
) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const pickLatest = async (locale?: LegalDocumentLocale) => {
    let query = supabase
      .from("legal_documents")
      .select(LEGAL_DOCUMENT_SELECT)
      .eq("tenant_id", tenant.id)
      .eq("type", type)
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1);

    if (locale) {
      query = query.eq("locale", locale);
    }

    const { data } = await query.maybeSingle<PublishedLegalDocument>();
    return data ?? null;
  };

  const localized = await pickLatest(preferredLocale);
  if (localized) {
    return localized;
  }

  return pickLatest();
}
