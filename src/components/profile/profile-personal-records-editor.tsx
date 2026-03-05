"use client";

import { Loader2, Pencil, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createMyPersonalRecordAction,
  deleteMyPersonalRecordAction,
  updateMyPersonalRecordAction,
} from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MetricType = "weight" | "reps" | "distance" | "duration";

type PersonalRecord = {
  id: string;
  exercise_name: string;
  metric_type: MetricType;
  value_numeric: number | string | null;
  value_seconds: number | null;
  unit: string;
  recorded_at: string;
  memo: string;
  created_at: string;
};

type DraftRecord = {
  exerciseName: string;
  metricType: MetricType;
  value: string;
  recordedAt: string;
  memo: string;
};

function formatSecondsToMmSs(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function displayRecordValue(record: PersonalRecord) {
  if (record.metric_type === "duration") {
    return record.value_seconds ? formatSecondsToMmSs(record.value_seconds) : "-";
  }

  if (record.value_numeric == null) {
    return "-";
  }

  const value = typeof record.value_numeric === "number" ? record.value_numeric : Number(record.value_numeric);
  if (!Number.isFinite(value)) {
    return "-";
  }

  if (record.metric_type === "reps") {
    return String(Math.round(value));
  }

  return String(value);
}

function getMetricPlaceholder(metricType: MetricType) {
  if (metricType === "weight") return "예: 120";
  if (metricType === "reps") return "예: 20";
  if (metricType === "distance") return "예: 5";
  return "예: 04:35";
}

function getTodayDateKey() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function recordToDraft(record: PersonalRecord): DraftRecord {
  const value = record.metric_type === "duration" ? (record.value_seconds ? formatSecondsToMmSs(record.value_seconds) : "") : displayRecordValue(record);

  return {
    exerciseName: record.exercise_name,
    metricType: record.metric_type,
    value,
    recordedAt: record.recorded_at,
    memo: record.memo,
  };
}

const EMPTY_DRAFT: DraftRecord = {
  exerciseName: "",
  metricType: "weight",
  value: "",
  recordedAt: getTodayDateKey(),
  memo: "",
};

type ProfilePersonalRecordsEditorProps = {
  records: PersonalRecord[];
};

export function ProfilePersonalRecordsEditor({ records }: ProfilePersonalRecordsEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftRecord>(EMPTY_DRAFT);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        if (a.recorded_at === b.recorded_at) {
          return b.created_at.localeCompare(a.created_at);
        }
        return b.recorded_at.localeCompare(a.recorded_at);
      }),
    [records]
  );

  const submitRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData();
    formData.set("exerciseName", draft.exerciseName);
    formData.set("metricType", draft.metricType);
    formData.set("value", draft.value);
    formData.set("recordedAt", draft.recordedAt);
    formData.set("memo", draft.memo);
    if (editingRecordId) {
      formData.set("recordId", editingRecordId);
    }

    startTransition(async () => {
      const result = editingRecordId
        ? await updateMyPersonalRecordAction(formData)
        : await createMyPersonalRecordAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setDraft(EMPTY_DRAFT);
      setEditingRecordId(null);
      router.refresh();
    });
  };

  const handleDeleteRecord = (recordId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("recordId", recordId);
      const result = await deleteMyPersonalRecordAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      if (editingRecordId === recordId) {
        setEditingRecordId(null);
        setDraft(EMPTY_DRAFT);
      }
      router.refresh();
    });
  };

  const startEdit = (record: PersonalRecord) => {
    setEditingRecordId(record.id);
    setDraft(recordToDraft(record));
  };

  const cancelEdit = () => {
    setEditingRecordId(null);
    setDraft(EMPTY_DRAFT);
  };

  return (
    <div className="space-y-4">
      <form className="space-y-3 rounded-md border bg-zinc-50 p-3" onSubmit={submitRecord}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exerciseName">운동 이름</Label>
            <Input
              id="exerciseName"
              value={draft.exerciseName}
              onChange={(event) => setDraft((prev) => ({ ...prev, exerciseName: event.target.value }))}
              placeholder="예: Back Squat"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metricType">기록 타입</Label>
            <select
              id="metricType"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              value={draft.metricType}
              onChange={(event) => setDraft((prev) => ({ ...prev, metricType: event.target.value as MetricType, value: "" }))}
            >
              <option value="weight">중량 (kg)</option>
              <option value="reps">반복 횟수 (reps)</option>
              <option value="distance">거리 (km)</option>
              <option value="duration">시간 (mm:ss)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">기록 값</Label>
            <Input
              id="value"
              value={draft.value}
              onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))}
              placeholder={getMetricPlaceholder(draft.metricType)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recordedAt">기록 날짜</Label>
            <Input
              id="recordedAt"
              type="date"
              value={draft.recordedAt}
              onChange={(event) => setDraft((prev) => ({ ...prev, recordedAt: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="memo">메모</Label>
            <Input
              id="memo"
              value={draft.memo}
              onChange={(event) => setDraft((prev) => ({ ...prev, memo: event.target.value }))}
              placeholder="예: 첫 100kg 성공"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? (editingRecordId ? "수정 중..." : "저장 중...") : editingRecordId ? "기록 수정" : "기록 저장"}
          </Button>
          {editingRecordId ? (
            <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={isPending}>
              <X className="size-4" />
              수정 취소
            </Button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">운동</th>
              <th className="px-3 py-2 text-left font-medium">기록</th>
              <th className="px-3 py-2 text-left font-medium">날짜</th>
              <th className="px-3 py-2 text-left font-medium">메모</th>
              <th className="px-3 py-2 text-left font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                  아직 저장된 최고 기록이 없습니다.
                </td>
              </tr>
            ) : (
              sortedRecords.map((record) => (
                <tr key={record.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 text-zinc-900">{record.exercise_name}</td>
                  <td className="px-3 py-2 text-zinc-700">
                    {displayRecordValue(record)} {record.unit}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{record.recorded_at}</td>
                  <td className="px-3 py-2 text-zinc-700">{record.memo || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => startEdit(record)}>
                        <Pencil className="size-4" />
                        수정
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleDeleteRecord(record.id)}
                      >
                        <Trash2 className="size-4" />
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
