import {
  buscarProdutoPorId,
  salvarProduto,
  atualizarProduto,
  excluirProduto,
} from "./produtos.js";
import { exigirUsuario } from "./auth.js";

const parametros = new URLSearchParams(window.location.search);
const idEdicao = parametros.get("id");
let produtoEmEdicao = null;

const campoNome = document.getElementById("campoNome");
const campoCategoria = document.getElementById("campoCategoria");
const campoCusto = document.getElementById("campoCusto");
const campoPreco = document.getElementById("campoPreco");
const campoUnidade = document.getElementById("campoUnidade");
const campoEstoque = document.getElementById("campoEstoque");
const rotuloEstoque = document.getElementById("rotuloEstoque");
const aviso = document.getElementById("avisoFormulario");
const btnSalvar = document.getElementById("btnSalvar");
const btnExcluir = document.getElementById("btnExcluir");

function formatarComoMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function preencherFormulario(produto) {
  campoNome.value = produto.nome;
  campoCategoria.value = produto.categoria || "Outros";
  campoCusto.value = produto.custo != null ? formatarComoMoeda(produto.custo) : "";
  campoPreco.value = formatarComoMoeda(produto.preco);
  campoUnidade.value = produto.unidade || "un";
  campoEstoque.value = Number(produto.estoque || 0).toLocaleString("pt-BR");
  rotuloEstoque.textContent = "Estoque atual";
}

function mostrarAviso(texto, sucesso) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

function bloquearFormulario(estado) {
  btnSalvar.disabled = estado;
  btnExcluir.disabled = estado;
}

async function carregarEdicao() {
  if (!idEdicao) return;
  try {
    produtoEmEdicao = await buscarProdutoPorId(idEdicao);
    if (!produtoEmEdicao) {
      mostrarAviso("Produto não encontrado.", false);
      return;
    }

    document.getElementById("tituloTela").textContent = "Editar Produto";
    document.title = "Editar produto - Padaria Gestão";
    btnSalvar.textContent = "Salvar Alterações";
    btnExcluir.hidden = false;
    preencherFormulario(produtoEmEdicao);
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível carregar o produto.", false);
  }
}

btnSalvar.addEventListener("click", async () => {
  const nome = campoNome.value.trim();
  const custo = parseMoedaBR(campoCusto.value);
  const preco = parseMoedaBR(campoPreco.value);

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
    estoque: Math.max(0, parseInteiroBR(campoEstoque.value)),
  };

  bloquearFormulario(true);
  try {
    if (produtoEmEdicao) {
      await atualizarProduto(produtoEmEdicao.id, dados);
      window.location.href = "produtos.html";
      return;
    }

    await salvarProduto(dados);
    mostrarAviso("Produto salvo no banco com sucesso!", true);
    campoNome.value = "";
    campoCusto.value = "";
    campoPreco.value = "";
    campoCategoria.value = "Pães";
    campoUnidade.value = "un";
    campoEstoque.value = "";
    campoNome.focus();
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível salvar o produto.", false);
  } finally {
    bloquearFormulario(false);
  }
});

btnExcluir.addEventListener("click", async () => {
  if (!produtoEmEdicao) return;
  if (!window.confirm(`Excluir "${produtoEmEdicao.nome}"?`)) return;

  bloquearFormulario(true);
  try {
    await excluirProduto(produtoEmEdicao.id);
    window.location.href = "produtos.html";
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível excluir o produto.", false);
  } finally {
    bloquearFormulario(false);
  }
});

const usuario = await exigirUsuario();
if (usuario) await carregarEdicao();
