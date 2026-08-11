// Gera um QR code (PNG + SVG) por mesa, apontando para /mesa/[qr_token].
// Prontos para imprimir e colocar nas mesas.
// Uso: node scripts/generate-qr-codes.mjs [base_url]
//   ex.: node scripts/generate-qr-codes.mjs https://paco-restaurante.vercel.app
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnvLocal();

const baseUrl = (
  process.argv[2] ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: mesas, error } = await admin
  .from("restaurant_tables")
  .select("numero, qr_token")
  .order("numero");

if (error) {
  console.error("Erro a ler mesas:", error.message);
  process.exit(1);
}
if (!mesas?.length) {
  console.error("Não há mesas em restaurant_tables — corre primeiro o seed.");
  process.exit(1);
}

const outDir = "qr-codes";
mkdirSync(outDir, { recursive: true });

const opts = {
  errorCorrectionLevel: "H", // tolerante a desgaste/sujidade na impressão
  margin: 2,
  color: { dark: "#353d4d", light: "#efe8de" },
};

for (const mesa of mesas) {
  const url = `${baseUrl}/mesa/${mesa.qr_token}`;
  const nome = `mesa-${String(mesa.numero).padStart(2, "0")}`;
  await QRCode.toFile(`${outDir}/${nome}.png`, url, { ...opts, width: 1024 });
  writeFileSync(`${outDir}/${nome}.svg`, await QRCode.toString(url, { ...opts, type: "svg" }));
  console.log(`✓ ${nome} → ${url}`);
}
console.log(`\n${mesas.length} QR codes gerados em ${outDir}/ (PNG 1024px + SVG)`);
