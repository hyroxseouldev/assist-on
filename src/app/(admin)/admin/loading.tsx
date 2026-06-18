import { CardContent, CardDescription, CardHeader, CardTitle, NonBorderCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TenantAdminLoading() {
  return (
    <NonBorderCard>
      <CardHeader className="space-y-3">
        <CardTitle>
          <Skeleton className="h-7 w-32" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-72" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </CardContent>
    </NonBorderCard>
  );
}
