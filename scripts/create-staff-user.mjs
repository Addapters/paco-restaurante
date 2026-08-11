// Cria contas de staff/admin (não auto-registáveis) usando a service role.
// Uso: SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-staff-user.mjs <email> <password> <staff|admin> [nome]
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

const [email, password, role, nome = ""] = process.argv.slice(2);
if (!email || !password || !["staff", "admin"].includes(role)) {
  console.error(
    "Uso: node scripts/create-staff-user.mjs <email> <password> <staff|admin> [nome]"
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Define NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (env ou .env.local)"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role },
  user_metadata: { nome },
});

if (error) {
  console.error("Erro:", error.message);
  process.exit(1);
}

// O trigger handle_new_user corre antes de o GoTrue fundir o app_metadata,
// pelo que o perfil nasce como 'cliente' — promover explicitamente aqui.
const { error: roleError } = await admin
  .from("profiles")
  .update({ role })
  .eq("id", data.user.id);

if (roleError) {
  console.error("Utilizador criado mas falhou a atribuição do role:", roleError.message);
  process.exit(1);
}
console.log(`Utilizador ${role} criado: ${data.user.email} (${data.user.id})`);
