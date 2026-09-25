import { exigirUsuario } from "./auth.js";
import { listarVendasPeriodo } from "./vendas-api.js";
import { listarPerdasPeriodo } from "./perdas-api.js";
import {
  agruparProdutos,
  dataLocalISO,
  formatarMoeda,
  intervaloAnterior,
  intervaloPorTipo,
  numero,
  resumirPeriodo,
  resumirPorDia,
  serieFaturamento,
} from "./relatorios-dados.js";

const estiloProdutos = document.createElement("link");
estiloProdutos.rel = "stylesheet";
estiloProdutos.href = "desempenho-produtos.css?v=20260925-3";
document.head.appendChild(estiloProdutos);

const botoesPeriodo = [...document.querySelectorAll("[data-periodo]")];
const periodoPersonalizado = document.getElementById("periodoPersonalizado");
const dataInicial = document.getElementById("dataInicialRelatorio");
const dataFinal = document.getElementById("dataFinalRelatorio");
const periodoLegenda = document.getElementById("periodoLegenda");
const botoesRanking = [...document.querySelectorAll("[data-ranking]")];

const elementos = {
  faturamento: document.getElementById("relatorioFaturamento"),
  variacao: document.getElementById("variacaoFaturamento"),
  qtdVendas: document.getElementById("relatorioQtdVendas"),
  ticket: document.getElementById("relatorioTicketMedio"),
  resultado: document.getElementById("relatorioResultadoBruto"),
  margem: document.getElementById("relatorioMargemBruta"),
  custo: document.getElementById("relatorioCustoVendido"),
  perdas: document.getElementById("relatorioPerdas"),
  graficoEvolucao: document.getElementById("graficoEvolucao"),
  graficoEvolucaoLegenda: document.getElementById("graficoEvolucaoLegenda"),
  graficoPagamentos: document.getElementById("graficoPagamentos"),
  pagamentosTotal: document.getElementById("pagamentosTotal"),
  dinheiroPct: document.getElementById("pagamentoDinheiroPercentual"),
  dinheiroValor: document.getElementById("pagamentoDinheiroValor"),
  pixPct: document.getElementById("pagamentoPixPercentual"),
  pixValor: document.getElementById("pagamentoPixValor"),
  cartaoPct: document.getElementById("pagamentoCartaoPercentual"),
  cartaoValor: document.getElementById("pagamentoCartaoValor"),
  ranking: document.getElementById("rankingProdutos"),
  resumoDiario: document.getElementById("resumoDiarioTabela"),
  historico: document.getElementById("historicoVendasRelatorio"),
  historicoContagem: document.getElementById("historicoContagem"),
  historicoMais: document.getElementById("btnHistoricoMais"),
};

let periodoAtual = "hoje";
let produtosAtuais = [];
let rankingAtual = "quantidade";
let carregamentoId = 0;
let vendasAtuais = [];
let historicoExpandido = false;

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarDataCurta(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(data);
}

