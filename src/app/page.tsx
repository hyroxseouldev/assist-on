import { DateSessionNavigator } from "@/components/home/date-session-navigator";
import { ProgramHeader } from "@/components/home/program-header";
import { ProgramSummary } from "@/components/home/program-summary";
import { LocalTrainingRepository } from "@/lib/training/local-repository";

export default async function Home() {
  const repository = new LocalTrainingRepository();
  const appData = await repository.getTrainingAppData();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9fbe6_0%,#f7faf8_45%,#ffffff_100%)]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ProgramHeader teamInfo={appData.teamInfo} coach={appData.coach} period={appData.period} />

        <DateSessionNavigator sessions={appData.sessions} period={appData.period} />

        <ProgramSummary
          teamInfo={appData.teamInfo}
          coach={appData.coach}
          philosophy={appData.philosophy}
          mindset={appData.mindset}
          benefits={appData.benefits}
          trainingProgram={appData.trainingProgram}
        />
      </main>
    </div>
  );
}
