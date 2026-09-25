import { supabase } from "./supabase.js";

function tratarErro(error, contexto) {
  if (!error) return;
  const erro = new Error(error.message || contexto);
  erro.cause = error;
  throw erro;
}

export async function buscarFechamento(dataReferencia) {
  const { data, error } = await supabase
    .from("fechamentos_caixa")
    .select("*")
    .eq("data_referencia", dataReferencia)
    .maybeSingle();

  tratarErro(error, "Não foi possível carregar o fechamento.");
  return data || null;
}

export async function salvarFechamento(payload) {
  const { data, error } = await supabase
    .from("fechamentos_caixa")
    .upsert(
      {
        data_referencia: payload.dataReferencia,
        quantidade_vendas: payload.quantidadeVendas,
        faturamento: payload.faturamento,
        dinheiro: payload.dinheiro,
        cartao: payload.cartao,
        pix: payload.pix,
        custo_vendido: payload.custoVendido,
        custo_perdas: payload.custoPerdas,
        resultado_bruto: payload.resultadoBruto,
        fundo_inicial: payload.fundoInicial,
        retiradas: payload.retiradas,
        dinheiro_esperado: payload.dinheiroEsperado,
        dinheiro_contado: payload.dinheiroContado,
        diferenca: payload.diferenca,
        observacao: payload.observacao || null,
      },
      { onConflict: "usuario_id,data_referencia" },
    )
    .select("*")
    .single();

  tratarErro(error, "Não foi possível salvar o fechamento.");
  return data;
}
