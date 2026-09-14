import { CHAVE_PRODUTOS } from "./armazenamento.js";

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
