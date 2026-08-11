import { AreaShell } from "@/components/AreaShell";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AreaShell titleKey="Staff" accentClassName="border-sage">
      {children}
    </AreaShell>
  );
}
