import { isPersonalHyroxProgram } from "@/lib/billing/model";

const PERSONAL_PROGRAM_SUFFIX = "님 전용 하이록스 프로그램";
// Shared image verified against the existing XON personal programs.
const XON_PERSONAL_THUMBNAIL = "https://sburksnwmywzytpctjws.supabase.co/storage/v1/object/public/content-media/users/f149ed55-1cc6-464a-ae57-be6c876f5447/program-thumbnail/2026/05/1779327814164-4c0a4598-1419-432a-a14c-62395dc00ad0.webp";

export function personalCoachingThumbnail(tenantSlug: string) {
  return tenantSlug === "xon-training" ? XON_PERSONAL_THUMBNAIL : null;
}

export function personalCoachingName(title: string) {
  return isPersonalHyroxProgram(title) ? title.trim().replace(/님\s*전용\s+하이록스\s+프로그램$/u, "").trim() : "";
}

export function personalCoachingTitle(name: string) {
  return `${name.trim()}${PERSONAL_PROGRAM_SUFFIX}`;
}

export function applyPersonalCoachingDefaults(formData: FormData, tenantSlug: string, existingTitle?: string) {
  const requested = formData.get("personalCoaching") === "true";
  const existingPersonal = !!existingTitle && isPersonalHyroxProgram(existingTitle);
  const thumbnail = personalCoachingThumbnail(tenantSlug);
  if (!requested && !(thumbnail && (existingPersonal || isPersonalHyroxProgram(String(formData.get("title") ?? ""))))) return;
  if (!thumbnail) throw new Error("이 고객사의 개인 코칭 공통 이미지가 설정되지 않았습니다.");
  if (existingTitle && !existingPersonal) throw new Error("개인 코칭 프로그램만 전용 화면에서 수정할 수 있습니다.");
  const name = existingPersonal
    ? personalCoachingName(existingTitle!)
    : String(formData.get("personalMemberName") ?? personalCoachingName(String(formData.get("title") ?? ""))).trim();
  if (!name || name.length > 80 || /[\r\n]/u.test(name)) throw new Error("회원 이름을 1~80자로 입력해 주세요.");
  const start = String(formData.get("startDate") ?? "");
  const end = String(formData.get("endDate") ?? "");
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/u.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!validDate(start) || !validDate(end) || start > end) throw new Error("시작일과 종료일을 확인해 주세요. 종료일은 시작일 이후여야 합니다.");
  formData.set("title", personalCoachingTitle(name));
  formData.set("thumbnailUrl", thumbnail);
  formData.set("mobileVisibility", "members_only");
  formData.set("deliveryMode", "fixed_date");
  formData.delete("contentStartsOn");
  formData.delete("contentEndsOn");
}
