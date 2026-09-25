import { carregarProdutos } from "./produtos.js";
import { registrarPerdaSobra } from "./perdas-api.js";
import { exigirUsuario } from "./auth.js";

const produtoSelect = document.getElementById("produtoPerda");
const tipoSelect = document.getElementById("tipoSaida");
const quantidadeInput = document.getElementById("quantidadePerda");
const motivoSelect = document.getElementById("motivoPerda");
const observacaoInput = document.getElementById("observacaoPerda");
const aviso = document.getElementById("avisoPerda");
const btnRegistrar = document.getElementById("btnRegistrarPerda");
const semProdutos = document.getElementById("semProdutos");
const camposSaida = document.getElementById("camposSaida");

let produtos = [];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarQuantidade(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function lerQuantidade() {
  return Number(String(quantidadeInput.value || "").replace(/\D/g, "")) || 0;
}

function produtoSelecionado() {
  return produtos.find((produto) => produto.id === produtoSelect.value) || null;
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mostrarAviso(texto, sucesso = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

function esconderAviso() {
  aviso.hidden = true;
  aviso.classList.remove("sucesso");
}

function definirEstadoSemProdutos(semCadastro) {
  semProdutos.hidden = !semCadastro;
  camposSaida.hidden = semCadastro;
  produtoSelect.disabled = semCadastro;
  btnRegistrar.disabled = semCadastro;

  [tipoSelect, quantidadeInput, motivoSelect, observacaoInput].forEach((campo) => {
    campo.disabled = semCadastro;
  });
}

async function carregarSelectProdutos(manterSelecao = true) {
  const selecao = manterSelecao ? produtoSelect.value : "";
  produtos = await carregarProdutos();
  produtos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (!produtos.length) {
    produtoSelect.innerHTML = '<option value="">Nenhum produto cadastrado</option>';
    definirEstadoSemProdutos(true);
    atualizarResumoProduto();
    return;
  }

  definirEstadoSemProdutos(false);
  produtoSelect.innerHTML = '<option value="">Selecione um produto</option>' + produtos
    .map((produto) => `<option value="${produto.id}">${escaparHTML(produto.nome)}</option>`)
    .join("");

  if (selecao && produtos.some((produto) => produto.id === selecao)) produtoSelect.value = selecao;
  atualizarResumoProduto();
}

function atualizarResumoProduto() {
  const produto = produtoSelecionado();
  const resumo = document.getElementById("produtoResumo");
  const quantidade = lerQuantidade();

  if (!produto) {
    resumo.hidden = true;
    document.getElementById("impactoPerda").textContent = formatarMoeda(0);
    return;
  }

  resumo.hidden = false;
  document.getElementById("estoqueAtual").textContent = `${formatarQuantidade(produto.estoque)} ${produto.unidade || "un"}`;
  document.getElementById("custoUnitario").textContent = formatarMoeda(produto.custo);
  document.getElementById("impactoPerda").textContent = formatarMoeda((Number(produto.custo) || 0) * quantidade);
}

async function registrarSaida() {
  esconderAviso();
  const produto = produtoSelecionado();
  const quantidade = lerQuantidade();

  if (!produto) {
    mostrarAviso("Selecione um produto.");
    produtoSelect.focus();
    return;
  }

  if (!(quantidade > 0)) {
    mostrarAviso("Informe uma quantidade maior que zero.");
    quantidadeInput.focus();
    return;
  }

  const estoqueAtual = Number(produto.estoque) || 0;
  if (quantidade > estoqueAtual) {
    mostrarAviso(`A quantidade informada é maior que o estoque atual (${formatarQuantidade(estoqueAtual)} ${produto.unidade || "un"}).`);
    quantidadeInput.focus();
    return;
  }

  btnRegistrar.disabled = true;
  try {
    await registrarPerdaSobra({
      produtoId: produto.id,
      tipo: tipoSelect.value,
      quantidade,
      motivo: motivoSelect.value,
      observacao: observacaoInput.value.trim(),
    });

    quantidadeInput.value = "";
    observacaoInput.value = "";
    mostrarAviso("Saída registrada. O estoque e o resultado foram atualizados.", true);
    await carregarSelectProdutos(true);
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível registrar a saída.");
  } finally {
    btnRegistrar.disabled = false;
  }
}

produtoSelect.addEventListener("change", () => {
  esconderAviso();
  atualizarResumoProduto();
});
quantidadeInput.addEventListener("input", atualizarResumoProduto);
btnRegistrar.addEventListener("click", registrarSaida);

const usuario = await exigirUsuario();
if (usuario) {
  try {
    await carregarSelectProdutos(false);
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível carregar os dados.");
  }
}
