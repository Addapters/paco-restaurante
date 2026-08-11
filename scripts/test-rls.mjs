// Testa as políticas de RLS com um utilizador de exemplo por role.
// Requer o schema aplicado e SUPABASE_SERVICE_ROLE_KEY disponível.
// Uso: node scripts/test-rls.mjs
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("Faltam variáveis de ambiente (URL, ANON_KEY, SERVICE_ROLE_KEY)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Paco-teste-2026!";
const USERS = [
  { email: "cliente.teste@paco.dev", role: "cliente", nome: "Cliente Teste" },
  { email: "staff.teste@paco.dev", role: "staff", nome: "Staff Teste" },
  { email: "admin.teste@paco.dev", role: "admin", nome: "Admin Teste" },
];

let passed = 0;
let failed = 0;
function check(label, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------- setup: utilizadores e dados de exemplo ----------
console.log("Setup: utilizadores e dados de exemplo…");
const ids = {};
for (const u of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: u.role === "cliente" ? {} : { role: u.role },
    user_metadata: { nome: u.nome },
  });
  if (error && !error.message.includes("already been registered")) {
    console.error(`Erro a criar ${u.email}:`, error.message);
    process.exit(1);
  }
  if (data?.user) {
    ids[u.role] = data.user.id;
  } else {
    const { data: list } = await admin.auth.admin.listUsers();
    ids[u.role] = list.users.find((x) => x.email === u.email)?.id;
  }
  // O trigger cria o perfil sempre como 'cliente' (o app_metadata ainda não
  // está fundido no momento do insert) — atribuir o role real via service role.
  if (u.role !== "cliente") {
    const { error: roleErr } = await admin
      .from("profiles")
      .update({ role: u.role })
      .eq("id", ids[u.role]);
    if (roleErr) {
      console.error(`Erro a atribuir role ${u.role}:`, roleErr.message);
      process.exit(1);
    }
  }
}

// Mesa, categoria e item de menu (via service role, ignora RLS)
const { data: mesa } = await admin
  .from("restaurant_tables")
  .upsert({ numero: 999 }, { onConflict: "numero" })
  .select()
  .single();
const { data: cat } = await admin
  .from("menu_categories")
  .insert({ nome_pt: "Testes", nome_en: "Tests", ordem: 99 })
  .select()
  .single();
const { data: item } = await admin
  .from("menu_items")
  .insert({
    categoria_id: cat.id,
    nome_pt: "Prato de teste",
    nome_en: "Test dish",
    preco: 9.5,
  })
  .select()
  .single();

// Sessões autenticadas por role
async function login(email) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) {
    console.error(`Login falhou para ${email}:`, error.message);
    process.exit(1);
  }
  return c;
}
const cliente = await login("cliente.teste@paco.dev");
const staff = await login("staff.teste@paco.dev");
const adminUser = await login("admin.teste@paco.dev");

// ---------- CLIENTE ----------
console.log("\nCLIENTE:");
{
  const { data } = await cliente.from("profiles").select("id, role");
  check(
    "vê apenas o próprio perfil",
    data?.length === 1 && data[0].id === ids.cliente
  );

  const { error: roleErr } = await cliente
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", ids.cliente);
  check("não consegue promover-se a admin", !!roleErr, roleErr?.message);

  const { data: menu } = await cliente.from("menu_items").select("id");
  check("lê o menu", (menu?.length ?? 0) >= 1);

  const { error: menuErr, data: menuWrite } = await cliente
    .from("menu_items")
    .update({ preco: 0.01 })
    .eq("id", item.id)
    .select();
  check("não edita o menu", !!menuErr || menuWrite?.length === 0);

  const { data: own, error: ownErr } = await cliente
    .from("orders")
    .insert({ mesa_id: mesa.id, cliente_id: ids.cliente })
    .select()
    .single();
  check("cria pedido próprio", !ownErr, ownErr?.message);

  const { error: otherErr } = await cliente
    .from("orders")
    .insert({ mesa_id: mesa.id, cliente_id: ids.staff });
  check("não cria pedido em nome de outro", !!otherErr);

  if (own) {
    const { error: itemErr } = await cliente.from("order_items").insert({
      order_id: own.id,
      menu_item_id: item.id,
      quantidade: 2,
      preco_unitario: 9.5,
    });
    check("adiciona itens ao próprio pedido", !itemErr, itemErr?.message);

    const { error: ofertaErr } = await cliente.from("order_items").insert({
      order_id: own.id,
      menu_item_id: item.id,
      quantidade: 1,
      preco_unitario: 0,
      e_oferta: true,
    });
    check("não regista ofertas", !!ofertaErr);
  }

  const { error: alertErr } = await cliente
    .from("table_alerts")
    .insert({ mesa_id: mesa.id, tipo: "chamar_staff" });
  check("cria alerta de mesa", !alertErr, alertErr?.message);

  const { data: pay } = await cliente.from("payments").select("id");
  check("não vê pagamentos", (pay?.length ?? 0) === 0);

  const { data: closures } = await cliente.from("cash_closures").select("id");
  check("não vê fechos de caixa", (closures?.length ?? 0) === 0);

  const { error: resErr } = await cliente.from("reservations").insert({
    cliente_id: ids.cliente,
    data_hora: new Date(Date.now() + 86400000).toISOString(),
    numero_pessoas: 2,
  });
  check("cria reserva própria", !resErr, resErr?.message);

  const { error: survErr } = await cliente.from("satisfaction_surveys").insert({
    cliente_id: ids.cliente,
    pontuacao: 5,
    encaminhado_para: "google_reviews",
  });
  check("responde a inquérito", !survErr, survErr?.message);
}

