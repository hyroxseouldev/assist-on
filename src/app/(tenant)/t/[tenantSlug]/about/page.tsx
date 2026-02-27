import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getTrainingAppDataFromSupabase } from "@/lib/training/supabase-repository";

export default async function TenantAboutPage() {
  const appData = await getTrainingAppDataFromSupabase();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">About Assist On</h1>
        <p className="mt-1 text-sm text-zinc-600">팀의 기준과 훈련 구성, 그리고 함께 만드는 성장 방향</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>팀 기준</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-700">
            <p>{appData.philosophy.goal}</p>
            <Separator />
            <div className="space-y-2">
              {appData.teamInfo.coreMessage.map((message) => (
                <p key={message}>- {message}</p>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {appData.philosophy.values.map((value) => (
                <Badge key={value} variant="outline">
                  {value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{appData.mindset.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-700">
            <p>{appData.mindset.statement}</p>
            <p>{appData.philosophy.identity}</p>
            <p className="font-medium text-zinc-900">{appData.philosophy.assistMeaning}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>프로그램 구성</CardTitle>
            <CardDescription>{appData.teamInfo.name} 기준으로 설계된 시즌 트레이닝 구조</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            {appData.trainingProgram.map((item) => (
              <div key={item.title} className="space-y-2">
                <p className="font-medium text-zinc-900">{item.title}</p>
                {item.details.map((detail) => (
                  <p key={detail} className="text-sm text-zinc-700">
                    - {detail}
                  </p>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>지원 항목</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {appData.benefits.map((benefit) => (
                <Badge key={benefit} variant="secondary">
                  {benefit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
