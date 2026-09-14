import { carregarProdutos } from "./produtos.js";

const carrinho = {};

export function obterCarrinho() {
  return carrinho;
}

export function adicionarAoCarrinho(id) {
  carrinho[id] = (carrinho[id] || 0) + 1;
}

export function alterarQuantidade(id, delta) {
  const novaQuantidade = (carrinho[id] || 0) + delta;

  if (novaQuantidade <= 0) {
    delete carrinho[id];
    return;
  }

  carrinho[id] = novaQuantidade;
}

export function limparCarrinho() {
  Object.keys(carrinho).forEach((id) => delete carrinho[id]);
}

export function obterTotalVenda() {
  const produtos = carregarProdutos();

  return Object.entries(carrinho).reduce((soma, [id, quantidade]) => {
    const produto = produtos.find((item) => item.id === id);
    return produto ? soma + produto.preco * quantidade : soma;
  }, 0);
}
