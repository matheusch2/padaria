import { exigirUsuario } from "./auth.js";

const botoesPeriodo = [...document.querySelectorAll("[data-periodo-financeiro]")];
const legendaPeriodo = document.getElementById("periodoFinanceiroLegenda");
const botoesCenario = [...document.querySelectorAll("[data-cenario]")];
const cenarioTitulo = document.getElementById("cenarioTitulo");

function inicioDoDia(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function formatarData(data, opcoes = {}) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...opcoes,
  }).format(data);
}

function legendaDoPeriodo(tipo) {
  const hoje = inicioDoDia(new Date());

  if (tipo === "hoje") {
    return `Hoje · ${formatarData(hoje, { year: "numeric" })}`;
  }

  if (tipo === "mes") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return `${formatarData(inicio)} — ${formatarData(fim, { year: "numeric" })}`;
  }

  if (tipo === "proximo") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
    return `${formatarData(inicio)} — ${formatarData(fim, { year: "numeric" })}`;
  }

  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + 89);
  return `${formatarData(hoje)} — ${formatarData(fim, { year: "numeric" })}`;
}

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
    legendaPeriodo.textContent = legendaDoPeriodo(botao.dataset.periodoFinanceiro);
  });
});

const nomesCenario = {
  conservador: "Cenário conservador",
  provavel: "Cenário provável",
  otimista: "Cenário otimista",
};

botoesCenario.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesCenario.forEach((item) => item.classList.toggle("ativo", item === botao));
    cenarioTitulo.textContent = nomesCenario[botao.dataset.cenario] || "Cenário provável";
  });
});

legendaPeriodo.textContent = legendaDoPeriodo("hoje");

await exigirUsuario();
