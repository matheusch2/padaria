import { exigirUsuario } from "./auth.js";
import { listarVendasPeriodo } from "./vendas-api.js";
import { listarPerdasPeriodo } from "./perdas-api.js";
import { carregarProdutos } from "./produtos.js";
import { listarFechamentosPeriodo } from "./fechamentos-api.js";
import {
  agruparProdutos,
  custoItensVenda,
  formatarMoeda,
  intervaloPorTipo,
  numero,
  resumirPeriodo,
} from "./relatorios-dados.js";

const params = new URLSearchParams(window.location.search);
const tipo = params.get("tipo") || "";
const inicio = params.get("inicio") || "";
const fim = params.get("fim") || "";

const titulo = document.getElementById("tituloRelatorio");
const periodoEl = document.getElementById("periodoRelatorio");
const geradoEm = document.getElementById("geradoEm");
const estado = document.getElementById("estadoRelatorio");
const conteudo = document.getElementById("conteudoRelatorio");
const btnImprimir = document.getElementById("btnImprimir");

const TITULOS = {
  vendas: "Relatório de vendas",
  perdas: "Relatório de perdas e sobras",
  estoque: "Relatório de estoque",
  fechamento: "Relatório de fechamento do caixa",
  produtos: "Produtos e lucratividade",
};

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarQuantidade(valor) {
  return numero(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatarData(valor, comHora = false) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", comHora
    ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarDataISO(valor) {
  if (!valor) return "—";
  const [ano, mes, dia] = String(valor).split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1).toLocaleDateString("pt-BR");
}

function formasPagamento(venda) {
  const formas = [];
  if (numero(venda.dinheiro) > 0) formas.push(`Dinheiro ${formatarMoeda(venda.dinheiro)}`);
  if (numero(venda.pix) > 0) formas.push(`Pix ${formatarMoeda(venda.pix)}`);
  if (numero(venda.cartao) > 0) formas.push(`Cartão ${formatarMoeda(venda.cartao)}`);
  return formas.join(" + ") || "—";
}

function itensVenda(venda) {
  return (venda.itens_venda || [])
    .map((item) => `${formatarQuantidade(item.quantidade)}× ${item.nome_produto || "Produto"}`)
    .join("; ") || "—";
}

function cardsResumo(itens) {
  return `<div class="relatorio-resumo">${itens.map(([rotulo, valor]) => `
    <div class="resumo-item">
      <span>${escaparHTML(rotulo)}</span>
      <b>${escaparHTML(valor)}</b>
    </div>
  `).join("")}</div>`;
}

function tabela(cabecalhos, linhas, colspan = cabecalhos.length) {
  const thead = cabecalhos.map((item) => {
    const config = typeof item === "string" ? { texto: item } : item;
    return `<th class="${config.numero ? "numero" : ""}">${escaparHTML(config.texto)}</th>`;
  }).join("");

  return `
    <div class="tabela-documento-wrap">
      <table class="tabela-documento">
        <thead><tr>${thead}</tr></thead>
        <tbody>${linhas || `<tr><td class="sem-registros" colspan="${colspan}">Nenhum registro encontrado.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

async function renderVendas(intervalo) {
  const vendas = await listarVendasPeriodo(intervalo.inicioISO, intervalo.fimISO);
  const resumo = resumirPeriodo(vendas, []);
  const lucroVendas = resumo.faturamento - resumo.custoVendido;

  const linhas = vendas.map((venda) => {
    const custo = custoItensVenda(venda);
    const lucro = numero(venda.total) - custo;
    return `<tr>
      <td>${escaparHTML(formatarData(venda.realizada_em, true))}</td>
      <td>${escaparHTML(itensVenda(venda))}</td>
      <td>${escaparHTML(formasPagamento(venda))}</td>
      <td class="numero">${escaparHTML(formatarMoeda(venda.total))}</td>
      <td class="numero">${escaparHTML(formatarMoeda(custo))}</td>
      <td class="numero">${escaparHTML(formatarMoeda(lucro))}</td>
    </tr>`;
  }).join("");

  return `
    ${cardsResumo([
      ["Faturamento", formatarMoeda(resumo.faturamento)],
      ["Vendas", String(resumo.quantidadeVendas)],
      ["Ticket médio", formatarMoeda(resumo.ticketMedio)],
      ["Custo vendido", formatarMoeda(resumo.custoVendido)],
      ["Lucro bruto das vendas", formatarMoeda(lucroVendas)],
      ["Dinheiro", formatarMoeda(resumo.dinheiro)],
      ["Pix", formatarMoeda(resumo.pix)],
      ["Cartão", formatarMoeda(resumo.cartao)],
    ])}
    <section class="relatorio-secao">
      <h2>Vendas do período</h2>
      ${tabela([
        "Data / hora",
        "Itens",
        "Pagamento",
        { texto: "Total", numero: true },
        { texto: "Custo", numero: true },
        { texto: "Lucro bruto", numero: true },
      ], linhas, 6)}
    </section>
  `;
}

async function renderPerdas(intervalo) {
  const registros = await listarPerdasPeriodo(intervalo.inicioISO, intervalo.fimISO);
  const custoTotal = registros.reduce((soma, item) => soma + numero(item.custo_total), 0);
  const quantidade = registros.reduce((soma, item) => soma + numero(item.quantidade), 0);
  const perdas = registros.filter((item) => item.tipo === "perda").length;
  const sobras = registros.filter((item) => item.tipo === "sobra").length;

  const linhas = registros.map((item) => `<tr>
    <td>${escaparHTML(formatarData(item.registrada_em, true))}</td>
    <td>${escaparHTML(item.nome_produto || "Produto")}</td>
    <td>${item.tipo === "sobra" ? "Sobra" : "Perda"}</td>
    <td class="numero">${escaparHTML(formatarQuantidade(item.quantidade))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(item.custo_total))}</td>
    <td>${escaparHTML(item.motivo || "—")}</td>
  </tr>`).join("");

  return `
    ${cardsResumo([
      ["Registros", String(registros.length)],
      ["Quantidade total", formatarQuantidade(quantidade)],
      ["Custo total", formatarMoeda(custoTotal)],
      ["Perdas / Sobras", `${perdas} / ${sobras}`],
    ])}
    <section class="relatorio-secao">
      <h2>Registros do período</h2>
      ${tabela([
        "Data / hora", "Produto", "Tipo", { texto: "Quantidade", numero: true },
        { texto: "Custo", numero: true }, "Motivo",
      ], linhas, 6)}
    </section>
  `;
}

async function renderEstoque() {
  const produtos = await carregarProdutos();
  const quantidadeTotal = produtos.reduce((soma, produto) => soma + numero(produto.estoque), 0);
  const valorCusto = produtos.reduce((soma, produto) => soma + numero(produto.estoque) * numero(produto.custo), 0);
  const valorVenda = produtos.reduce((soma, produto) => soma + numero(produto.estoque) * numero(produto.preco), 0);
  const margemPotencial = valorVenda - valorCusto;

  const linhas = produtos.map((produto) => `<tr>
    <td>${escaparHTML(produto.nome)}</td>
    <td>${escaparHTML(produto.categoria || "Outros")}</td>
    <td class="numero">${escaparHTML(formatarQuantidade(produto.estoque))} ${escaparHTML(produto.unidade || "un")}</td>
    <td class="numero">${escaparHTML(formatarMoeda(produto.custo))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(produto.preco))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(numero(produto.estoque) * numero(produto.custo)))}</td>
  </tr>`).join("");

  return `
    ${cardsResumo([
      ["Produtos ativos", String(produtos.length)],
      ["Quantidade em estoque", formatarQuantidade(quantidadeTotal)],
      ["Valor a custo", formatarMoeda(valorCusto)],
      ["Valor potencial de venda", formatarMoeda(valorVenda)],
      ["Margem bruta potencial", formatarMoeda(margemPotencial)],
    ])}
    <section class="relatorio-secao">
      <h2>Posição atual do estoque</h2>
      ${tabela([
        "Produto", "Categoria", { texto: "Estoque", numero: true },
        { texto: "Custo un.", numero: true }, { texto: "Preço", numero: true },
        { texto: "Valor em custo", numero: true },
      ], linhas, 6)}
    </section>
    <p class="relatorio-nota">O relatório de estoque mostra a posição atual cadastrada no sistema. Ele não reconstrói o estoque histórico de uma data passada.</p>
  `;
}

async function renderFechamentos(intervalo) {
  const fechamentos = await listarFechamentosPeriodo(intervalo.inicioData, intervalo.fimData);
  const faturamento = fechamentos.reduce((soma, item) => soma + numero(item.faturamento), 0);
  const resultado = fechamentos.reduce((soma, item) => soma + numero(item.resultado_bruto), 0);
  const diferenca = fechamentos.reduce((soma, item) => soma + numero(item.diferenca), 0);
  const dinheiroContado = fechamentos.reduce((soma, item) => soma + numero(item.dinheiro_contado), 0);

  const linhas = fechamentos.map((item) => `<tr>
    <td>${escaparHTML(formatarDataISO(item.data_referencia))}</td>
    <td class="numero">${numero(item.quantidade_vendas).toLocaleString("pt-BR")}</td>
    <td class="numero">${escaparHTML(formatarMoeda(item.faturamento))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(item.dinheiro))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(item.pix))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(item.cartao))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(item.resultado_bruto))}</td>
    <td class="numero">${escaparHTML(formatarMoeda(item.diferenca))}</td>
  </tr>`).join("");

  return `
    ${cardsResumo([
      ["Dias fechados", String(fechamentos.length)],
      ["Faturamento", formatarMoeda(faturamento)],
      ["Resultado bruto", formatarMoeda(resultado)],
      ["Dinheiro contado", formatarMoeda(dinheiroContado)],
      ["Diferença acumulada", formatarMoeda(diferenca)],
    ])}
    <section class="relatorio-secao">
      <h2>Fechamentos salvos</h2>
      ${tabela([
        "Data", { texto: "Vendas", numero: true }, { texto: "Faturamento", numero: true },
        { texto: "Dinheiro", numero: true }, { texto: "Pix", numero: true },
        { texto: "Cartão", numero: true }, { texto: "Resultado", numero: true },
        { texto: "Diferença", numero: true },
      ], linhas, 8)}
    </section>
  `;
}

async function renderProdutos(intervalo) {
  const vendas = await listarVendasPeriodo(intervalo.inicioISO, intervalo.fimISO);
  const produtos = agruparProdutos(vendas).sort((a, b) => b.lucro - a.lucro);
  const quantidade = produtos.reduce((soma, produto) => soma + numero(produto.quantidade), 0);
  const faturamento = produtos.reduce((soma, produto) => soma + numero(produto.faturamento), 0);
  const custo = produtos.reduce((soma, produto) => soma + numero(produto.custo), 0);
  const lucro = produtos.reduce((soma, produto) => soma + numero(produto.lucro), 0);

  const linhas = produtos.map((produto) => {
    const margem = produto.faturamento ? (produto.lucro / produto.faturamento) * 100 : 0;
    return `<tr>
      <td>${escaparHTML(produto.nome)}</td>
      <td class="numero">${escaparHTML(formatarQuantidade(produto.quantidade))}</td>
      <td class="numero">${escaparHTML(formatarMoeda(produto.faturamento))}</td>
      <td class="numero">${escaparHTML(formatarMoeda(produto.custo))}</td>
      <td class="numero">${escaparHTML(formatarMoeda(produto.lucro))}</td>
      <td class="numero">${margem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</td>
    </tr>`;
  }).join("");

  const margemTotal = faturamento ? (lucro / faturamento) * 100 : 0;

  return `
    ${cardsResumo([
      ["Produtos vendidos", String(produtos.length)],
      ["Quantidade vendida", formatarQuantidade(quantidade)],
      ["Faturamento", formatarMoeda(faturamento)],
      ["Custo vendido", formatarMoeda(custo)],
      ["Lucro bruto", formatarMoeda(lucro)],
      ["Margem bruta", `${margemTotal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`],
    ])}
    <section class="relatorio-secao">
      <h2>Lucratividade por produto</h2>
      ${tabela([
        "Produto", { texto: "Quantidade", numero: true }, { texto: "Faturamento", numero: true },
        { texto: "Custo", numero: true }, { texto: "Lucro bruto", numero: true },
        { texto: "Margem", numero: true },
      ], linhas, 6)}
    </section>
  `;
}

async function carregar() {
  const usuario = await exigirUsuario();
  if (!usuario) return;

  if (!TITULOS[tipo]) {
    estado.textContent = "Tipo de relatório inválido.";
    return;
  }

  let intervalo;
  try {
    intervalo = intervaloPorTipo("personalizado", inicio, fim);
  } catch (erro) {
    estado.textContent = erro?.message || "Período inválido.";
    return;
  }

  titulo.textContent = TITULOS[tipo];
  document.title = `${TITULOS[tipo]} - Padaria Gestão`;
  geradoEm.textContent = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  periodoEl.textContent = tipo === "estoque"
    ? `Posição atual · ${new Date().toLocaleDateString("pt-BR")}`
    : `${formatarDataISO(intervalo.inicioData)} a ${formatarDataISO(intervalo.fimData)}`;

  try {
    let html = "";
    if (tipo === "vendas") html = await renderVendas(intervalo);
    else if (tipo === "perdas") html = await renderPerdas(intervalo);
    else if (tipo === "estoque") html = await renderEstoque();
    else if (tipo === "fechamento") html = await renderFechamentos(intervalo);
    else if (tipo === "produtos") html = await renderProdutos(intervalo);

    conteudo.innerHTML = html;
    conteudo.hidden = false;
    estado.hidden = true;
  } catch (erro) {
    console.error(erro);
    estado.hidden = false;
    estado.textContent = erro?.message || "Não foi possível carregar os dados do relatório.";
  }
}

btnImprimir.addEventListener("click", () => window.print());
await carregar();
