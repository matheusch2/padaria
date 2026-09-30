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

export async function gerarRecorrentesPendentes() {
  const { error } = await supabase.rpc("gerar_lancamentos_recorrentes");
  tratarErro(error, "Não foi possível gerar as contas recorrentes.");
}

export async function listarLancamentos({ tipo, status, inicio, fim } = {}) {
  let consulta = supabase
    .from("lancamentos_financeiros")
    .select("*")
    .order("vencimento", { ascending: true });

  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (status) consulta = consulta.in("status", Array.isArray(status) ? status : [status]);
  if (inicio) consulta = consulta.gte("vencimento", inicio);
  if (fim) consulta = consulta.lte("vencimento", fim);

  const { data, error } = await consulta;
  tratarErro(error, "Não foi possível carregar os lançamentos.");
  return data || [];
}

export async function criarLancamento(payload) {
  const usuario = await usuarioAtual();

  const jaPago = Boolean(payload.jaPago);
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .insert({
      usuario_id: usuario.id,
      tipo: payload.tipo,
      descricao: payload.descricao,
      categoria: payload.categoria || null,
      pessoa: payload.pessoa || null,
      valor: payload.valor,
      vencimento: payload.vencimento,
      status: jaPago ? "pago" : "pendente",
      forma_pagamento: payload.formaPagamento || null,
      pago_em: jaPago ? new Date().toISOString() : null,
      observacao: payload.observacao || null,
    })
    .select("*")
    .single();

  tratarErro(error, "Não foi possível salvar o lançamento.");
  return data;
}

export async function marcarComoPago(id, formaPagamento) {
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .update({
      status: "pago",
      pago_em: new Date().toISOString(),
      forma_pagamento: formaPagamento || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  tratarErro(error, "Não foi possível marcar como pago.");
  return data;
}

export async function excluirLancamento(id) {
  const { error } = await supabase.from("lancamentos_financeiros").delete().eq("id", id);
  tratarErro(error, "Não foi possível excluir o lançamento.");
}

export async function listarRecorrentes() {
  const { data, error } = await supabase
    .from("despesas_recorrentes")
    .select("*")
    .order("descricao", { ascending: true });

  tratarErro(error, "Não foi possível carregar as despesas recorrentes.");
  return data || [];
}

export async function criarRecorrente(payload) {
  const usuario = await usuarioAtual();
  const hoje = new Date();
  const diaVencimento = Number(payload.diaVencimento);

  let proximaGeracao = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  if (proximaGeracao < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
    proximaGeracao = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
  }

  const { data, error } = await supabase
    .from("despesas_recorrentes")
    .insert({
      usuario_id: usuario.id,
      tipo: payload.tipo,
      descricao: payload.descricao,
      categoria: payload.categoria || null,
      pessoa: payload.pessoa || null,
      valor: payload.valor,
      dia_vencimento: diaVencimento,
      proxima_geracao: proximaGeracao.toISOString().slice(0, 10),
    })
    .select("*")
    .single();

  tratarErro(error, "Não foi possível salvar a despesa recorrente.");
  return data;
}

export async function alternarRecorrente(id, ativo) {
  const { error } = await supabase.from("despesas_recorrentes").update({ ativo }).eq("id", id);
  tratarErro(error, "Não foi possível atualizar a despesa recorrente.");
}

export async function excluirRecorrente(id) {
  const { error } = await supabase.from("despesas_recorrentes").delete().eq("id", id);
  tratarErro(error, "Não foi possível excluir a despesa recorrente.");
}
