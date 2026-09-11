export type PreregistrationRow = {
  id: string;
  full_name: string;
  phone_number: string;
  starts_at: string;
  ends_at: string;
  expires_at: string | null;
  is_active: boolean;
  matched_at: string | null;
};

export function parsePreregistrationRoster(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 200) throw new Error("명단은 1~200명까지 입력해 주세요.");
  const seen = new Set<string>();
  return lines.map((line, index) => {
    const match = line.match(/^(.+?)\s+(01[016789][\d\s-]+)$/);
    const fullName = match?.[1].trim() ?? "";
    const phone = match?.[2].replace(/\D/g, "") ?? "";
    if (!fullName || fullName.length > 100 || !/^01[016789]\d{7,8}$/.test(phone)) {
      throw new Error(`${index + 1}번째 줄을 '이름 01012345678' 형식으로 입력해 주세요.`);
    }
    if (seen.has(phone)) throw new Error(`${index + 1}번째 줄의 전화번호가 중복되었습니다.`);
    seen.add(phone);
    return { full_name: fullName, phone_number: phone, phone_number_digits: phone };
  });
}
