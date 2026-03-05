"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { AdminProgramListRow } from "@/lib/admin/types";

type ProgramsListProps = {
  programs: AdminProgramListRow[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDifficulty(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "초급";
  if (value === "advanced") return "고급";
  return "중급";
}

export function ProgramsList({ programs }: ProgramsListProps) {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const programsPath = `${tenantBasePath}/admin/program`;

  if (programs.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={() => router.push(`${programsPath}/new`)}>새 프로그램 등록</Button>
        </div>
        <p className="text-sm text-zinc-500">등록된 프로그램이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => router.push(`${programsPath}/new`)}>새 프로그램 등록</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">썸네일</th>
              <th className="px-3 py-2 text-left font-medium">프로그램명</th>
              <th className="px-3 py-2 text-left font-medium">난이도</th>
              <th className="px-3 py-2 text-left font-medium">하루 운동</th>
              <th className="px-3 py-2 text-left font-medium">주당 운동</th>
              <th className="px-3 py-2 text-left font-medium">기간</th>
              <th className="px-3 py-2 text-left font-medium">설명</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr
                key={program.id}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                onClick={() => router.push(`${programsPath}/${program.id}`)}
              >
                <td className="px-3 py-2">
                  <div className="relative size-12 overflow-hidden rounded-md border border-zinc-200 bg-white">
                    <Image
                      src={program.thumbnail_url || program.logo_url || "/xon_logo.jpg"}
                      alt={`${program.title} 썸네일`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900">{program.title}</td>
                <td className="px-3 py-2 text-zinc-700">{formatDifficulty(program.difficulty)}</td>
                <td className="px-3 py-2 text-zinc-700">{program.daily_workout_minutes}분</td>
                <td className="px-3 py-2 text-zinc-700">주 {program.days_per_week}일</td>
                <td className="px-3 py-2 text-zinc-700">
                  {formatDate(program.start_date)} - {formatDate(program.end_date)}
                </td>
                <td className="px-3 py-2 text-zinc-700">{program.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
