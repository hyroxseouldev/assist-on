import { CardContent, CardDescription, CardHeader, CardTitle, NonBorderCard } from "@/components/ui/card";

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
    <NonBorderCard className={className}>
      <CardHeader className={headerClassName}>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </NonBorderCard>
  );
}
