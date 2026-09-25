import { carregarProdutos } from "./produtos.js";
import { registrarPerdaSobra, estornarPerdaSobra, listarPerdasPeriodo } from "./perdas-api.js";
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

function intervaloHoje() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return { inicioISO: inicio.toISOString(), fimISO: fim.toISOString() };
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
    await renderizarHistorico();
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível registrar a saída.");
  } finally {
    btnRegistrar.disabled = false;
  }
}

async function estornarRegistro(id) {
  const { inicioISO, fimISO } = intervaloHoje();
  const registros = await listarPerdasPeriodo(inicioISO, fimISO);
  const registro = registros.find((item) => item.id === id);
  if (!registro) return;

  if (!window.confirm(`Estornar a saída de ${registro.quantidade} de "${registro.nome_produto}"?`)) return;

  try {
    await estornarPerdaSobra(id);
    mostrarAviso("Movimentação estornada e estoque devolvido.", true);
    await carregarSelectProdutos(true);
    await renderizarHistorico();
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível estornar a movimentação.");
  }
}

async function renderizarHistorico() {
  const lista = document.getElementById("listaPerdas");
  lista.innerHTML = '<p class="sem-registros">Carregando movimentações...</p>';

  try {
    const { inicioISO, fimISO } = intervaloHoje();
    const registros = await listarPerdasPeriodo(inicioISO, fimISO);
    const total = registros.reduce((soma, item) => soma + (Number(item.custo_total) || 0), 0);
    document.getElementById("totalPerdasHoje").textContent = formatarMoeda(total);

    if (!registros.length) {
      lista.innerHTML = '<p class="sem-registros">Nenhuma perda ou sobra registrada hoje.</p>';
      return;
    }

    lista.innerHTML = registros.map((registro) => {
      const hora = new Date(registro.registrada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const tipo = registro.tipo === "sobra" ? "Sobra" : "Perda";
      const observacao = registro.observacao ? ` · ${escaparHTML(registro.observacao)}` : "";
      const produto = produtos.find((item) => item.id === registro.produto_id);
      const unidade = produto?.unidade || "un";

      return `
        <div class="perda-item">
          <div class="perda-principal">
            <b>${escaparHTML(registro.nome_produto)}</b>
            <span>${tipo} · ${formatarQuantidade(registro.quantidade)} ${escaparHTML(unidade)} · ${escaparHTML(registro.motivo || "Sem motivo")}${observacao}</span>
          </div>
          <div class="perda-valor">
            <b>− ${formatarMoeda(registro.custo_total)}</b>
            <small>${hora}</small>
          </div>
          <button class="btn-estornar" type="button" data-estornar="${registro.id}">Estornar</button>
        </div>`;
    }).join("");

    lista.querySelectorAll("[data-estornar]").forEach((botao) => {
      botao.addEventListener("click", () => estornarRegistro(botao.dataset.estornar));
    });
  } catch (erro) {
    lista.innerHTML = `<p class="sem-registros">${escaparHTML(erro?.message || "Não foi possível carregar as movimentações.")}</p>`;
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
    await renderizarHistorico();
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível carregar os dados.");
  }
}
