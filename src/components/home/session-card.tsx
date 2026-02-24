import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Session } from "@/types/training";

type SessionCardProps = {
  session: Session | null;
  isToday: boolean;
};

export function SessionCard({ session, isToday }: SessionCardProps) {
  if (!session) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>해당 날짜 세션 없음</CardTitle>
          <CardDescription>휴식일입니다. 회복과 컨디션 점검에 집중하세요.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{session.week}주차</Badge>
          <Badge variant="outline">{session.day}</Badge>
          <Badge variant="secondary">{isToday ? "오늘의 세션" : "선택한 날짜 세션"}</Badge>
        </div>
        <CardTitle className="text-xl">{session.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Warmup</h3>
          <p className="text-sm text-zinc-700">러닝 페이스 빌드업</p>
          <div className="flex flex-wrap gap-2">
            {session.workout.warmup.paces.map((pace) => (
              <Badge key={pace} variant="outline">
                {pace} /km
              </Badge>
            ))}
          </div>
        </section>
        <Separator />
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Main Set</h3>
          <p className="text-sm text-zinc-800">
            {session.workout.mainSet.distance} x {session.workout.mainSet.repetitions}회
          </p>
          <p className="text-sm text-zinc-700">목표 페이스: {session.workout.mainSet.pace} /km</p>
        </section>
      </CardContent>
    </Card>
  );
}
