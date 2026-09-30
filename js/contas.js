import { exigirUsuario } from "./auth.js";
import {
  gerarRecorrentesPendentes,
  listarLancamentos,
  criarLancamento,
  marcarComoPago,
  excluirLancamento,
} from "./financeiro-api.js";

const parametros = new URLSearchParams(window.location.search);
const tipo = parametros.get("tipo") === "receber" ? "receber" : "pagar";

const categoriasPorTipo = {
  pagar: ["Aluguel", "Fornecedores", "Salários", "Contas (água/luz/internet)", "Manutenção", "Impostos", "Outros"],
  receber: ["Venda a prazo", "Encomenda", "Serviço", "Outros"],
};

const textos = {
  pagar: {
    titulo: "Contas a pagar",
    novaConta: "Nova conta a pagar",
    pessoa: "Fornecedor",
    vencimento: "Vencimento",
    jaPago: "Já foi pago",
    marcarPago: "Marcar como pago",
    vazio: "Nenhuma conta a pagar por aqui.",
  },
  receber: {
    titulo: "Contas a receber",
    novaConta: "Nova conta a receber",
    pessoa: "Cliente",
    vencimento: "Vencimento",
    jaPago: "Já foi recebido",
    marcarPago: "Marcar como recebido",
    vazio: "Nenhuma conta a receber por aqui.",
  },
};

const t = textos[tipo];

document.getElementById("tituloAba").textContent = `${t.titulo} - Padaria Gestão`;
document.getElementById("tituloTela").textContent = t.titulo;
document.getElementById("rotuloBtnNova").textContent = t.novaConta;
document.getElementById("rotuloPessoa").textContent = t.pessoa;
document.getElementById("rotuloVencimento").textContent = t.vencimento;
document.getElementById("rotuloJaPago").textContent = t.jaPago;

const campoCategoria = document.getElementById("campoCategoria");
categoriasPorTipo[tipo].forEach((categoria) => {
  const opcao = document.createElement("option");
  opcao.value = categoria;
  opcao.textContent = categoria;
  campoCategoria.appendChild(opcao);
});

const listaEl = document.getElementById("listaContas");
const totalAtrasadoEl = document.getElementById("totalAtrasado");
const qtdAtrasadoEl = document.getElementById("qtdAtrasado");
const totalPendenteEl = document.getElementById("totalPendente");
const qtdPendenteEl = document.getElementById("qtdPendente");
const botoesFiltro = [...document.querySelectorAll("[data-filtro]")];

const formNovaConta = document.getElementById("formNovaConta");
const btnNovaConta = document.getElementById("btnNovaConta");
const btnCancelarConta = document.getElementById("btnCancelarConta");
const btnSalvarConta = document.getElementById("btnSalvarConta");
const avisoContaForm = document.getElementById("avisoContaForm");

