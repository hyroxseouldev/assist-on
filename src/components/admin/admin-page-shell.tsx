import { CardContent, CardDescription, CardHeader, CardTitle, NonBorderCard } from "@/components/ui/card";

type AdminPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AdminPageShell({ title, description, children }: AdminPageShellProps) {
  return (
    <NonBorderCard>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </NonBorderCard>
  );
}
