import { AreaShell } from "@/components/AreaShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AreaShell titleKey="Admin" accentClassName="border-ink">
      {children}
    </AreaShell>
  );
}