let filtroAtivo = "abertas";
let lancamentosCache = [];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function inicioDoDia() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function estaAtrasada(lancamento) {
  if (lancamento.status !== "pendente") return false;
  const vencimento = new Date(`${lancamento.vencimento}T00:00:00`);
  return vencimento < inicioDoDia();
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconeLixeira() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>`;
}

function atualizarResumo() {
  const abertos = lancamentosCache.filter((item) => item.status === "pendente");
  const atrasados = abertos.filter(estaAtrasada);
  const aVencer = abertos.filter((item) => !estaAtrasada(item));

  totalAtrasadoEl.textContent = formatarMoeda(atrasados.reduce((soma, item) => soma + Number(item.valor), 0));
  qtdAtrasadoEl.textContent = `${atrasados.length} conta${atrasados.length === 1 ? "" : "s"}`;
  totalPendenteEl.textContent = formatarMoeda(aVencer.reduce((soma, item) => soma + Number(item.valor), 0));
  qtdPendenteEl.textContent = `${aVencer.length} conta${aVencer.length === 1 ? "" : "s"}`;
}

function filtrarParaExibicao() {
  if (filtroAtivo === "pagas") return lancamentosCache.filter((item) => item.status === "pago");
  if (filtroAtivo === "todas") return lancamentosCache;
  return lancamentosCache.filter((item) => item.status === "pendente");
}

function renderizarLista() {
  const itens = filtrarParaExibicao();

  if (itens.length === 0) {
    listaEl.innerHTML = `<p class="sem-contas">${t.vazio}</p>`;
    return;
  }

  listaEl.innerHTML = itens
    .map((item) => {
      const atrasada = estaAtrasada(item);
      const meta = [item.categoria, item.pessoa].filter(Boolean).join(" · ");
      const dataRotulo = item.status === "pago" ? "Pago" : atrasada ? "Venceu" : "Vence";

      return `
      <div class="lancamento-item">
        <div class="lancamento-info">
          <b>${escaparHTML(item.descricao)}</b>
          <span>${escaparHTML(meta || "Sem categoria")}</span>
          <span class="lancamento-vencimento${atrasada ? " atrasado" : ""}">${dataRotulo} ${formatarData(item.vencimento)}</span>
        </div>
        <div class="lancamento-acao">
          <b>${formatarMoeda(item.valor)}</b>
          ${
            item.status === "pendente"
              ? `<button type="button" class="lancamento-marcar-pago" data-id="${item.id}">${t.marcarPago}</button>`
              : `<button type="button" class="lancamento-excluir" data-id="${item.id}" aria-label="Excluir">${iconeLixeira()}</button>`
          }
        </div>
      </div>`;
    })
    .join("");

  listaEl.querySelectorAll(".lancamento-marcar-pago").forEach((botao) => {
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      try {
        await marcarComoPago(botao.dataset.id);
        await carregar();
      } catch (erro) {
        window.alert(erro?.message || "Não foi possível marcar como pago.");
        botao.disabled = false;
      }
    });
  });

  listaEl.querySelectorAll(".lancamento-excluir").forEach((botao) => {
    botao.addEventListener("click", async () => {
      if (!window.confirm("Excluir este lançamento?")) return;
      botao.disabled = true;
      try {
        await excluirLancamento(botao.dataset.id);
        await carregar();
      } catch (erro) {
        window.alert(erro?.message || "Não foi possível excluir.");
        botao.disabled = false;
      }
    });
  });
}

async function carregar() {
  listaEl.innerHTML = `<p class="sem-contas">Carregando...</p>`;
  try {
    lancamentosCache = await listarLancamentos({ tipo });
    atualizarResumo();
    renderizarLista();
  } catch (erro) {
    listaEl.innerHTML = `<p class="sem-contas">${escaparHTML(erro?.message || "Não foi possível carregar.")}</p>`;
  }
}

botoesFiltro.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesFiltro.forEach((item) => item.classList.toggle("ativo", item === botao));
    filtroAtivo = botao.dataset.filtro;
    renderizarLista();
  });
});

function limparFormulario() {
  document.getElementById("campoDescricao").value = "";
  campoCategoria.value = categoriasPorTipo[tipo][0];
  document.getElementById("campoPessoa").value = "";
  document.getElementById("campoValor").value = "";
  document.getElementById("campoVencimento").value = "";
  document.getElementById("campoJaPago").checked = false;
  avisoContaForm.hidden = true;
}

btnNovaConta.addEventListener("click", () => {
  formNovaConta.hidden = false;
  btnNovaConta.hidden = true;
  document.getElementById("campoVencimento").value = new Date().toISOString().slice(0, 10);
  formNovaConta.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

btnCancelarConta.addEventListener("click", () => {
  formNovaConta.hidden = true;
  btnNovaConta.hidden = false;
  limparFormulario();
});

btnSalvarConta.addEventListener("click", async () => {
  const descricao = document.getElementById("campoDescricao").value.trim();
  const valor = parseMoedaBR(document.getElementById("campoValor").value);
  const vencimento = document.getElementById("campoVencimento").value;

  avisoContaForm.hidden = true;

  if (!descricao) {
    avisoContaForm.textContent = "Digite uma descrição.";
    avisoContaForm.hidden = false;
    return;
  }

  if (!(valor > 0)) {
    avisoContaForm.textContent = "Informe um valor válido.";
    avisoContaForm.hidden = false;
    return;
  }

  if (!vencimento) {
    avisoContaForm.textContent = "Escolha a data de vencimento.";
    avisoContaForm.hidden = false;
    return;
  }

  btnSalvarConta.disabled = true;
  try {
    await criarLancamento({
      tipo,
      descricao,
      categoria: campoCategoria.value,
      pessoa: document.getElementById("campoPessoa").value.trim(),
      valor,
      vencimento,
      jaPago: document.getElementById("campoJaPago").checked,
    });

    formNovaConta.hidden = true;
    btnNovaConta.hidden = false;
    limparFormulario();
    await carregar();
  } catch (erro) {
    avisoContaForm.textContent = erro?.message || "Não foi possível salvar.";
    avisoContaForm.hidden = false;
  } finally {
    btnSalvarConta.disabled = false;
  }
});

const usuario = await exigirUsuario();
if (usuario) {
  try {
    await gerarRecorrentesPendentes();
  } catch (erro) {
    console.error(erro);
  }
  await carregar();
}
