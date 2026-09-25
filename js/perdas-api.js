import { supabase } from "./supabase.js";

function tratarErro(error, contexto) {
  if (!error) return;
  const erro = new Error(error.message || contexto);
  erro.cause = error;
  throw erro;
}

export async function registrarPerdaSobra({ produtoId, tipo, quantidade, motivo, observacao }) {
  const { data, error } = await supabase.rpc("registrar_perda_sobra", {
    p_produto_id: produtoId,
    p_tipo: tipo,
    p_quantidade: Number(quantidade),
    p_motivo: motivo,
    p_observacao: observacao || null,
  });

  tratarErro(error, "Não foi possível registrar a perda ou sobra.");
  return data;
}

export async function estornarPerdaSobra(id) {
  const { data, error } = await supabase.rpc("estornar_perda_sobra", {
    p_registro_id: id,
  });

  tratarErro(error, "Não foi possível estornar a movimentação.");
  return Number(data) || 0;
}

export async function listarPerdasPeriodo(inicioISO, fimISO) {
  const { data, error } = await supabase
    .from("perdas_sobras")
    .select("id,produto_id,nome_produto,tipo,quantidade,custo_unitario,custo_total,motivo,observacao,registrada_em,estornada_em")
    .gte("registrada_em", inicioISO)
    .lt("registrada_em", fimISO)
    .is("estornada_em", null)
    .order("registrada_em", { ascending: false });

  tratarErro(error, "Não foi possível carregar perdas e sobras.");
  return data || [];
}
