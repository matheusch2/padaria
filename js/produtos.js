import { supabase } from "./supabase.js";

const CAMPOS_PRODUTO = "id,nome,categoria,custo,preco,unidade,estoque,ativo,criado_em,atualizado_em";

function normalizarProduto(produto) {
  if (!produto) return null;
  return {
    ...produto,
    custo: Number(produto.custo) || 0,
    preco: Number(produto.preco) || 0,
    estoque: Number(produto.estoque) || 0,
  };
}

function tratarErro(error, contexto) {
  if (!error) return;
  const erro = new Error(error.message || contexto);
  erro.cause = error;
  throw erro;
}

export async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select(CAMPOS_PRODUTO)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  tratarErro(error, "Não foi possível carregar os produtos.");
  return (data || []).map(normalizarProduto);
}

export async function filtrarProdutos(termo = "") {
  const busca = termo.trim();
  let consulta = supabase
    .from("produtos")
    .select(CAMPOS_PRODUTO)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);

  const { data, error } = await consulta;
  tratarErro(error, "Não foi possível pesquisar os produtos.");
  return (data || []).map(normalizarProduto);
}

export async function buscarProdutoPorId(id) {
  const { data, error } = await supabase
    .from("produtos")
    .select(CAMPOS_PRODUTO)
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle();

  tratarErro(error, "Não foi possível localizar o produto.");
  return normalizarProduto(data);
}

export async function salvarProduto(dados) {
  const payload = {
    nome: dados.nome,
    categoria: dados.categoria || "Outros",
    custo: Number(dados.custo) || 0,
    preco: Number(dados.preco) || 0,
    unidade: dados.unidade || "un",
    estoque: Math.max(0, Number(dados.estoque) || 0),
    ativo: true,
  };

  const { data, error } = await supabase
    .from("produtos")
    .insert(payload)
    .select(CAMPOS_PRODUTO)
    .single();

  tratarErro(error, "Não foi possível salvar o produto.");
  return normalizarProduto(data);
}

export async function atualizarProduto(id, dados) {
  const payload = {
    nome: dados.nome,
    categoria: dados.categoria || "Outros",
    custo: Number(dados.custo) || 0,
    preco: Number(dados.preco) || 0,
    unidade: dados.unidade || "un",
    estoque: Math.max(0, Number(dados.estoque) || 0),
  };

  const { data, error } = await supabase
    .from("produtos")
    .update(payload)
    .eq("id", id)
    .select(CAMPOS_PRODUTO)
    .single();

  tratarErro(error, "Não foi possível atualizar o produto.");
  return normalizarProduto(data);
}

export async function excluirProduto(id) {
  const { error } = await supabase
    .from("produtos")
    .update({ ativo: false })
    .eq("id", id);

  tratarErro(error, "Não foi possível excluir o produto.");
}

export async function ajustarEstoque(id, delta) {
  const { error } = await supabase.rpc("ajustar_estoque", {
    p_produto_id: id,
    p_delta: Number(delta),
  });

  tratarErro(error, "Não foi possível ajustar o estoque.");
  return buscarProdutoPorId(id);
}
