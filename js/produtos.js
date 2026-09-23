import { CHAVE_PRODUTOS, salvarLista } from "./armazenamento.js";

export function carregarProdutos() {
  const salvos = localStorage.getItem(CHAVE_PRODUTOS);
  if (!salvos) return [];

  try {
    const produtos = JSON.parse(salvos);
    return Array.isArray(produtos) ? produtos : [];
  } catch {
    return [];
  }
}

export function filtrarProdutos(termo = "") {
  const busca = termo.trim().toLowerCase();
  return carregarProdutos().filter((produto) =>
    produto.nome.toLowerCase().includes(busca),
  );
}

export function buscarProdutoPorId(id) {
  return carregarProdutos().find((produto) => produto.id === id);
}

export function salvarProduto(dados) {
  const produtos = carregarProdutos();
  const novo = { id: Date.now().toString(), ...dados };
  produtos.push(novo);
  salvarLista(CHAVE_PRODUTOS, produtos);
  return novo;
}

export function atualizarProduto(id, dados) {
  const produtos = carregarProdutos();
  const indice = produtos.findIndex((produto) => produto.id === id);
  if (indice === -1) return null;

  produtos[indice] = { ...produtos[indice], ...dados };
  salvarLista(CHAVE_PRODUTOS, produtos);
  return produtos[indice];
}

export function excluirProduto(id) {
  const produtos = carregarProdutos().filter((produto) => produto.id !== id);
  salvarLista(CHAVE_PRODUTOS, produtos);
}
