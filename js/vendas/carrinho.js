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

export function definirQuantidade(id, quantidade) {
  const novaQuantidade = parseInteiroBR(quantidade);

  if (!Number.isFinite(novaQuantidade) || novaQuantidade <= 0) {
    delete carrinho[id];
    return;
  }

  carrinho[id] = novaQuantidade;
}

export function limparCarrinho() {
  Object.keys(carrinho).forEach((id) => delete carrinho[id]);
}

export function obterTotalVenda(produtos) {
  return Object.entries(carrinho).reduce((soma, [id, quantidade]) => {
    const produto = produtos.find((item) => item.id === id);
    return produto ? soma + Number(produto.preco || 0) * quantidade : soma;
  }, 0);
}
