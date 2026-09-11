"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { registerProgramRosterAction, stopProgramPreregistrationAction } from "@/lib/admin/actions";
import { parsePreregistrationRoster, type PreregistrationRow } from "@/lib/admin/preregistration";
import { formatAdminDateTime } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Props = {
  programs: { id: string; title: string; delivery_mode: string }[];
  selectedProgramId: string;
  rows: PreregistrationRow[];
  now: number;
};

export function ProgramPreregistrationsManager({ programs, selectedProgramId, rows, now }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { push } = useAdminNavigation();
  const tenantSlug = useTenantSlug();
  const [pending, startTransition] = useTransition();
  const [roster, setRoster] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [stopId, setStopId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const program = programs.find((item) => item.id === selectedProgramId);
  let preview: ReturnType<typeof parsePreregistrationRoster> = [];
  let parseError = "";
  if (roster.trim()) {
    try { preview = parsePreregistrationRoster(roster); }
    catch (error) { parseError = error instanceof Error ? error.message : "명단을 확인해 주세요."; }
  }
  const status = (row: PreregistrationRow) => {
    if (!row.is_active) return "중지";
    if (row.matched_at) return "가입 연결 완료";
    if (Date.parse(row.expires_at ?? row.ends_at) < now) return "마감";
    return "가입 대기";
  };
  const save = () => {
    const data = new FormData();
    Object.entries({ tenantSlug: tenantSlug ?? "", programId: selectedProgramId, roster, startsOn, endsOn, expiresOn })
      .forEach(([key, value]) => data.set(key, value));
    startTransition(async () => {
      try {
        const result = await registerProgramRosterAction(data);
        if (!result.ok) { toast.error(result.message); return; }
        toast.success(result.message); setConfirm(false); setRoster(""); router.refresh();
      } catch { toast.error("등록 결과를 확인하지 못했습니다. 목록을 새로고침해 확인해 주세요."); }
    });
  };
  return (
    <div className="space-y-6">
      <div className="max-w-lg space-y-2">
        <Label htmlFor="prereg-program">프로그램</Label>
        <select id="prereg-program" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={selectedProgramId} onChange={(event) => {
          const next = new URLSearchParams(params.toString()); next.set("programId", event.target.value);
          push(`${pathname}?${next}`);
        }}>
          {!programs.length ? <option value="">프로그램 없음</option> : null}
          {programs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="min-w-0 space-y-4 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">참여자 명단 사전등록</h2>
          <p className="text-sm leading-6 text-zinc-500">같은 전화번호로 이 서비스에 가입하거나 프로필 전화번호를 저장하면 이용권이 자동 부여됩니다. 운동 이용은 지정한 시작일부터 가능합니다.</p>
          {program?.delivery_mode !== "fixed_date" ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">현재 사전등록은 날짜 고정형 프로그램만 지원합니다. 기수형 프로그램은 기수별 자동 부여 연결이 필요합니다.</p>
          ) : (
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setConfirm(true); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="pre-start">이용 시작일 (한국시간)</Label><Input id="pre-start" type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="pre-end">이용 종료일 (한국시간)</Label><Input id="pre-end" type="date" required min={startsOn} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="pre-expire">가입 마감일 (한국시간)</Label><Input id="pre-expire" type="date" required max={endsOn} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} /><p className="text-xs text-zinc-500">이 날짜 23:59:59까지 자동 부여합니다.</p></div>
              <div className="space-y-2"><Label htmlFor="pre-roster">이름 · 전화번호 명단</Label>
                <textarea id="pre-roster" className="min-h-48 w-full rounded-md border p-3 text-sm" placeholder={"홍길동 01012345678\n김회원 010-2345-6789"} required value={roster} onChange={(e) => setRoster(e.target.value)} />
                <p className="text-xs text-zinc-500">한 줄에 한 명씩, 최대 200명. 전화번호로 매칭하므로 정확히 입력해 주세요.</p>
              </div>
              {parseError ? <p role="alert" className="text-sm text-red-600">{parseError}</p> : <p className="text-sm text-zinc-600">{preview.length}명 확인됨</p>}
              <Button type="submit" disabled={pending || !preview.length || !!parseError}>명단 확인 후 등록</Button>
            </form>
          )}
        </section>
        <section className="min-w-0 space-y-4">
          <div><h2 className="font-semibold">사전등록 명단 · {rows.length}명</h2><p className="mt-1 text-sm text-zinc-500">가입 대기 {rows.filter((row) => status(row) === "가입 대기").length}명 · 가입 연결 {rows.filter((row) => !!row.matched_at).length}명</p></div>
          <Input aria-label="명단 검색" placeholder="이름 또는 전화번호 검색" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="max-h-[700px] space-y-2 overflow-y-auto">
            {rows.filter((row) => `${row.full_name} ${row.phone_number}`.includes(filter.trim())).map((row) => (
              <div key={row.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{row.full_name}</span><span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{status(row)}</span></div>
                <p className="mt-1 text-sm text-zinc-500">{row.phone_number}</p>
                <p className="mt-2 text-xs text-zinc-500">이용: {formatAdminDateTime(row.starts_at)} ~ {formatAdminDateTime(row.ends_at)}</p>
                <p className="mt-1 text-xs text-zinc-500">가입 마감: {row.expires_at ? formatAdminDateTime(row.expires_at) : "제한 없음"}</p>
                {row.matched_at ? <p className="mt-1 text-xs text-zinc-500">연결일: {formatAdminDateTime(row.matched_at)}</p> : null}
                {row.is_active ? <Button className="mt-3" size="sm" variant="outline" disabled={pending} onClick={() => setStopId(row.id)}>자동 부여 중지</Button> : null}
              </div>
            ))}
            {!rows.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500">등록된 명단이 없습니다.</p> : null}
          </div>
        </section>
      </div>
      <Dialog open={confirm} onOpenChange={(open) => { if (!pending) setConfirm(open); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{preview.length}명 사전등록</DialogTitle><DialogDescription>{program?.title}에 아래 명단을 등록합니다.</DialogDescription></DialogHeader>
          <p className="text-sm">이용 {startsOn} ~ {endsOn} · 가입 마감 {expiresOn}</p>
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md bg-zinc-50 p-3 text-sm">{preview.map((row) => <p key={row.phone_number}>{row.full_name} · {row.phone_number}</p>)}</div>
          <p className="text-xs text-zinc-500">이미 가입한 회원은 프로필 전화번호를 저장할 때 연결됩니다. 기존 사전등록과 중복된 번호가 있으면 이번 명단 전체를 저장하지 않습니다.</p>
          <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setConfirm(false)}>취소</Button><Button disabled={pending} onClick={save}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}등록 적용</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!stopId} onOpenChange={(open) => { if (!pending && !open) setStopId(null); }}>
        <DialogContent><DialogHeader><DialogTitle>자동 부여를 중지할까요?</DialogTitle><DialogDescription>이 명단으로 더 이상 자동 부여하지 않습니다. 이미 부여된 이용권은 유지됩니다.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setStopId(null)}>취소</Button><Button disabled={pending} onClick={() => {
            const data = new FormData(); data.set("tenantSlug", tenantSlug ?? ""); data.set("id", stopId ?? "");
            startTransition(async () => {
              try { const result = await stopProgramPreregistrationAction(data);
                if (!result.ok) { toast.error(result.message); return; }
                toast.success(result.message); setStopId(null); router.refresh();
              } catch { toast.error("중지 결과를 확인하지 못했습니다. 목록을 새로고침해 주세요."); }
            });
          }}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}자동 부여 중지</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
