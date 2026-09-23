import {
  buscarProdutoPorId,
  salvarProduto,
  atualizarProduto,
  excluirProduto,
} from "./produtos.js";

const parametros = new URLSearchParams(window.location.search);
const idEdicao = parametros.get("id");
const produtoEmEdicao = idEdicao ? buscarProdutoPorId(idEdicao) : null;

const campoNome = document.getElementById("campoNome");
const campoCategoria = document.getElementById("campoCategoria");
const campoCusto = document.getElementById("campoCusto");
const campoPreco = document.getElementById("campoPreco");
const campoUnidade = document.getElementById("campoUnidade");
const aviso = document.getElementById("avisoFormulario");
const btnSalvar = document.getElementById("btnSalvar");
const btnExcluir = document.getElementById("btnExcluir");

function preencherFormulario(produto) {
  campoNome.value = produto.nome;
  campoCategoria.value = produto.categoria || "Outros";
  campoCusto.value = produto.custo ?? "";
  campoPreco.value = produto.preco;
  campoUnidade.value = produto.unidade || "un";
}

function mostrarAviso(texto, sucesso) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

if (produtoEmEdicao) {
  document.getElementById("tituloTela").textContent = "Editar Produto";
  document.title = "Editar produto - Padaria Gestão";
  btnSalvar.textContent = "Salvar Alterações";
  btnExcluir.hidden = false;
  preencherFormulario(produtoEmEdicao);
} else if (idEdicao) {
  mostrarAviso("Produto não encontrado.", false);
}

btnSalvar.addEventListener("click", () => {
  const nome = campoNome.value.trim();
  const custo = Number(campoCusto.value);
  const preco = Number(campoPreco.value);

  if (!nome) {
    mostrarAviso("Digite o nome do produto.", false);
    campoNome.focus();
    return;
  }

  if (campoCusto.value.trim() === "" || custo < 0) {
    mostrarAviso("Informe o preço de custo.", false);
    campoCusto.focus();
    return;
  }

  if (!(preco > 0)) {
    mostrarAviso("Informe um preço de venda válido.", false);
    campoPreco.focus();
    return;
  }

  const dados = {
    nome,
    categoria: campoCategoria.value,
    custo,
    preco,
    unidade: campoUnidade.value,
  };

  if (produtoEmEdicao) {
    atualizarProduto(produtoEmEdicao.id, dados);
    window.location.href = "produtos.html";
    return;
  }

  salvarProduto(dados);
  mostrarAviso("Produto salvo com sucesso!", true);
  campoNome.value = "";
  campoCusto.value = "";
  campoPreco.value = "";
  campoCategoria.value = "Pães";
  campoUnidade.value = "un";
  campoNome.focus();
});

btnExcluir.addEventListener("click", () => {
  if (!produtoEmEdicao) return;
  if (!window.confirm(`Excluir "${produtoEmEdicao.nome}"?`)) return;

  excluirProduto(produtoEmEdicao.id);
  window.location.href = "produtos.html";
});
