import { filtrarProdutos, ajustarEstoque } from "./produtos.js";

const QUANTIDADE_POR_PAGINA = 6;
let quantidadeVisivel = QUANTIDADE_POR_PAGINA;

const campoBusca = document.getElementById("buscaProduto");
const listaEl = document.getElementById("listaEstoque");
const btnVerMais = document.getElementById("btnVerMais");

const rotulosUnidade = {
  un: "un",
  kg: "kg",
  fatia: "fatia",
  pacote: "pacote",
  cento: "cento",
};

function classeQuantidade(quantidade) {
  if (quantidade <= 0) return "zerado";
  if (quantidade < 10) return "baixo";
  return "";
}

function renderizar() {
  const termo = campoBusca.value;
  const produtos = filtrarProdutos(termo);

  if (produtos.length === 0) {
    listaEl.innerHTML = '<p class="sem-produtos">Nenhum produto cadastrado.</p>';
    btnVerMais.hidden = true;
    return;
  }

  const visiveis = produtos.slice(0, quantidadeVisivel);

  listaEl.innerHTML = visiveis
    .map((produto) => {
      const estoque = Number(produto.estoque) || 0;
      const unidade = rotulosUnidade[produto.unidade] || "un";

      return `
      <div class="item-estoque">
        <div class="item-estoque-topo">
          <div class="item-estoque-info">
            <b>${produto.nome}</b>
            <span>${produto.categoria || "Outros"}</span>
          </div>
          <div class="item-estoque-quantidade ${classeQuantidade(estoque)}">
            <b>${estoque.toLocaleString("pt-BR")}</b>
            <span>${unidade} em estoque</span>
          </div>
        </div>
        <div class="item-estoque-movimento">
          <input
            type="text"
            class="campo-movimento milhar"
            data-id="${produto.id}"
            inputmode="numeric"
            placeholder="Qtd"
          />
          <button type="button" class="btn-entrada" data-id="${produto.id}">Entrada</button>
          <button type="button" class="btn-saida" data-id="${produto.id}">Saída</button>
        </div>
      </div>`;
    })
    .join("");

  listaEl.querySelectorAll(".btn-entrada, .btn-saida").forEach((botao) => {
    botao.addEventListener("click", () => {
      const id = botao.dataset.id;
      const campo = listaEl.querySelector(`.campo-movimento[data-id="${id}"]`);
      const quantidade = parseInteiroBR(campo.value);

      if (!(quantidade > 0)) {
        campo.focus();
        return;
      }

      const delta = botao.classList.contains("btn-entrada") ? quantidade : -quantidade;
      ajustarEstoque(id, delta);
      renderizar();
    });
  });

  btnVerMais.hidden = produtos.length <= quantidadeVisivel;
}

campoBusca.addEventListener("input", () => {
  quantidadeVisivel = QUANTIDADE_POR_PAGINA;
  renderizar();
});

btnVerMais.addEventListener("click", () => {
  quantidadeVisivel += QUANTIDADE_POR_PAGINA;
  renderizar();
});

renderizar();
