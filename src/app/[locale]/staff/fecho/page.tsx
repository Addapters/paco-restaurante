import { createClient } from "@/lib/supabase/server";
import { CashClosure } from "@/components/staff/CashClosure";

// O acesso é garantido pelo guard no layout de /staff.
export default async function FechoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  return <CashClosure isAdmin={profile?.role === "admin"} />;
}
