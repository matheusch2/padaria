import { dataLocalISO, intervaloPorTipo } from "./relatorios-dados.js";

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) throw new Error("Escolha uma data válida.");
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  if (dataLocalISO(data) !== valor) throw new Error("Escolha uma data válida.");
  return data;
}

export function periodoDeVendas(modo, referencia, final = referencia) {
  const inicio = dataValida(referencia);
  let fim = new Date(inicio);
  if (modo === "semanal") {
    inicio.setDate(inicio.getDate() - (inicio.getDay() + 6) % 7);
    fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
  } else if (modo === "mensal") {
    inicio.setDate(1);
    fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
  } else if (modo === "personalizado") {
    fim = dataValida(final);
  } else if (modo !== "diario") {
    throw new Error("Selecione um período válido.");
  }
  return intervaloPorTipo("personalizado", dataLocalISO(inicio), dataLocalISO(fim));
}

export function agruparVendasPorDia(vendas, campoData = "realizada_em") {
  const dias = new Map();
  for (const venda of vendas) {
    const data = new Date(venda[campoData]);
    const chave = Number.isNaN(data.getTime()) ? "" : dataLocalISO(data);
    if (!dias.has(chave)) dias.set(chave, []);
    dias.get(chave).push(venda);
  }
  return [...dias.entries()].sort(([a], [b]) => b.localeCompare(a));
}
