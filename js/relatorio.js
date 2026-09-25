import { exigirUsuario } from "./auth.js";

const estiloProdutos = document.createElement("link");
estiloProdutos.rel = "stylesheet";
estiloProdutos.href = "desempenho-produtos.css?v=20260925-1";
document.head.appendChild(estiloProdutos);

const botoesPeriodo = [...document.querySelectorAll("[data-periodo]")];
const periodoPersonalizado = document.getElementById("periodoPersonalizado");
const dataInicial = document.getElementById("dataInicialRelatorio");
const dataFinal = document.getElementById("dataFinalRelatorio");
const periodoLegenda = document.getElementById("periodoLegenda");
const botoesRanking = [...document.querySelectorAll("[data-ranking]")];

function formatarDataCurta(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(data);
}

function dataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function atualizarLegendaPeriodo(tipo) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (tipo === "hoje") {
    periodoLegenda.textContent = `Hoje · ${formatarDataCurta(hoje)}`;
    return;
  }

  if (tipo === "ontem") {
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    periodoLegenda.textContent = `Ontem · ${formatarDataCurta(ontem)}`;
    return;
  }

  if (tipo === "7" || tipo === "30") {
    const dias = Number(tipo);
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - (dias - 1));
    periodoLegenda.textContent = `${formatarDataCurta(inicio)} — ${formatarDataCurta(hoje)}`;
    return;
  }

  const inicio = dataInicial.value ? new Date(`${dataInicial.value}T00:00:00`) : null;
  const fim = dataFinal.value ? new Date(`${dataFinal.value}T00:00:00`) : null;
  periodoLegenda.textContent = inicio && fim
    ? `${formatarDataCurta(inicio)} — ${formatarDataCurta(fim)}`
    : "Escolha as datas do período";
}

function selecionarPeriodo(botao) {
  botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
  const tipo = botao.dataset.periodo;
  periodoPersonalizado.hidden = tipo !== "personalizado";
  atualizarLegendaPeriodo(tipo);
}

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => selecionarPeriodo(botao));
});

[dataInicial, dataFinal].forEach((campo) => {
  campo.addEventListener("change", () => atualizarLegendaPeriodo("personalizado"));
});

botoesRanking.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesRanking.forEach((item) => item.classList.toggle("ativo", item === botao));
  });
});

const hoje = new Date();
const haTrintaDias = new Date(hoje);
haTrintaDias.setDate(haTrintaDias.getDate() - 29);
dataInicial.value = dataISO(haTrintaDias);
dataFinal.value = dataISO(hoje);
atualizarLegendaPeriodo("hoje");

await exigirUsuario();
