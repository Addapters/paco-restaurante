// Associa um cliente fiel a uma mesa ("mesa apadrinhada") e define-a
// como mesa habitual do cliente. Interface de gestão chega no módulo 9;
// até lá esta é a via administrativa.
// Uso: node scripts/set-mesa-apadrinhada.mjs <email-do-cliente> <numero-da-mesa>
//      node scripts/set-mesa-apadrinhada.mjs <email-do-cliente> --remover
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnvLocal();

const [email, mesaArg] = process.argv.slice(2);
if (!email || !mesaArg) {
  console.error(
    "Uso: node scripts/set-mesa-apadrinhada.mjs <email-do-cliente> <numero-da-mesa | --remover>"
  );
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: perfil, error: perfilErr } = await admin
  .from("profiles")
  .select("id, nome, is_loyal")
  .eq("email", email)
  .maybeSingle();
if (perfilErr || !perfil) {
  console.error(`Cliente não encontrado: ${email}`);
  process.exit(1);
}

if (mesaArg === "--remover") {
  await admin
    .from("restaurant_tables")
    .update({ mesa_apadrinhada_cliente_id: null })
    .eq("mesa_apadrinhada_cliente_id", perfil.id);
  await admin
    .from("profiles")
    .update({ mesa_habitual_id: null })
    .eq("id", perfil.id);
  console.log(`Apadrinhamento removido para ${email}`);
  process.exit(0);
}

const numero = Number(mesaArg);
const { data: mesa, error: mesaErr } = await admin
  .from("restaurant_tables")
  .select("id, numero")
  .eq("numero", numero)
  .maybeSingle();
if (mesaErr || !mesa) {
  console.error(`Mesa não encontrada: ${mesaArg}`);
  process.exit(1);
}

// Uma mesa tem no máximo um padrinho; o cliente fica com ela como habitual
// e é marcado como fiel.
const { error: e1 } = await admin
  .from("restaurant_tables")
  .update({ mesa_apadrinhada_cliente_id: perfil.id })
  .eq("id", mesa.id);
const { error: e2 } = await admin
  .from("profiles")
  .update({ mesa_habitual_id: mesa.id, is_loyal: true })
  .eq("id", perfil.id);

if (e1 || e2) {
  console.error("Erro:", (e1 ?? e2).message);
  process.exit(1);
}
console.log(
  `Mesa ${mesa.numero} apadrinhada por ${perfil.nome || email} (mesa habitual + cliente fiel)`
);
