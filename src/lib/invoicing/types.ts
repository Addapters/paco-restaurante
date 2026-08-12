// Camada de abstração do provedor de faturação certificado.
// A escolha final do provedor está pendente (secção 7 do plano) — para
// trocar de provedor basta criar uma nova implementação de
// InvoiceProvider e registá-la na factory (index.ts), sem tocar no
// resto do fluxo de pagamento.

export type MetodoPagamento = "dinheiro" | "multibanco_tpa" | "parceiro";

export interface LinhaFatura {
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  /** Item oferecido: fatura a 0,00 €, valor original fica no histórico */
  eOferta: boolean;
}

export interface EmitirFaturaInput {
  orderId: string;
  metodo: MetodoPagamento;
  linhas: LinhaFatura[];
  total: number;
}

export interface FaturaEmitida {
  /** Referência interna do provedor (para reconciliação/consultas) */
  provedorReferencia: string;
  /** Número oficial do documento (ex.: "FT 2026/123") */
  numeroFatura: string;
  /** Link público para o documento/PDF; null se o provedor não devolver */
  url: string | null;
}

export interface InvoiceProvider {
  readonly nome: string;
  emitirFatura(input: EmitirFaturaInput): Promise<FaturaEmitida>;
}
