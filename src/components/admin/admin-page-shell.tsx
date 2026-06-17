import { CardContent, CardDescription, CardHeader, CardTitle, NonBorderCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function AdminPageShell({
  title,
  description,
  children,
  className,
  headerClassName,
  contentClassName,
}: AdminPageShellProps) {
  return (
    <NonBorderCard className={cn("gap-4 pb-2 pt-1 sm:pb-3 sm:pt-2", className)}>
      <CardHeader className={cn("px-2", headerClassName)}>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn("px-2 pt-0", contentClassName)}>{children}</CardContent>
    </NonBorderCard>
  );
}
