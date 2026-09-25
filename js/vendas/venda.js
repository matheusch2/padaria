import { carregarProdutos } from "../produtos.js";
import { registrarVenda } from "../vendas-api.js";
import { exigirUsuario } from "../auth.js";
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

let produtos = [];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function produtosFiltrados() {
  const termo = document.getElementById("buscaProduto").value.trim().toLowerCase();
  if (!termo) return produtos;
  return produtos.filter((produto) => produto.nome.toLowerCase().includes(termo));
}

function renderizarProdutos() {
  const lista = document.getElementById("listaProdutos");
  const filtrados = produtosFiltrados();

  if (filtrados.length === 0) {
    lista.innerHTML = '<p class="sem-produtos">Nenhum produto cadastrado.</p>';
    return;
  }

  const carrinho = obterCarrinho();
  lista.innerHTML = filtrados
    .map((produto) => {
      const estoque = Number(produto.estoque) || 0;
      const noCarrinho = Number(carrinho[produto.id]) || 0;
      const semEstoque = estoque <= noCarrinho;
      return `
      <div class="produto-item">
        <div class="produto-info">
          <b>${escaparHTML(produto.nome)}</b>
          <span>${formatarMoeda(produto.preco)} / ${escaparHTML(produto.unidade || "un")}</span>
        </div>
        <button class="btn-add" data-id="${produto.id}" type="button" ${semEstoque ? "disabled" : ""}>+</button>
      </div>`;
    })
    .join("");

  lista.querySelectorAll(".btn-add").forEach((botao) => {
    botao.addEventListener("click", () => {
      adicionarAoCarrinho(botao.dataset.id);
      renderizarProdutos();
      renderizarCarrinho();
    });
  });
}

function renderizarCarrinho() {
  const container = document.getElementById("carrinhoItens");
  const itens = Object.entries(obterCarrinho());

  if (itens.length === 0) {
    container.innerHTML = '<p class="carrinho-vazio">Nenhum item adicionado ainda.</p>';
  } else {
    container.innerHTML = itens
      .map(([id, quantidade]) => {
        const produto = produtos.find((item) => item.id === id);
        if (!produto) return "";

        const subtotal = Number(produto.preco || 0) * quantidade;

        return `
        <div class="carrinho-item">
          <span class="nome-item">${escaparHTML(produto.nome)}</span>
          <div class="qtd-stepper">
            <button type="button" data-id="${id}" data-delta="-1">−</button>
            <input
              type="text"
              class="qtd-input milhar"
              data-id="${id}"
              inputmode="numeric"
              value="${quantidade.toLocaleString("pt-BR")}"
              aria-label="Quantidade de ${escaparHTML(produto.nome)}"
            />
            <button type="button" data-id="${id}" data-delta="1" ${quantidade >= Number(produto.estoque || 0) ? "disabled" : ""}>+</button>
          </div>
          <span class="subtotal-item">${formatarMoeda(subtotal)}</span>
        </div>`;
      })
      .join("");

    container.querySelectorAll("button[data-delta]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const produto = produtos.find((item) => item.id === botao.dataset.id);
        const delta = Number(botao.dataset.delta);
        const atual = Number(obterCarrinho()[botao.dataset.id]) || 0;
        if (delta > 0 && produto && atual >= Number(produto.estoque || 0)) return;
        alterarQuantidade(botao.dataset.id, delta);
        renderizarProdutos();
        renderizarCarrinho();
      });
    });

    container.querySelectorAll(".qtd-input").forEach((campo) => {
      const atualizarQuantidadeDigitada = () => {
        const produto = produtos.find((item) => item.id === campo.dataset.id);
        const solicitada = parseInteiroBR(campo.value);
        const limite = Math.max(0, Number(produto?.estoque) || 0);
        definirQuantidade(campo.dataset.id, Math.min(solicitada, limite));
        renderizarProdutos();
        renderizarCarrinho();
      };

      campo.addEventListener("change", atualizarQuantidadeDigitada);
      campo.addEventListener("blur", atualizarQuantidadeDigitada);
    });
  }

  const total = obterTotalVenda(produtos);
  document.getElementById("totalVenda").textContent = formatarMoeda(total);
  atualizarResumoPagamento(formatarMoeda);
}

async function finalizarVenda() {
  const aviso = document.getElementById("avisoFinalizar");
  const btnFinalizar = document.getElementById("btnFinalizar");
  aviso.hidden = true;
  aviso.classList.remove("sucesso");

  const itens = Object.entries(obterCarrinho());

  if (itens.length === 0) {
    aviso.textContent = "Adicione ao menos um produto antes de finalizar.";
    aviso.hidden = false;
    return;
  }

  for (const [id, quantidade] of itens) {
    const produto = produtos.find((item) => item.id === id);
    if (!produto) {
      aviso.textContent = "Um dos produtos do carrinho não está mais disponível.";
      aviso.hidden = false;
      return;
    }
    if (quantidade > Number(produto.estoque || 0)) {
      aviso.textContent = `Estoque insuficiente para ${produto.nome}.`;
      aviso.hidden = false;
      return;
    }
  }

  const totalVenda = obterTotalVenda(produtos);
  const pagamento = valoresPagamento();

  if (Math.abs(pagamento.total - totalVenda) >= 0.005) {
    aviso.textContent = `O valor informado (${formatarMoeda(pagamento.total)}) não bate com o total da venda (${formatarMoeda(totalVenda)}).`;
    aviso.hidden = false;
    return;
  }

  btnFinalizar.disabled = true;
  try {
    await registrarVenda(
      itens.map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
      pagamento,
    );

    limparCarrinho();
    limparCamposPagamento();
    produtos = await carregarProdutos();
    renderizarProdutos();
    renderizarCarrinho();

    aviso.textContent = "Venda registrada no banco com sucesso!";
    aviso.classList.add("sucesso");
    aviso.hidden = false;
  } catch (erro) {
    aviso.textContent = erro?.message || "Não foi possível registrar a venda.";
    aviso.hidden = false;
  } finally {
    btnFinalizar.disabled = false;
  }
}

async function iniciarTelaVenda() {
  const usuario = await exigirUsuario();
  if (!usuario) return;

  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = '<p class="sem-produtos">Carregando produtos...</p>';

  try {
    produtos = await carregarProdutos();
  } catch (erro) {
    lista.innerHTML = `<p class="sem-produtos">${escaparHTML(erro?.message || "Não foi possível carregar os produtos.")}</p>`;
    return;
  }

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

await iniciarTelaVenda();
