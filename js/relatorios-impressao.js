import { exigirUsuario } from "./auth.js";
import { dataLocalISO, intervaloPorTipo } from "./relatorios-dados.js";

const botoesPeriodo = [...document.querySelectorAll("[data-periodo-impressao]")];
const periodoPersonalizado = document.getElementById("periodoImpressaoPersonalizado");
const dataInicial = document.getElementById("dataInicialImpressao");
const dataFinal = document.getElementById("dataFinalImpressao");
const periodoLegenda = document.getElementById("periodoImpressaoLegenda");
const documentos = [...document.querySelectorAll("[data-documento]")];
const documentoSelecionado = document.getElementById("documentoSelecionado");
const btnPrepararRelatorio = document.getElementById("btnPrepararRelatorio");
const avisoImpressao = document.getElementById("avisoImpressao");

const TIPOS = {
  "Vendas": { slug: "vendas", nome: "Relatório de vendas" },
  "Perdas e sobras": { slug: "perdas", nome: "Relatório de perdas e sobras" },
  "Estoque": { slug: "estoque", nome: "Relatório de estoque" },
  "Fechamento do caixa": { slug: "fechamento", nome: "Relatório de fechamento do caixa" },
  "Produtos e lucratividade": { slug: "produtos", nome: "Produtos e lucratividade" },
};

let periodoAtual = "hoje";
let documentoAtual = null;

function formatarDataCurta(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(data);
}

function atualizarLegenda(tipo) {
  try {
    const intervalo = intervaloPorTipo(tipo, dataInicial.value, dataFinal.value);
    if (tipo === "hoje") {
      periodoLegenda.textContent = `Hoje · ${formatarDataCurta(intervalo.inicio)}`;
    } else if (tipo === "ontem") {
      periodoLegenda.textContent = `Ontem · ${formatarDataCurta(intervalo.inicio)}`;
    } else {
      periodoLegenda.textContent = `${formatarDataCurta(intervalo.inicio)} — ${formatarDataCurta(intervalo.fimInclusivo)}`;
    }
    avisoImpressao.textContent = documentoAtual
      ? "Pronto para gerar com os dados reais do período selecionado."
      : "Toque em um relatório para abrir a visualização.";
  } catch (erro) {
    periodoLegenda.textContent = erro?.message || "Escolha as datas do período";
    avisoImpressao.textContent = erro?.message || "Período inválido.";
  }
}

function atualizarBotao() {
  if (!documentoAtual) {
    btnPrepararRelatorio.disabled = true;
    return;
  }

  try {
    intervaloPorTipo(periodoAtual, dataInicial.value, dataFinal.value);
    btnPrepararRelatorio.disabled = false;
  } catch {
    btnPrepararRelatorio.disabled = true;
  }
}

function abrirRelatorio(tipo = documentoAtual) {
  if (!tipo) return;

  try {
    const intervalo = intervaloPorTipo(periodoAtual, dataInicial.value, dataFinal.value);
    const query = new URLSearchParams({
      tipo: tipo.slug,
      inicio: intervalo.inicioData,
      fim: intervalo.fimData,
    });
    window.location.href = `relatorio-gerado.html?${query.toString()}`;
  } catch (erro) {
    avisoImpressao.textContent = erro?.message || "Não foi possível preparar o relatório.";
  }
}

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
    periodoAtual = botao.dataset.periodoImpressao;
    periodoPersonalizado.hidden = periodoAtual !== "personalizado";
    atualizarLegenda(periodoAtual);
    atualizarBotao();
  });
});

[dataInicial, dataFinal].forEach((campo) => {
  campo.addEventListener("change", () => {
    atualizarLegenda("personalizado");
    atualizarBotao();
  });
});

documentos.forEach((card) => {
  card.addEventListener("click", () => {
    documentos.forEach((item) => item.classList.toggle("selecionado", item === card));
    documentoAtual = TIPOS[card.dataset.documento] || null;
    documentoSelecionado.textContent = documentoAtual?.nome || "Nenhum";
    atualizarBotao();

    if (documentoAtual) {
      avisoImpressao.textContent = "Abrindo relatório com os dados do período selecionado...";
      abrirRelatorio(documentoAtual);
    }
  });
});

btnPrepararRelatorio.addEventListener("click", () => abrirRelatorio());

const hoje = new Date();
const haTrintaDias = new Date(hoje);
haTrintaDias.setDate(haTrintaDias.getDate() - 29);
dataInicial.value = dataLocalISO(haTrintaDias);
dataFinal.value = dataLocalISO(hoje);
atualizarLegenda("hoje");

await exigirUsuario();
