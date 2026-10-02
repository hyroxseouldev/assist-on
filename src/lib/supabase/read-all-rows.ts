import { throwQueryError } from "@/lib/supabase/query-error";

/** For bounded analytics ranges. List screens must paginate in the database instead. */
export async function readAllRows<T>(
  query: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }> },
  context: string
): Promise<T[]> {
  const rows: T[] = [];
  const size = 200;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await query.range(offset, offset + size - 1);
    throwQueryError(context, error);
    if (!data) throw new Error("정보를 불러오지 못했습니다. 다시 시도해 주세요.");
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
