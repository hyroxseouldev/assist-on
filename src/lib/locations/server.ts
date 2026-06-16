import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";
import {
  DEFAULT_LOCATION_AMENITY_ICON_KEY,
  isLocationAmenityIconKey,
  type LocationAmenity,
} from "@/lib/locations/icons";

export type PublicLocationSummary = {
  id: string;
  name: string;
  address: string;
  description: string;
  thumbnailUrl: string;
  imageUrls: string[];
  mapImageUrl: string;
  amenities: LocationAmenity[];
  sortOrder: number;
  isNew: boolean;
};

export type PublicLocationsPageData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  locations: PublicLocationSummary[];
};

export type PublicLocationDetailData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  location: PublicLocationSummary;
};

type LocationRow = {
  id: string;
  name: string;
  address: string;
  description: string | null;
  thumbnail_url: string | null;
  image_urls: unknown;
  map_image_url: string | null;
  amenities: unknown;
  sort_order: number;
  is_new: boolean;
};

export function normalizeStringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return [...new Set(value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))].slice(0, maxItems);
}

export function normalizeLocationAmenities(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as LocationAmenity[];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const source = item as { label?: unknown; description?: unknown; iconKey?: unknown };
      const label = typeof source.label === "string" ? source.label.trim() : "";
      if (!label) {
        return null;
      }

      const rawIconKey = typeof source.iconKey === "string" ? source.iconKey.trim() : "";
      return {
        label,
        description: typeof source.description === "string" ? source.description.trim() : "",
        iconKey: isLocationAmenityIconKey(rawIconKey) ? rawIconKey : DEFAULT_LOCATION_AMENITY_ICON_KEY,
      } satisfies LocationAmenity;
    })
    .filter((item): item is LocationAmenity => item !== null)
    .slice(0, 30);
}

function mapLocationRow(row: LocationRow): PublicLocationSummary {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    description: row.description?.trim() ?? "",
    thumbnailUrl: row.thumbnail_url?.trim() ?? "",
    imageUrls: normalizeStringArray(row.image_urls, 5),
    mapImageUrl: row.map_image_url?.trim() ?? "",
    amenities: normalizeLocationAmenities(row.amenities),
    sortOrder: row.sort_order,
    isNew: row.is_new,
  };
}

export async function getPublicLocationsByTenantSlug(tenantSlug: string): Promise<PublicLocationsPageData | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("locations")
    .select("id, name, address, description, thumbnail_url, image_urls, map_image_url, amenities, sort_order, is_new")
    .eq("tenant_id", tenant.id)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .returns<LocationRow[]>();

  return {
    tenant,
    locations: (data ?? []).map(mapLocationRow),
  };
}

export async function getPublicLocationById(params: {
  tenantSlug: string;
  locationId: string;
}): Promise<PublicLocationDetailData | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);

  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("locations")
    .select("id, name, address, description, thumbnail_url, image_urls, map_image_url, amenities, sort_order, is_new")
    .eq("tenant_id", tenant.id)
    .eq("id", params.locationId)
    .eq("is_published", true)
    .maybeSingle<LocationRow>();

  if (!data) {
    return null;
  }

  return {
    tenant,
    location: mapLocationRow(data),
  };
}
