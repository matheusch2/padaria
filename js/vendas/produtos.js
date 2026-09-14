import { CHAVE_PRODUTOS, salvarLista } from "./armazenamento.js";

const PRODUTOS_EXEMPLO = [
  { id: "p1", nome: "Pão Francês", preco: 0.8 },
  { id: "p2", nome: "Croissant", preco: 6.5 },
  { id: "p3", nome: "Bolo de Chocolate", preco: 32.0 },
  { id: "p4", nome: "Rosca de Canela", preco: 9.0 },
];

export function carregarProdutos() {
  const salvos = localStorage.getItem(CHAVE_PRODUTOS);
  if (salvos) return JSON.parse(salvos);

  salvarLista(CHAVE_PRODUTOS, PRODUTOS_EXEMPLO);
  return PRODUTOS_EXEMPLO;
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
