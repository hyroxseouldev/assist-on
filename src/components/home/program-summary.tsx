import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CoachInfo, Mindset, Philosophy, TeamInfo, TrainingProgramItem } from "@/types/training";

type ProgramSummaryProps = {
  teamInfo: TeamInfo;
  coach: CoachInfo;
  philosophy: Philosophy;
  mindset: Mindset;
  benefits: string[];
  trainingProgram: TrainingProgramItem[];
};

export function ProgramSummary({
  teamInfo,
  coach,
  philosophy,
  mindset,
  benefits,
  trainingProgram,
}: ProgramSummaryProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>팀 기준</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-700">
          <p>{philosophy.goal}</p>
          <Separator />
          <div className="space-y-2">
            {teamInfo.coreMessage.map((message) => (
              <p key={message}>- {message}</p>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {philosophy.values.map((value) => (
              <Badge key={value} variant="outline">
                {value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{mindset.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-700">
          <p>{mindset.statement}</p>
          <p>{philosophy.identity}</p>
          <p className="font-medium text-zinc-900">{philosophy.assistMeaning}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>코치 경력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">{coach.name}</p>
          {coach.career.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>프로그램 구성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-700">
          {trainingProgram.map((item) => (
            <div key={item.title} className="space-y-2">
              <p className="font-medium text-zinc-900">{item.title}</p>
              {item.details.map((detail) => (
                <p key={detail}>- {detail}</p>
              ))}
            </div>
          ))}
          <Separator />
          <div className="flex flex-wrap gap-2">
            {benefits.map((benefit) => (
              <Badge key={benefit} variant="secondary">
                {benefit}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
