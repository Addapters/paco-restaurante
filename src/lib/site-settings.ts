import { createClient } from "@/lib/supabase/server";

export interface SiteSettings {
  google_reviews_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  integracao_thefork_ativa: boolean;
  integracao_uber_ativa: boolean;
}

const DEFAULTS: SiteSettings = {
  google_reviews_url: null,
  instagram_url: null,
  facebook_url: null,
  integracao_thefork_ativa: false,
  integracao_uber_ativa: false,
};

// Linha única de definições do site; devolve defaults se a migração
// ainda não tiver sido aplicada (falha graciosa).
export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as SiteSettings | null) ?? DEFAULTS;
}