function formatarQuantidade(valor) {
  return numero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatarDataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarValorGrafico(valor) {
  const n = numero(valor);
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return n.toLocaleString("pt-BR", {
    maximumFractionDigits: n < 100 ? 1 : 0,
  });
}

function atualizarLegendaPeriodo(tipo) {
  try {
    const intervalo = intervaloPorTipo(tipo, dataInicial.value, dataFinal.value);
    if (tipo === "hoje") {
      periodoLegenda.textContent = `Hoje · ${formatarDataCurta(intervalo.inicio)}`;
    } else if (tipo === "ontem") {
      periodoLegenda.textContent = `Ontem · ${formatarDataCurta(intervalo.inicio)}`;
    } else {
      periodoLegenda.textContent = `${formatarDataCurta(intervalo.inicio)} — ${formatarDataCurta(intervalo.fimInclusivo)}`;
    }
  } catch (erro) {
    periodoLegenda.textContent = erro?.message || "Escolha as datas do período";
  }
}

function selecionarPeriodo(botao) {
  botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
  periodoAtual = botao.dataset.periodo;
  periodoPersonalizado.hidden = periodoAtual !== "personalizado";
  atualizarLegendaPeriodo(periodoAtual);
  if (periodoAtual !== "personalizado") carregarRelatorio();
}

function mostrarCarregando() {
  elementos.faturamento.textContent = "—";
  elementos.qtdVendas.textContent = "—";
  elementos.ticket.textContent = "—";
  elementos.resultado.textContent = "—";
  elementos.margem.textContent = "Carregando...";
  elementos.custo.textContent = "—";
  elementos.perdas.textContent = "—";
  elementos.graficoEvolucao.innerHTML = '<div class="grafico-vazio"><span>Carregando dados...</span></div>';
}

function renderizarVariacao(atual, anterior) {
  elementos.variacao.className = "variacao neutra";
  if (anterior === 0) {
    elementos.variacao.textContent = atual > 0 ? "Sem faturamento no período anterior" : "Sem comparação disponível";
    return;
  }

  const percentual = ((atual - anterior) / Math.abs(anterior)) * 100;
  const sinal = percentual > 0 ? "+" : "";
  elementos.variacao.textContent = `${sinal}${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior`;
  elementos.variacao.classList.add(percentual >= 0 ? "positiva" : "negativa");
}

function renderizarResumo(resumo, faturamentoAnterior) {
  elementos.faturamento.textContent = formatarMoeda(resumo.faturamento);
  elementos.qtdVendas.textContent = resumo.quantidadeVendas.toLocaleString("pt-BR");
  elementos.ticket.textContent = formatarMoeda(resumo.ticketMedio);
  elementos.resultado.textContent = formatarMoeda(resumo.resultadoBruto);
  elementos.margem.textContent = `Margem: ${resumo.margemBruta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  elementos.custo.textContent = formatarMoeda(resumo.custoVendido);
  elementos.perdas.textContent = formatarMoeda(resumo.custoPerdas);
  renderizarVariacao(resumo.faturamento, faturamentoAnterior);
}

function renderizarPagamentos(resumo) {
  const total = resumo.dinheiro + resumo.pix + resumo.cartao;
  const pct = (valor) => total ? (valor / total) * 100 : 0;
  const dinheiro = pct(resumo.dinheiro);
  const pix = pct(resumo.pix);
  const cartao = pct(resumo.cartao);
  const fimDinheiro = dinheiro;
  const fimPix = dinheiro + pix;

  elementos.pagamentosTotal.textContent = formatarMoeda(total);
  elementos.dinheiroValor.textContent = formatarMoeda(resumo.dinheiro);
  elementos.pixValor.textContent = formatarMoeda(resumo.pix);
  elementos.cartaoValor.textContent = formatarMoeda(resumo.cartao);
  elementos.dinheiroPct.textContent = `${dinheiro.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  elementos.pixPct.textContent = `${pix.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  elementos.cartaoPct.textContent = `${cartao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  elementos.graficoPagamentos.classList.toggle("vazio", total === 0);
  elementos.graficoPagamentos.style.background = total
    ? `conic-gradient(rgb(var(--sucesso)) 0 ${fimDinheiro}%, rgb(var(--marca-viva)) ${fimDinheiro}% ${fimPix}%, #5e7391 ${fimPix}% 100%)`
    : "conic-gradient(#ded5cf 0 100%)";
}

function agruparHorasEmBlocos(serie) {
  return Array.from({ length: 8 }, (_, indice) => {
    const inicio = indice * 3;
    const fim = inicio + 2;
    const pontos = serie.slice(inicio, inicio + 3);
    return {
      chave: `${String(inicio).padStart(2, "0")}-${String(fim).padStart(2, "0")}`,
      rotulo: `${String(inicio).padStart(2, "0")}h`,
      titulo: `${String(inicio).padStart(2, "0")}h–${String(fim).padStart(2, "0")}h`,
      valor: pontos.reduce((soma, ponto) => soma + numero(ponto.valor), 0),
    };
  });
}

function renderizarGrafico(vendas, intervalo) {
  const serieOriginal = serieFaturamento(vendas, intervalo);
  const serie = intervalo.duracaoDias <= 1 ? agruparHorasEmBlocos(serieOriginal) : serieOriginal;
  const maximo = Math.max(...serie.map((ponto) => numero(ponto.valor)), 0);

  elementos.graficoEvolucaoLegenda.textContent = intervalo.duracaoDias <= 1
    ? "Faturamento por faixas de 3 horas."
    : "Faturamento distribuído por dia no período.";

  if (!maximo) {
    elementos.graficoEvolucao.innerHTML = '<div class="grafico-vazio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h18" /><path d="M5 16l4-5 4 3 6-8" /></svg><span>Nenhuma venda no período selecionado.</span></div>';
    return;
  }

  const quantidade = serie.length;
  const passoRotulo = quantidade <= 10 ? 1 : Math.ceil(quantidade / 7);
  const mostrarValores = quantidade <= 10;
  const gap = quantidade > 20 ? 2 : quantidade > 12 ? 4 : 7;

  const colunas = serie.map((ponto, indice) => {
    const valor = numero(ponto.valor);
    const altura = valor > 0 ? Math.max(4, (valor / maximo) * 88) : 0;
    const mostrarRotulo = indice % passoRotulo === 0 || indice === quantidade - 1;
    const titulo = ponto.titulo || ponto.rotulo;
    const valorHTML = mostrarValores && valor > 0
      ? `<span class="grafico-torre-valor" style="--altura:${altura.toFixed(2)}%">${escaparHTML(formatarValorGrafico(valor))}</span>`
      : "";

    return `
      <div class="grafico-torre-item" aria-label="${escaparHTML(titulo)}: ${escaparHTML(formatarMoeda(valor))}">
        <div class="grafico-torre-area">
          ${valorHTML}
          <span
            class="grafico-torre-barra cor-${indice % 5}${valor === 0 ? " zero" : ""}"
            style="--altura:${altura.toFixed(2)}%"
            title="${escaparHTML(titulo)}: ${escaparHTML(formatarMoeda(valor))}"
          ></span>
        </div>
        <span class="grafico-torre-rotulo">${mostrarRotulo ? escaparHTML(ponto.rotulo) : ""}</span>
      </div>
    `;
  }).join("");

  elementos.graficoEvolucao.innerHTML = `
    <div class="grafico-torres-relatorio" style="--colunas:${quantidade}; --gap:${gap}px">
      <div class="grafico-torre-colunas">${colunas}</div>
    </div>
  `;
}

function ordenarProdutos() {
  const campo = rankingAtual === "lucro" ? "lucro" : rankingAtual;
  return [...produtosAtuais].sort((a, b) => numero(b[campo]) - numero(a[campo]));
}

function renderizarProdutos() {
  const produtos = ordenarProdutos();
  if (!produtos.length) {
    elementos.ranking.innerHTML = '<tr class="tabela-vazia"><td colspan="4">Nenhuma venda no período selecionado.</td></tr>';
    return;
  }

  elementos.ranking.innerHTML = produtos.map((produto) => `
    <tr>
      <td title="${escaparHTML(produto.nome)}">${escaparHTML(produto.nome)}</td>
      <td>${formatarQuantidade(produto.quantidade)}</td>
      <td>${formatarMoeda(produto.faturamento)}</td>
      <td>${formatarMoeda(produto.lucro)}</td>
    </tr>
  `).join("");
}

function renderizarResumoDiario(vendas, perdas) {
  const dias = resumirPorDia(vendas, perdas);
  if (!dias.length) {
    elementos.resumoDiario.innerHTML = '<tr class="tabela-vazia"><td colspan="4">Nenhum dado no período selecionado.</td></tr>';
    return;
  }

  elementos.resumoDiario.innerHTML = dias.map((dia) => {
    const data = new Date(`${dia.data}T00:00:00`);
    return `
      <tr>
        <td>${data.toLocaleDateString("pt-BR")}</td>
        <td>${dia.vendas.toLocaleString("pt-BR")}</td>
        <td>${formatarMoeda(dia.faturamento)}</td>
        <td>${formatarMoeda(dia.resultado)}</td>
      </tr>
    `;
  }).join("");
}

function resumoItensVenda(venda) {
  const itens = venda.itens_venda || [];
  if (!itens.length) return "Sem itens";
  return itens.map((item) => `${formatarQuantidade(item.quantidade)}× ${item.nome_produto || "Produto"}`).join(" · ");
}

function formaPagamento(venda) {
  const formas = [];
  if (numero(venda.dinheiro) > 0) formas.push("Dinheiro");
  if (numero(venda.pix) > 0) formas.push("Pix");
  if (numero(venda.cartao) > 0) formas.push("Cartão");
  return formas.join(" + ") || "—";
}

function renderizarHistorico(vendas) {
  vendasAtuais = vendas;
  elementos.historicoContagem.textContent = vendas.length.toLocaleString("pt-BR");

  if (!vendas.length) {
    elementos.historico.innerHTML = '<div class="estado-vazio-compacto">Nenhuma venda encontrada.</div>';
    elementos.historicoMais.hidden = true;
    return;
  }

  const limite = 5;
  const vendasVisiveis = historicoExpandido ? vendas : vendas.slice(0, limite);

  elementos.historico.innerHTML = vendasVisiveis.map((venda) => `
    <details class="venda-relatorio-detalhe">
      <summary class="venda-relatorio-item">
        <span class="venda-info">
          <b>${formatarDataHora(venda.realizada_em)}</b>
          <span>${escaparHTML(formaPagamento(venda))}</span>
        </span>
        <strong>${formatarMoeda(venda.total)}</strong>
      </summary>
      <div class="venda-relatorio-conteudo">
        <p>${escaparHTML(resumoItensVenda(venda))}</p>
        ${venda.observacao ? `<small>Observação: ${escaparHTML(venda.observacao)}</small>` : ""}
      </div>
    </details>
  `).join("");

  elementos.historicoMais.hidden = vendas.length <= limite;
  elementos.historicoMais.textContent = historicoExpandido
    ? "Ver menos"
    : `Ver mais (${vendas.length - limite})`;
}

function mostrarErro(erro) {
  const mensagem = erro?.message || "Não foi possível carregar o relatório.";
  elementos.faturamento.textContent = "R$ 0,00";
  elementos.qtdVendas.textContent = "0";
  elementos.ticket.textContent = "R$ 0,00";
  elementos.resultado.textContent = "R$ 0,00";
  elementos.margem.textContent = "Margem: 0%";
  elementos.custo.textContent = "R$ 0,00";
  elementos.perdas.textContent = "R$ 0,00";
  elementos.variacao.textContent = mensagem;
  elementos.variacao.className = "variacao negativa";
  elementos.graficoEvolucao.innerHTML = `<div class="grafico-vazio"><span>${escaparHTML(mensagem)}</span></div>`;
}

async function carregarRelatorio() {
  const id = ++carregamentoId;
  let intervalo;
  try {
    intervalo = intervaloPorTipo(periodoAtual, dataInicial.value, dataFinal.value);
  } catch (erro) {
    mostrarErro(erro);
    return;
  }

  mostrarCarregando();

  try {
    const anterior = intervaloAnterior(intervalo);
    const [vendas, perdas, vendasAnteriores] = await Promise.all([
      listarVendasPeriodo(intervalo.inicioISO, intervalo.fimISO),
      listarPerdasPeriodo(intervalo.inicioISO, intervalo.fimISO),
      listarVendasPeriodo(anterior.inicioISO, anterior.fimISO),
    ]);
    if (id !== carregamentoId) return;

    const resumo = resumirPeriodo(vendas, perdas);
    const resumoAnterior = resumirPeriodo(vendasAnteriores, []);
    produtosAtuais = agruparProdutos(vendas);
    historicoExpandido = false;

    renderizarResumo(resumo, resumoAnterior.faturamento);
    renderizarPagamentos(resumo);
    renderizarGrafico(vendas, intervalo);
    renderizarProdutos();
    renderizarResumoDiario(vendas, perdas);
    renderizarHistorico(vendas);
  } catch (erro) {
    if (id !== carregamentoId) return;
    console.error(erro);
    mostrarErro(erro);
  }
}

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => selecionarPeriodo(botao));
});

[dataInicial, dataFinal].forEach((campo) => {
  campo.addEventListener("change", () => {
    atualizarLegendaPeriodo("personalizado");
    if (periodoAtual === "personalizado" && dataInicial.value && dataFinal.value) {
      carregarRelatorio();
    }
  });
});

botoesRanking.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesRanking.forEach((item) => item.classList.toggle("ativo", item === botao));
    rankingAtual = botao.dataset.ranking;
    renderizarProdutos();
  });
});

elementos.historicoMais.addEventListener("click", () => {
  historicoExpandido = !historicoExpandido;
  renderizarHistorico(vendasAtuais);
});

const hoje = new Date();
const haTrintaDias = new Date(hoje);
haTrintaDias.setDate(haTrintaDias.getDate() - 29);
dataInicial.value = dataLocalISO(haTrintaDias);
dataFinal.value = dataLocalISO(hoje);
atualizarLegendaPeriodo("hoje");

const usuario = await exigirUsuario();
if (usuario) await carregarRelatorio();
