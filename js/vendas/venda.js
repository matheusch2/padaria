import { CHAVE_VENDAS, lerLista, salvarLista } from "./armazenamento.js";
import { carregarProdutos, filtrarProdutos } from "./produtos.js";
import {
  adicionarAoCarrinho,
  alterarQuantidade,
  definirQuantidade,
  limparCarrinho,
  obterCarrinho,
  obterTotalVenda,
} from "./carrinho.js";
import {
  atualizarResumoPagamento,
  limparCamposPagamento,
  valoresPagamento,
} from "./pagamento.js";

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function renderizarProdutos() {
  const termo = document.getElementById("buscaProduto").value;
  const lista = document.getElementById("listaProdutos");
  const produtos = filtrarProdutos(termo);

  if (produtos.length === 0) {
    lista.innerHTML = '<p class="sem-produtos">Nenhum produto cadastrado.</p>';
    return;
  }

  lista.innerHTML = produtos
    .map(
      (produto) => `
      <div class="produto-item">
        <div class="produto-info">
          <b>${produto.nome}</b>
          <span>${formatarMoeda(produto.preco)} / un</span>
        </div>
        <button class="btn-add" data-id="${produto.id}" type="button">+</button>
      </div>`,
    )
    .join("");

  lista.querySelectorAll(".btn-add").forEach((botao) => {
    botao.addEventListener("click", () => {
      adicionarAoCarrinho(botao.dataset.id);
      renderizarCarrinho();
    });
  });
}

function renderizarCarrinho() {
  const produtos = carregarProdutos();
  const container = document.getElementById("carrinhoItens");
  const itens = Object.entries(obterCarrinho());

  if (itens.length === 0) {
    container.innerHTML = '<p class="carrinho-vazio">Nenhum item adicionado ainda.</p>';
  } else {
    container.innerHTML = itens
      .map(([id, quantidade]) => {
        const produto = produtos.find((item) => item.id === id);
        if (!produto) return "";

        const subtotal = produto.preco * quantidade;

        return `
        <div class="carrinho-item">
          <span class="nome-item">${produto.nome}</span>
          <div class="qtd-stepper">
            <button type="button" data-id="${id}" data-delta="-1">−</button>
            <input
              type="number"
              class="qtd-input"
              data-id="${id}"
              min="1"
              step="1"
              inputmode="numeric"
              value="${quantidade}"
              aria-label="Quantidade de ${produto.nome}"
              style="width:48px;height:32px;border:0;outline:0;background:transparent;text-align:center;font-weight:800;color:#35231a;font-size:14px;-moz-appearance:textfield;"
            />
            <button type="button" data-id="${id}" data-delta="1">+</button>
          </div>
          <span class="subtotal-item">${formatarMoeda(subtotal)}</span>
        </div>`;
      })
      .join("");

    container.querySelectorAll("button[data-delta]").forEach((botao) => {
      botao.addEventListener("click", () => {
        alterarQuantidade(botao.dataset.id, Number(botao.dataset.delta));
        renderizarCarrinho();
      });
    });

    container.querySelectorAll(".qtd-input").forEach((campo) => {
      const atualizarQuantidadeDigitada = () => {
        definirQuantidade(campo.dataset.id, campo.value);
        renderizarCarrinho();
      };

      campo.addEventListener("change", atualizarQuantidadeDigitada);
      campo.addEventListener("blur", atualizarQuantidadeDigitada);
    });
  }

  const total = obterTotalVenda();
  document.getElementById("totalVenda").textContent = formatarMoeda(total);
  atualizarResumoPagamento(formatarMoeda);
}

function finalizarVenda() {
  const aviso = document.getElementById("avisoFinalizar");
  aviso.hidden = true;
  aviso.classList.remove("sucesso");

  const itens = Object.entries(obterCarrinho());

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
    itens: itens.map(([id, quantidade]) => {
      const produto = produtos.find((item) => item.id === id);

      return {
        produtoId: id,
        nome: produto.nome,
        preco: produto.preco,
        quantidade,
      };
    }),
    total: totalVenda,
    pagamento: {
      dinheiro: pagamento.dinheiro,
      cartao: pagamento.cartao,
      pix: pagamento.pix,
    },
  };

  const vendas = lerLista(CHAVE_VENDAS);
  vendas.push(venda);
  salvarLista(CHAVE_VENDAS, vendas);

  limparCarrinho();
  limparCamposPagamento();
  renderizarCarrinho();

  aviso.textContent = "Venda registrada com sucesso!";
  aviso.classList.add("sucesso");
  aviso.hidden = false;
}

function iniciarTelaVenda() {
  document.getElementById("buscaProduto").addEventListener("input", renderizarProdutos);

  ["valorDinheiro", "valorCartao", "valorPix"].forEach((id) => {
    document
      .getElementById(id)
      .addEventListener("input", () => atualizarResumoPagamento(formatarMoeda));
  });

  document.getElementById("btnFinalizar").addEventListener("click", finalizarVenda);

  renderizarProdutos();
  renderizarCarrinho();
}

iniciarTelaVenda();
