import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AdminPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AdminPageShell({ title, description, children }: AdminPageShellProps) {
  return (
    <Card className="border-zinc-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
