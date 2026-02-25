import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-9 w-28" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
