import { supabase } from "./supabase.js";

function tratarErro(error, contexto) {
  if (!error) return;
  const erro = new Error(error.message || contexto);
  erro.cause = error;
  throw erro;
}

async function usuarioAtual() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  tratarErro(authError, "Sessão inválida.");
  if (!authData.user) throw new Error("Usuário não autenticado.");
  return authData.user;
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

export async function listarFechamentosPeriodo(dataInicial, dataFinal) {
  const { data, error } = await supabase
    .from("fechamentos_caixa")
    .select("*")
    .gte("data_referencia", dataInicial)
    .lte("data_referencia", dataFinal)
    .eq("status", "fechado")
    .order("data_referencia", { ascending: false });

  tratarErro(error, "Não foi possível carregar os fechamentos.");
  return data || [];
}

export async function abrirCaixa(payload) {
  const usuario = await usuarioAtual();
  const existente = await buscarFechamento(payload.dataReferencia);

  if (existente) {
    if (existente.status === "aberto") return existente;
    throw new Error("O caixa desta data já está fechado. Escolha outra data para abrir um novo caixa.");
  }

  const { data, error } = await supabase
    .from("fechamentos_caixa")
    .insert({
      usuario_id: usuario.id,
      data_referencia: payload.dataReferencia,
      fundo_inicial: payload.fundoInicial,
      status: "aberto",
      aberto_em: new Date().toISOString(),
    })
    .select("*")
    .single();

  tratarErro(error, "Não foi possível abrir o caixa.");
  return data;
}

export async function fecharCaixa(payload) {
  const usuario = await usuarioAtual();
  const valores = {
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
    status: "fechado",
    fechado_em: new Date().toISOString(),
  };

  let consulta = supabase
    .from("fechamentos_caixa")
    .update(valores)
    .eq("usuario_id", usuario.id)
    .eq("data_referencia", payload.dataReferencia)
    .eq("status", "aberto");

  if (payload.id) consulta = consulta.eq("id", payload.id);

  const { data, error } = await consulta.select("*").maybeSingle();
  tratarErro(error, "Não foi possível fechar o caixa.");
  if (!data) throw new Error("Abra o caixa desta data antes de fazer o fechamento.");
  return data;
}

// Mantém a API anterior compatível com páginas antigas durante a atualização.
export async function salvarFechamento(payload) {
  const usuario = await usuarioAtual();

  const { data, error } = await supabase
    .from("fechamentos_caixa")
    .upsert(
      {
        usuario_id: usuario.id,
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
        status: "fechado",
        fechado_em: new Date().toISOString(),
      },
      { onConflict: "usuario_id,data_referencia" },
    )
    .select("*")
    .single();

  tratarErro(error, "Não foi possível salvar o fechamento.");
  return data;
}
