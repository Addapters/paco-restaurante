import type {
  EmitirFaturaInput,
  FaturaEmitida,
  InvoiceProvider,
} from "./types";

// Provedor de desenvolvimento: não emite documentos fiscais reais.
// Gera um número sequencial-aparente e deixa o url a null — o fluxo de
// pagamento cria então um link interno (/fatura/<id>) com o detalhe.
export class MockInvoiceProvider implements InvoiceProvider {
  readonly nome = "mock";

  async emitirFatura(input: EmitirFaturaInput): Promise<FaturaEmitida> {
    const ano = new Date().getFullYear();
    const sufixo = Date.now().toString().slice(-6);
    return {
      provedorReferencia: `mock_${input.orderId}`,
      numeroFatura: `FT-DEMO ${ano}/${sufixo}`,
      url: null,
    };
  }
}
