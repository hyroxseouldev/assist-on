import { CardContent, CardDescription, CardHeader, CardTitle, NonBorderCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  titleSize?: "default" | "large";
};

export function AdminPageShell({
  title,
  description,
  children,
  className,
  titleSize = "default",
}: AdminPageShellProps) {
  return (
    <NonBorderCard className={cn("gap-4 pb-2 pt-1 sm:pb-3 sm:pt-2", className)}>
      <CardHeader className="px-2">
        <CardTitle className={titleSize === "large" ? "text-2xl" : undefined}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-0">{children}</CardContent>
    </NonBorderCard>
  );
}
