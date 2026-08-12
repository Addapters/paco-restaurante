"use client";

import { useEffect } from "react";

export interface MesaInfo {
  id: string;
  numero: number;
  qrToken: string;
  capacidade: number;
}

const STORAGE_KEY = "paco.mesa";

// Guarda a mesa identificada pelo QR na sessão do browser, para que o
// resto da área de cliente (pedidos, alertas) saiba a que mesa pertence.
export function MesaSession({ mesa }: { mesa: MesaInfo }) {
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mesa));
  }, [mesa]);

  return null;
}

export function getMesaFromSession(): MesaInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MesaInfo) : null;
  } catch {
    return null;
  }
}
