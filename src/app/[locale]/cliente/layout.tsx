import { AreaShell } from "@/components/AreaShell";

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AreaShell titleKey="Cliente" accentClassName="border-terracotta">
      {children}
    </AreaShell>
  );
}
