import { exigirUsuario } from "./auth.js";
import { gerarRecorrentesPendentes, listarLancamentos } from "./financeiro-api.js";
import { listarVendasPeriodo } from "./vendas-api.js";

const totalEntradasEl = document.getElementById("totalEntradas");
const totalSaidasEl = document.getElementById("totalSaidas");
const totalSaldoEl = document.getElementById("totalSaldoFluxo");
const projecaoReceberEl = document.getElementById("projecaoReceber");
const projecaoPagarEl = document.getElementById("projecaoPagar");
const projecaoSaldoEl = document.getElementById("projecaoSaldo");
const listaExtratoEl = document.getElementById("listaExtrato");
const botoesPeriodo = [...document.querySelectorAll("[data-periodo]")];

let periodoAtivo = "30";

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataCurta(data) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(data);
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inicioDoDia(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function limitesDoPeriodo(periodo) {
  const hoje = inicioDoDia(new Date());

  if (periodo === "mes") {
    return {
      inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
      fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  const dias = Number(periodo);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - (dias - 1));
  const fim = new Date(hoje);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

async function carregar() {
  listaExtratoEl.innerHTML = `<p class="sem-contas">Carregando...</p>`;

  try {
    const { inicio, fim } = limitesDoPeriodo(periodoAtivo);
    const inicioISO = inicio.toISOString().slice(0, 10);
    const fimISO = new Date(fim.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [vendas, lancamentosPagos] = await Promise.all([
      listarVendasPeriodo(inicio.toISOString(), fim.toISOString()),
      listarLancamentos({ status: "pago", inicio: inicioISO, fim: fimISO }),
    ]);

    const entradasVendas = vendas.reduce((soma, venda) => soma + Number(venda.total || 0), 0);
    const entradasLancamentos = lancamentosPagos
      .filter((item) => item.tipo === "receber")
      .reduce((soma, item) => soma + Number(item.valor), 0);
    const saidas = lancamentosPagos
      .filter((item) => item.tipo === "pagar")
      .reduce((soma, item) => soma + Number(item.valor), 0);

    const totalEntradas = entradasVendas + entradasLancamentos;
    const saldoPeriodo = totalEntradas - saidas;

    totalEntradasEl.textContent = formatarMoeda(totalEntradas);
    totalSaidasEl.textContent = formatarMoeda(saidas);
    totalSaldoEl.textContent = formatarMoeda(saldoPeriodo);
    totalSaldoEl.style.color = saldoPeriodo < 0 ? "rgb(var(--erro))" : "";

    const hojeISO = new Date().toISOString().slice(0, 10);
    const em30DiasISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const pendentes = await listarLancamentos({ status: "pendente", inicio: hojeISO, fim: em30DiasISO });
    const aReceber = pendentes.filter((item) => item.tipo === "receber").reduce((s, i) => s + Number(i.valor), 0);
    const aPagar = pendentes.filter((item) => item.tipo === "pagar").reduce((s, i) => s + Number(i.valor), 0);

    projecaoReceberEl.textContent = `+ ${formatarMoeda(aReceber)}`;
    projecaoPagarEl.textContent = `- ${formatarMoeda(aPagar)}`;
    const saldoProjetado = saldoPeriodo + aReceber - aPagar;
    projecaoSaldoEl.textContent = formatarMoeda(saldoProjetado);
    projecaoSaldoEl.style.color = saldoProjetado < 0 ? "rgb(var(--erro))" : "rgb(var(--sucesso))";

    const itensExtrato = [
      ...vendas.map((venda) => ({
        data: venda.realizada_em,
        descricao: "Venda no balcão",
        valor: Number(venda.total || 0),
        entrada: true,
      })),
      ...lancamentosPagos.map((item) => ({
        data: item.pago_em || item.vencimento,
        descricao: item.descricao,
        valor: Number(item.valor),
        entrada: item.tipo === "receber",
      })),
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    if (itensExtrato.length === 0) {
      listaExtratoEl.innerHTML = `<p class="sem-contas">Nenhuma movimentação neste período.</p>`;
      return;
    }

    listaExtratoEl.innerHTML = itensExtrato
      .map(
        (item) => `
      <div class="extrato-item">
        <div class="extrato-info">
          <b>${escaparHTML(item.descricao)}</b>
          <span>${formatarDataCurta(new Date(item.data))}</span>
        </div>
        <div class="extrato-valor">
          <b class="${item.entrada ? "entrada" : "saida"}">${item.entrada ? "+" : "−"} ${formatarMoeda(item.valor)}</b>
        </div>
      </div>`,
      )
      .join("");
  } catch (erro) {
    listaExtratoEl.innerHTML = `<p class="sem-contas">${escaparHTML(erro?.message || "Não foi possível carregar o fluxo de caixa.")}</p>`;
  }
}

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
    periodoAtivo = botao.dataset.periodo;
    carregar();
  });
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
