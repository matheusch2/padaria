import { filtrarProdutos, excluirProduto } from "./produtos.js";
import { exigirUsuario } from "./auth.js";

const QUANTIDADE_POR_PAGINA = 6;
let quantidadeVisivel = QUANTIDADE_POR_PAGINA;
let renderizacaoAtual = 0;

const campoBusca = document.getElementById("buscaProduto");
const listaEl = document.getElementById("listaProdutos");
const btnVerMais = document.getElementById("btnVerMais");

const rotulosUnidade = {
  un: "un",
  kg: "kg",
  fatia: "fatia",
  pacote: "pacote",
  cento: "cento",
};

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconeLapis() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>`;
}

function iconeLixeira() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>`;
}

async function renderizar() {
  const token = ++renderizacaoAtual;
  listaEl.innerHTML = '<p class="sem-produtos">Carregando produtos...</p>';

  try {
    const produtos = await filtrarProdutos(campoBusca.value);
    if (token !== renderizacaoAtual) return;

    if (produtos.length === 0) {
      listaEl.innerHTML = '<p class="sem-produtos">Nenhum produto cadastrado.</p>';
      btnVerMais.hidden = true;
      return;
    }

    const visiveis = produtos.slice(0, quantidadeVisivel);

    listaEl.innerHTML = visiveis
      .map((produto) => {
        const custo = Number(produto.custo) || 0;
        const preco = Number(produto.preco) || 0;
        const lucro = preco - custo;
        const margem = preco > 0 ? (lucro / preco) * 100 : 0;

        return `
        <div class="produto-cadastro-item">
          <div class="produto-cadastro-info">
            <b>${escaparHTML(produto.nome)}</b>
            <span>${escaparHTML(produto.categoria || "Outros")} · ${formatarMoeda(preco)} / ${escaparHTML(rotulosUnidade[produto.unidade] || "un")}</span>
            <span class="produto-cadastro-lucro${lucro < 0 ? " prejuizo" : ""}">Custo ${formatarMoeda(custo)} · Lucro ${formatarMoeda(lucro)} (${margem.toFixed(0)}%)</span>
          </div>
          <div class="produto-cadastro-acoes">
            <button type="button" class="editar" data-id="${produto.id}" aria-label="Editar ${escaparHTML(produto.nome)}">
              ${iconeLapis()}
            </button>
            <button type="button" class="excluir" data-id="${produto.id}" aria-label="Excluir ${escaparHTML(produto.nome)}">
              ${iconeLixeira()}
            </button>
          </div>
        </div>`;
      })
      .join("");

    listaEl.querySelectorAll(".editar").forEach((botao) => {
      botao.addEventListener("click", () => {
        window.location.href = `cadastrar-produto.html?id=${botao.dataset.id}`;
      });
    });

    listaEl.querySelectorAll(".excluir").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const produto = produtos.find((item) => item.id === botao.dataset.id);
        if (!produto) return;
        if (!window.confirm(`Excluir "${produto.nome}"?`)) return;

        botao.disabled = true;
        try {
          await excluirProduto(produto.id);
          await renderizar();
        } catch (erro) {
          window.alert(erro?.message || "Não foi possível excluir o produto.");
          botao.disabled = false;
        }
      });
    });

    btnVerMais.hidden = produtos.length <= quantidadeVisivel;
  } catch (erro) {
    if (token !== renderizacaoAtual) return;
    listaEl.innerHTML = `<p class="sem-produtos">${escaparHTML(erro?.message || "Não foi possível carregar os produtos.")}</p>`;
    btnVerMais.hidden = true;
  }
}

campoBusca.addEventListener("input", () => {
  quantidadeVisivel = QUANTIDADE_POR_PAGINA;
  renderizar();
});

btnVerMais.addEventListener("click", () => {
  quantidadeVisivel += QUANTIDADE_POR_PAGINA;
  renderizar();
});

const usuario = await exigirUsuario();
if (usuario) await renderizar();
