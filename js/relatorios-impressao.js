import { exigirUsuario } from "./auth.js";

const botoesPeriodo = [...document.querySelectorAll("[data-periodo-impressao]")];
const periodoPersonalizado = document.getElementById("periodoImpressaoPersonalizado");
const dataInicial = document.getElementById("dataInicialImpressao");
const dataFinal = document.getElementById("dataFinalImpressao");
const periodoLegenda = document.getElementById("periodoImpressaoLegenda");
const documentos = [...document.querySelectorAll("[data-documento]")];
const documentoSelecionado = document.getElementById("documentoSelecionado");
const btnPrepararRelatorio = document.getElementById("btnPrepararRelatorio");
const avisoImpressao = document.getElementById("avisoImpressao");

function dataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataCurta(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(data);
}

function atualizarLegenda(tipo) {
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

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
    const tipo = botao.dataset.periodoImpressao;
    periodoPersonalizado.hidden = tipo !== "personalizado";
    atualizarLegenda(tipo);
  });
});

[dataInicial, dataFinal].forEach((campo) => {
  campo.addEventListener("change", () => atualizarLegenda("personalizado"));
});

documentos.forEach((card) => {
  card.addEventListener("click", () => {
    documentos.forEach((item) => item.classList.toggle("selecionado", item === card));
    documentoSelecionado.textContent = card.dataset.documento;
    btnPrepararRelatorio.disabled = false;
    avisoImpressao.textContent = "Seleção pronta. A geração com dados reais será conectada na próxima etapa.";
  });
});

btnPrepararRelatorio.addEventListener("click", () => {
  avisoImpressao.textContent = "A visualização e o PDF ainda não foram conectados. A estrutura visual já está pronta.";
});

const hoje = new Date();
const haTrintaDias = new Date(hoje);
haTrintaDias.setDate(haTrintaDias.getDate() - 29);
dataInicial.value = dataISO(haTrintaDias);
dataFinal.value = dataISO(hoje);
atualizarLegenda("hoje");

await exigirUsuario();
