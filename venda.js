const CHAVE_PRODUTOS = "padaria_produtos";
const CHAVE_VENDAS = "padaria_vendas";

const PRODUTOS_EXEMPLO = [
  { id: "p1", nome: "Pão Francês", preco: 0.8 },
  { id: "p2", nome: "Croissant", preco: 6.5 },
  { id: "p3", nome: "Bolo de Chocolate", preco: 32.0 },
  { id: "p4", nome: "Rosca de Canela", preco: 9.0 },
];

const carrinho = {};

function carregarProdutos() {
  const salvos = localStorage.getItem(CHAVE_PRODUTOS);
  if (salvos) return JSON.parse(salvos);
  localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(PRODUTOS_EXEMPLO));
  return PRODUTOS_EXEMPLO;
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderizarProdutos() {
  const termo = document
    .getElementById("buscaProduto")
    .value.trim()
    .toLowerCase();
  const lista = document.getElementById("listaProdutos");
  const produtos = carregarProdutos().filter((p) =>
    p.nome.toLowerCase().includes(termo),
  );

  if (produtos.length === 0) {
    lista.innerHTML = '<p class="sem-produtos">Nenhum produto encontrado.</p>';
    return;
  }

  lista.innerHTML = produtos
    .map(
      (p) => `
      <div class="produto-item">
        <div class="produto-info">
          <b>${p.nome}</b>
          <span>${formatarMoeda(p.preco)} / un</span>
        </div>
        <button class="btn-add" data-id="${p.id}" type="button">+</button>
      </div>`,
    )
    .join("");

  lista.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () => adicionarAoCarrinho(btn.dataset.id));
  });
}

function adicionarAoCarrinho(id) {
  carrinho[id] = (carrinho[id] || 0) + 1;
  renderizarCarrinho();
}

function alterarQuantidade(id, delta) {
  const nova = (carrinho[id] || 0) + delta;
  if (nova <= 0) {
    delete carrinho[id];
  } else {
    carrinho[id] = nova;
  }
  renderizarCarrinho();
}

function obterTotalVenda() {
  const produtos = carregarProdutos();
  return Object.entries(carrinho).reduce((soma, [id, qtd]) => {
    const produto = produtos.find((p) => p.id === id);
    return produto ? soma + produto.preco * qtd : soma;
  }, 0);
}

function renderizarCarrinho() {
  const produtos = carregarProdutos();
  const container = document.getElementById("carrinhoItens");
  const itens = Object.entries(carrinho);

  if (itens.length === 0) {
    container.innerHTML = '<p class="carrinho-vazio">Nenhum item adicionado ainda.</p>';
  } else {
    container.innerHTML = itens
      .map(([id, qtd]) => {
        const produto = produtos.find((p) => p.id === id);
        if (!produto) return "";
        const subtotal = produto.preco * qtd;
        return `
        <div class="carrinho-item">
          <span class="nome-item">${produto.nome}</span>
          <div class="qtd-stepper">
            <button type="button" data-id="${id}" data-delta="-1">−</button>
            <b>${qtd}</b>
            <button type="button" data-id="${id}" data-delta="1">+</button>
          </div>
          <span class="subtotal-item">${formatarMoeda(subtotal)}</span>
        </div>`;
      })
      .join("");

    container.querySelectorAll("button[data-delta]").forEach((btn) => {
      btn.addEventListener("click", () =>
        alterarQuantidade(btn.dataset.id, Number(btn.dataset.delta)),
      );
    });
  }

  const total = obterTotalVenda();
  document.getElementById("totalVenda").textContent = formatarMoeda(total);
  atualizarResumoPagamento();
}

function valoresPagamento() {
  const dinheiro = Number(document.getElementById("valorDinheiro").value) || 0;
  const cartao = Number(document.getElementById("valorCartao").value) || 0;
  const pix = Number(document.getElementById("valorPix").value) || 0;
  return { dinheiro, cartao, pix, total: dinheiro + cartao + pix };
}

function atualizarResumoPagamento() {
  const { total: totalInformado } = valoresPagamento();
  const totalVenda = obterTotalVenda();
  const elResumo = document.getElementById("totalInformado");
  elResumo.textContent = formatarMoeda(totalInformado);

  const bate = Math.abs(totalInformado - totalVenda) < 0.005;
  elResumo.classList.toggle("ok", bate && totalVenda > 0);
}

function finalizarVenda() {
  const aviso = document.getElementById("avisoFinalizar");
  aviso.hidden = true;

  const itens = Object.entries(carrinho);
  if (itens.length === 0) {
    aviso.textContent = "Adicione ao menos um produto antes de finalizar.";
    aviso.hidden = false;
    return;
  }

  const totalVenda = obterTotalVenda();
  const pagamento = valoresPagamento();

  if (Math.abs(pagamento.total - totalVenda) >= 0.005) {
    aviso.textContent = `O valor informado (${formatarMoeda(pagamento.total)}) não bate com o total da venda (${formatarMoeda(totalVenda)}).`;
    aviso.hidden = false;
    return;
  }

  const produtos = carregarProdutos();
  const venda = {
    id: Date.now().toString(),
    data: new Date().toISOString(),
    itens: itens.map(([id, qtd]) => {
      const produto = produtos.find((p) => p.id === id);
      return { produtoId: id, nome: produto.nome, preco: produto.preco, quantidade: qtd };
    }),
    total: totalVenda,
    pagamento: {
      dinheiro: pagamento.dinheiro,
      cartao: pagamento.cartao,
      pix: pagamento.pix,
    },
  };

  const vendas = JSON.parse(localStorage.getItem(CHAVE_VENDAS) || "[]");
  vendas.push(venda);
  localStorage.setItem(CHAVE_VENDAS, JSON.stringify(vendas));

  Object.keys(carrinho).forEach((id) => delete carrinho[id]);
  ["valorDinheiro", "valorCartao", "valorPix"].forEach((elId) => {
    document.getElementById(elId).value = "";
  });
  renderizarCarrinho();

  aviso.textContent = "Venda registrada com sucesso!";
  aviso.classList.add("sucesso");
  aviso.hidden = false;
}

document.getElementById("buscaProduto").addEventListener("input", renderizarProdutos);
["valorDinheiro", "valorCartao", "valorPix"].forEach((elId) => {
  document.getElementById(elId).addEventListener("input", atualizarResumoPagamento);
});
document.getElementById("btnFinalizar").addEventListener("click", finalizarVenda);

renderizarProdutos();
renderizarCarrinho();