// ---------- STAFF ----------
console.log("\nSTAFF:");
{
  const { data: orders } = await staff.from("orders").select("id, estado");
  check("vê todos os pedidos", (orders?.length ?? 0) >= 1);

  const orderId = orders?.[0]?.id;
  const { error: updErr } = await staff
    .from("orders")
    .update({ estado: "em_preparacao", staff_id: ids.staff })
    .eq("id", orderId);
  check("atualiza estado de pedidos", !updErr, updErr?.message);

  const { data: alerts, error: alertsErr } = await staff
    .from("table_alerts")
    .select("id, estado");
  check("vê alertas", !alertsErr && (alerts?.length ?? 0) >= 1);

  const { error: payErr } = await staff.from("payments").insert({
    order_id: orderId,
    metodo: "dinheiro",
    valor: 19.0,
    registado_por: ids.staff,
  });
  check("regista pagamentos", !payErr, payErr?.message);

  const { error: invErr } = await staff.from("invoices").insert({
    order_id: orderId,
    numero_fatura: "FT-TESTE-1",
    total: 19.0,
  });
  check("regista faturas", !invErr, invErr?.message);

  const { error: closeErr } = await staff.from("cash_closures").insert({
    data: "2099-12-31",
    valor_caixa: 100,
    valor_cofre: 50,
    diferencas: 0,
    registado_por: ids.staff,
  });
  check("regista fecho de caixa", !closeErr, closeErr?.message);

  const { error: menuErr, data: menuWrite } = await staff
    .from("menu_items")
    .update({ preco: 1 })
    .eq("id", item.id)
    .select();
  check("não edita o menu (gestão admin)", !!menuErr || menuWrite?.length === 0);

  const { error: tableErr, data: tableWrite } = await staff
    .from("restaurant_tables")
    .update({ numero: 998 })
    .eq("id", mesa.id)
    .select();
  check(
    "não edita mesas (gestão admin)",
    !!tableErr || tableWrite?.length === 0
  );

  const { error: roleErr } = await staff
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", ids.staff);
  check("não consegue promover-se a admin", !!roleErr, roleErr?.message);
}

// ---------- ADMIN ----------
console.log("\nADMIN:");
{
  const { data: profs } = await adminUser.from("profiles").select("id");
  check("vê todos os perfis", (profs?.length ?? 0) >= 3);

  const { error: menuErr, data: menuRows } = await adminUser
    .from("menu_items")
    .update({ destaque: true })
    .eq("id", item.id)
    .select();
  check("edita o menu", !menuErr && menuRows?.length === 1, menuErr?.message);

  const { error: tableErr, data: tableRows } = await adminUser
    .from("restaurant_tables")
    .update({ mesa_apadrinhada_cliente_id: ids.cliente })
    .eq("id", mesa.id)
    .select();
  check("edita mesas", !tableErr && tableRows?.length === 1, tableErr?.message);

  const { error: roleErr, data: profRows } = await adminUser
    .from("profiles")
    .update({ is_loyal: true })
    .eq("id", ids.cliente)
    .select();
  check(
    "edita perfis de clientes",
    !roleErr && profRows?.length === 1,
    roleErr?.message
  );

  const { data: pay } = await adminUser.from("payments").select("id");
  check("vê pagamentos", (pay?.length ?? 0) >= 1);

  const { error: delErr } = await adminUser
    .from("table_alerts")
    .delete()
    .eq("mesa_id", mesa.id);
  check("apaga alertas", !delErr, delErr?.message);
}

// ---------- limpeza ----------
console.log("\nLimpeza dos dados de teste…");
await admin.from("cash_closures").delete().eq("data", "2099-12-31");
await admin.from("invoices").delete().eq("numero_fatura", "FT-TESTE-1");
for (const t of ["payments", "order_items", "table_alerts"]) {
  await admin.from(t).delete().gte("criado_em", "1970-01-01");
}
await admin.from("orders").delete().eq("mesa_id", mesa.id);
await admin.from("reservations").delete().eq("cliente_id", ids.cliente);
await admin.from("satisfaction_surveys").delete().eq("cliente_id", ids.cliente);
await admin.from("menu_items").delete().eq("id", item.id);
await admin.from("menu_categories").delete().eq("id", cat.id);
await admin.from("restaurant_tables").delete().eq("id", mesa.id);
for (const role of Object.keys(ids)) {
  await admin.auth.admin.deleteUser(ids[role]);
}

console.log(`\nResultado: ${passed} passaram, ${failed} falharam`);
process.exit(failed === 0 ? 0 : 1);
