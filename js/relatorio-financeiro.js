import { exigirUsuario } from "./auth.js";
import { gerarRecorrentesPendentes, listarLancamentos } from "./financeiro-api.js";
import { listarVendasPeriodo } from "./vendas-api.js";

const resultadoReceitaEl = document.getElementById("resultadoReceita");
const resultadoCustosEl = document.getElementById("resultadoCustos");
const resultadoDespesasEl = document.getElementById("resultadoDespesas");
const resultadoLiquidoEl = document.getElementById("resultadoLiquido");
const linhaLucroLiquidoEl = document.getElementById("linhaLucroLiquido");
const margemLiquidaEl = document.getElementById("margemLiquida");
const listaCategoriasEl = document.getElementById("listaCategorias");
const legendaPeriodoEl = document.getElementById("legendaPeriodoRelatorio");
const botoesPeriodo = [...document.querySelectorAll("[data-periodo]")];
const btnImprimir = document.getElementById("btnImprimir");

let periodoAtivo = "mes";

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataCurta(data) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
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

  if (periodo === "mes-passado") {
    return {
      inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1),
      fim: new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59),
    };
  }

  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 89);
  const fim = new Date(hoje);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

async function carregar() {
  listaCategoriasEl.innerHTML = `<p class="categorias-vazio">Carregando...</p>`;

  try {
    const { inicio, fim } = limitesDoPeriodo(periodoAtivo);
    legendaPeriodoEl.textContent = `${formatarDataCurta(inicio)} — ${formatarDataCurta(fim)}`;

    const inicioISO = inicio.toISOString().slice(0, 10);
    const fimISO = new Date(fim.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [vendas, lancamentosPagos] = await Promise.all([
      listarVendasPeriodo(inicio.toISOString(), fim.toISOString()),
      listarLancamentos({ status: "pago", inicio: inicioISO, fim: fimISO }),
    ]);

    const receitaVendas = vendas.reduce((soma, venda) => soma + Number(venda.total || 0), 0);
    const receitaLancamentos = lancamentosPagos
      .filter((item) => item.tipo === "receber")
      .reduce((soma, item) => soma + Number(item.valor), 0);
    const receita = receitaVendas + receitaLancamentos;

    const custoProdutos = vendas
      .flatMap((venda) => venda.itens_venda || [])
      .reduce((soma, item) => soma + Number(item.custo_unitario || 0) * Number(item.quantidade || 0), 0);

    const despesasPorCategoria = new Map();
    let despesasTotal = 0;

    lancamentosPagos
      .filter((item) => item.tipo === "pagar")
      .forEach((item) => {
        const categoria = item.categoria || "Sem categoria";
        despesasPorCategoria.set(categoria, (despesasPorCategoria.get(categoria) || 0) + Number(item.valor));
        despesasTotal += Number(item.valor);
      });

    const lucroLiquido = receita - custoProdutos - despesasTotal;
    const margem = receita > 0 ? (lucroLiquido / receita) * 100 : 0;

    resultadoReceitaEl.textContent = formatarMoeda(receita);
    resultadoCustosEl.textContent = `− ${formatarMoeda(custoProdutos)}`;
    resultadoDespesasEl.textContent = `− ${formatarMoeda(despesasTotal)}`;
    resultadoLiquidoEl.textContent = formatarMoeda(lucroLiquido);
    linhaLucroLiquidoEl.classList.toggle("negativo", lucroLiquido < 0);
    margemLiquidaEl.textContent = `${margem.toFixed(1)}%`;

    if (despesasPorCategoria.size === 0) {
      listaCategoriasEl.innerHTML = `<p class="categorias-vazio">Nenhuma despesa paga neste período.</p>`;
      return;
    }

    const maiorValor = Math.max(...despesasPorCategoria.values());
    const ordenadas = [...despesasPorCategoria.entries()].sort((a, b) => b[1] - a[1]);

    listaCategoriasEl.innerHTML = ordenadas
      .map(([categoria, valor]) => {
        const largura = maiorValor > 0 ? Math.max(6, (valor / maiorValor) * 100) : 0;
        return `
        <div class="categoria-barra-item">
          <div class="categoria-barra-cabecalho">
            <span>${escaparHTML(categoria)}</span>
            <b>${formatarMoeda(valor)}</b>
          </div>
          <div class="categoria-barra-trilha">
            <span class="categoria-barra-preenchimento" style="width:${largura}%"></span>
          </div>
        </div>`;
      })
      .join("");
  } catch (erro) {
    listaCategoriasEl.innerHTML = `<p class="categorias-vazio">${escaparHTML(erro?.message || "Não foi possível gerar o relatório.")}</p>`;
  }
}

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
    periodoAtivo = botao.dataset.periodo;
    carregar();
  });
});

btnImprimir.addEventListener("click", () => window.print());

const usuario = await exigirUsuario();
if (usuario) {
  try {
    await gerarRecorrentesPendentes();
  } catch (erro) {
    console.error(erro);
  }
  await carregar();
}
