import { supabase } from "./supabase.js";

function tratarErro(error, contexto) {
  if (!error) return;
  const erro = new Error(error.message || contexto);
  erro.cause = error;
  throw erro;
}

export async function registrarVenda(itens, pagamento, observacao = "") {
  const payloadItens = itens.map((item) => ({
    produto_id: item.produtoId,
    quantidade: Number(item.quantidade),
  }));

  const { data, error } = await supabase.rpc("registrar_venda", {
    p_itens: payloadItens,
    p_dinheiro: Number(pagamento.dinheiro) || 0,
    p_cartao: Number(pagamento.cartao) || 0,
    p_pix: Number(pagamento.pix) || 0,
    p_observacao: observacao || null,
  });

  tratarErro(error, "Não foi possível registrar a venda.");
  return data;
}

export async function listarVendasPeriodo(inicioISO, fimISO) {
  const { data, error } = await supabase
    .from("vendas")
    .select(`
      id,
      realizada_em,
      total,
      dinheiro,
      cartao,
      pix,
      status,
      observacao,
      itens_venda (
        id,
        produto_id,
        nome_produto,
        quantidade,
        preco_unitario,
        custo_unitario,
        subtotal
      )
    `)
    .gte("realizada_em", inicioISO)
    .lt("realizada_em", fimISO)
    .eq("status", "concluida")
    .order("realizada_em", { ascending: false });

  tratarErro(error, "Não foi possível carregar as vendas.");
  return data || [];
}
