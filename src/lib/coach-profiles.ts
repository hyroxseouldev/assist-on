import { parseStringArray } from "@/lib/about/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ResolvedCoachProfile = {
  id: string;
  user_id: string;
  display_name: string;
  instagram: string;
  introduction: string;
  career: string[];
  image_url: string;
  additional_image_urls: string[];
  is_primary: boolean;
  sort_order: number;
};

type ProgramCoachAssignmentRow = {
  is_primary: boolean;
  sort_order: number;
  coach_profile: {
    id: string;
    user_id: string;
    display_name: string;
    instagram: string;
    introduction: string;
    career: unknown;
    image_url: string;
    additional_image_urls: unknown;
    is_active: boolean;
  } | null;
};

export async function getProgramCoachProfiles(
  supabase: SupabaseServerClient,
  programId: string
): Promise<ResolvedCoachProfile[]> {
  const { data, error } = await supabase
    .from("program_coaches")
    .select(
      "is_primary, sort_order, coach_profile:coach_profile_id(id, user_id, display_name, instagram, introduction, career, image_url, additional_image_urls, is_active)"
    )
    .eq("program_id", programId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .returns<ProgramCoachAssignmentRow[]>();

  if (error || !data) {
    return [];
  }

  return data
    .map((item) => {
      if (!item.coach_profile || !item.coach_profile.is_active) {
        return null;
      }

      return {
        id: item.coach_profile.id,
        user_id: item.coach_profile.user_id,
        display_name: item.coach_profile.display_name?.trim() || "코치",
        instagram: item.coach_profile.instagram?.trim() || "",
        introduction: item.coach_profile.introduction?.trim() || "",
        career: parseStringArray(item.coach_profile.career),
        image_url: item.coach_profile.image_url?.trim() || "",
        additional_image_urls: parseStringArray(item.coach_profile.additional_image_urls),
        is_primary: item.is_primary,
        sort_order: item.sort_order,
      } satisfies ResolvedCoachProfile;
    })
    .filter((item): item is ResolvedCoachProfile => Boolean(item));
}

export async function getPrimaryProgramCoach(
  supabase: SupabaseServerClient,
  programId: string
): Promise<ResolvedCoachProfile | null> {
  const coaches = await getProgramCoachProfiles(supabase, programId);
  return coaches.find((coach) => coach.is_primary) ?? coaches[0] ?? null;
}
