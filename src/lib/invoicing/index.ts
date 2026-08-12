import "server-only";
import type { InvoiceProvider } from "./types";
import { MockInvoiceProvider } from "./mock-provider";

export type { InvoiceProvider } from "./types";
export type {
  EmitirFaturaInput,
  FaturaEmitida,
  LinhaFatura,
  MetodoPagamento,
} from "./types";

// Seleção do provedor por variável de ambiente (INVOICE_PROVIDER).
// Quando o provedor certificado for escolhido, acrescentar aqui a
// implementação real (ex.: "vendus", "moloni", "invoicexpress").
export function getInvoiceProvider(): InvoiceProvider {
  const provider = process.env.INVOICE_PROVIDER ?? "mock";
  switch (provider) {
    case "mock":
      return new MockInvoiceProvider();
    default:
      throw new Error(`Provedor de faturação desconhecido: ${provider}`);
  }
}
