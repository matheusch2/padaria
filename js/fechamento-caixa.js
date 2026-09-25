import { listarVendasPeriodo } from "./vendas-api.js";
import { listarPerdasPeriodo } from "./perdas-api.js";
import { abrirCaixa as abrirCaixaApi, buscarFechamento, fecharCaixa as fecharCaixaApi } from "./fechamentos-api.js?v=20260925-2";
import { exigirUsuario } from "./auth.js";

const dataInput = document.getElementById("dataFechamento");
const fundoInput = document.getElementById("fundoInicial");
const retiradasInput = document.getElementById("retiradasCaixa");
const contadoInput = document.getElementById("dinheiroContado");
const observacaoInput = document.getElementById("observacaoFechamento");
const aviso = document.getElementById("avisoFechamento");
const status = document.getElementById("statusFechamento");
const btnAbrir = document.getElementById("btnAbrirCaixa");
const btnFechar = document.getElementById("btnFecharCaixa");
const acaoAbertura = document.getElementById("acaoAberturaCaixa");
const secaoObservacoes = document.getElementById("secaoObservacoes");
const estadoCaixa = document.getElementById("estadoCaixa");
const estadoTitulo = document.getElementById("estadoCaixaTitulo");
const estadoDescricao = document.getElementById("estadoCaixaDescricao");
const estadoBadge = document.getElementById("estadoCaixaBadge");
const btnProximo = document.getElementById("btnProximoCaixa");
const camposApenasAbertos = [...document.querySelectorAll("[data-apenas-aberto]")];

let resumoAtual = null;
let fechamentoAtual = null;
let estadoAtual = "nao-aberto";

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarCampoMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function lerMoeda(input) {
  const texto = String(input.value || "").trim();
  if (!texto) return 0;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : 0;
}

function dataLocal(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function intervaloDaData(dataReferencia) {
  const [ano, mes, dia] = dataReferencia.split("-").map(Number);
  const inicio = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return { inicioISO: inicio.toISOString(), fimISO: fim.toISOString() };
}

function formatarInstante(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function calcularResumo(dataReferencia) {
  const { inicioISO, fimISO } = intervaloDaData(dataReferencia);
  const [vendas, perdas] = await Promise.all([
    listarVendasPeriodo(inicioISO, fimISO),
    listarPerdasPeriodo(inicioISO, fimISO),
  ]);

  const faturamento = vendas.reduce((soma, venda) => soma + (Number(venda.total) || 0), 0);
  const dinheiro = vendas.reduce((soma, venda) => soma + (Number(venda.dinheiro) || 0), 0);
  const cartao = vendas.reduce((soma, venda) => soma + (Number(venda.cartao) || 0), 0);
  const pix = vendas.reduce((soma, venda) => soma + (Number(venda.pix) || 0), 0);

  const custoVendido = vendas.reduce((totalVendas, venda) => {
    return totalVendas + (venda.itens_venda || []).reduce((totalItens, item) => {
      return totalItens + (Number(item.custo_unitario) || 0) * (Number(item.quantidade) || 0);
    }, 0);
  }, 0);

  const custoPerdas = perdas.reduce(
    (soma, perda) => soma + (Number(perda.custo_total) || 0),
    0,
  );

  return {
    dataReferencia,
    quantidadeVendas: vendas.length,
    faturamento,
    dinheiro,
    cartao,
    pix,
    custoVendido,
    custoPerdas,
    resultadoBruto: faturamento - custoVendido - custoPerdas,
  };
}

function atualizarConferencia() {
  if (!resumoAtual) return;

  const fundo = lerMoeda(fundoInput);
  const retiradas = lerMoeda(retiradasInput);
  const esperado = resumoAtual.dinheiro + fundo - retiradas;
  const temContagem = contadoInput.value.trim() !== "";
  const contado = lerMoeda(contadoInput);
  const diferenca = contado - esperado;

  document.getElementById("dinheiroEsperado").textContent = formatarMoeda(esperado);

  const box = document.getElementById("diferencaBox");
  const texto = document.getElementById("diferencaCaixa");
  box.className = "diferenca neutra";

  if (!temContagem) {
    texto.textContent = "Informe a contagem";
    return;
  }

  if (Math.abs(diferenca) < 0.005) {
    box.className = "diferenca ok";
    texto.textContent = "Caixa confere";
  } else if (diferenca > 0) {
    box.className = "diferenca sobra";
    texto.textContent = `Sobra ${formatarMoeda(diferenca)}`;
  } else {
    box.className = "diferenca falta";
    texto.textContent = `Falta ${formatarMoeda(Math.abs(diferenca))}`;
  }
}

async function renderizarResumo() {
  if (!dataInput.value) return;
  resumoAtual = await calcularResumo(dataInput.value);

  document.getElementById("resumoFaturamento").textContent = formatarMoeda(resumoAtual.faturamento);
  document.getElementById("resumoQtdVendas").textContent = `${resumoAtual.quantidadeVendas} ${resumoAtual.quantidadeVendas === 1 ? "venda" : "vendas"}`;
  document.getElementById("resumoDinheiro").textContent = formatarMoeda(resumoAtual.dinheiro);
  document.getElementById("resumoCartao").textContent = formatarMoeda(resumoAtual.cartao);
  document.getElementById("resumoPix").textContent = formatarMoeda(resumoAtual.pix);

  document.getElementById("resultadoFaturamento").textContent = formatarMoeda(resumoAtual.faturamento);
  document.getElementById("resultadoCustoVendido").textContent = `− ${formatarMoeda(resumoAtual.custoVendido)}`;
  document.getElementById("resultadoPerdas").textContent = `− ${formatarMoeda(resumoAtual.custoPerdas)}`;
  document.getElementById("resultadoBruto").textContent = formatarMoeda(resumoAtual.resultadoBruto);
  document.querySelector(".linha-financeira.total").classList.toggle("negativo", resumoAtual.resultadoBruto < 0);

  atualizarConferencia();
}

function atualizarEstadoCaixa(novoEstado, fechamento = null) {
  estadoAtual = novoEstado;
  fechamentoAtual = fechamento;
  estadoCaixa.dataset.estado = novoEstado;

  const configuracoes = {
    "nao-aberto": {
      titulo: "Caixa não aberto",
      descricao: "Informe o fundo inicial para iniciar o caixa deste dia.",
      badge: "Não aberto",
      classe: "badge-neutro",
    },
    aberto: {
      titulo: "Caixa aberto",
      descricao: "Registre as vendas normalmente e faça a conferência ao terminar o dia.",
      badge: "Em operação",
      classe: "badge-aberto",
    },
    fechado: {
      titulo: "Caixa fechado",
      descricao: "Este fechamento está salvo no histórico e não pode ser alterado.",
      badge: "Fechado",
      classe: "badge-fechado",
    },
  };
  const configuracao = configuracoes[novoEstado] || configuracoes["nao-aberto"];
  estadoTitulo.textContent = configuracao.titulo;
  estadoBadge.textContent = configuracao.badge;
  estadoBadge.className = `badge-caixa ${configuracao.classe}`;

  const instante = novoEstado === "fechado"
    ? formatarInstante(fechamento?.fechado_em || fechamento?.atualizado_em)
    : formatarInstante(fechamento?.aberto_em || fechamento?.criado_em);
  estadoDescricao.textContent = instante && novoEstado !== "nao-aberto"
    ? `${configuracao.descricao} ${novoEstado === "fechado" ? "Fechado" : "Aberto"} em ${instante}.`
    : configuracao.descricao;

  const naoAberto = novoEstado === "nao-aberto";
  const aberto = novoEstado === "aberto";
  const fechado = novoEstado === "fechado";

  acaoAbertura.hidden = !naoAberto;
  btnFechar.hidden = !aberto;
  btnProximo.hidden = !fechado;
  secaoObservacoes.hidden = naoAberto;
  camposApenasAbertos.forEach((campo) => { campo.hidden = naoAberto; });

  fundoInput.disabled = fechado;
  retiradasInput.disabled = !aberto;
  contadoInput.disabled = !aberto;
  observacaoInput.disabled = !aberto;
  btnAbrir.disabled = false;
  btnFechar.disabled = !aberto;
  dataInput.disabled = false;
}

function dataDoProximoDia(valor) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() + 1);
  return dataLocal(data);
}

async function prepararProximoCaixa() {
  if (!dataInput.value) return;
  dataInput.value = dataDoProximoDia(dataInput.value);
  await carregarFechamentoSalvo();
  fundoInput.focus();
}

function limparCampos() {
  fundoInput.value = "";
  retiradasInput.value = "";
  contadoInput.value = "";
  observacaoInput.value = "";
}

async function carregarFechamentoSalvo() {
  aviso.hidden = true;
  aviso.classList.remove("sucesso");
  status.hidden = true;

  try {
    const fechamento = await buscarFechamento(dataInput.value);

    if (!fechamento) {
      limparCampos();
      atualizarEstadoCaixa("nao-aberto");
      await renderizarResumo();
      return;
    }

    fundoInput.value = formatarCampoMoeda(fechamento.fundo_inicial);
    retiradasInput.value = formatarCampoMoeda(fechamento.retiradas);
    contadoInput.value = fechamento.status === "aberto"
      ? ""
      : formatarCampoMoeda(fechamento.dinheiro_contado);
    observacaoInput.value = fechamento.observacao || "";

    const estado = fechamento.status === "aberto" ? "aberto" : "fechado";
    atualizarEstadoCaixa(estado, fechamento);
    status.textContent = estado === "fechado"
      ? "Fechamento salvo no histórico."
      : "Caixa aberto e pronto para operar.";
    status.hidden = false;
    await renderizarResumo();
  } catch (erro) {
    aviso.textContent = erro?.message || "Não foi possível carregar o caixa.";
    aviso.hidden = false;
  }
}

async function abrirCaixa() {
  aviso.hidden = true;
  aviso.classList.remove("sucesso");

  if (!dataInput.value) {
    aviso.textContent = "Selecione a data do caixa.";
    aviso.hidden = false;
    return;
  }

  if (fundoInput.value.trim() === "") {
    aviso.textContent = "Informe o fundo inicial do caixa. Se não houver troco, informe 0,00.";
    aviso.hidden = false;
    fundoInput.focus();
    return;
  }

  btnAbrir.disabled = true;
  try {
    await abrirCaixaApi({
      dataReferencia: dataInput.value,
      fundoInicial: lerMoeda(fundoInput),
    });
    await carregarFechamentoSalvo();
    aviso.textContent = "Caixa aberto. Agora as vendas deste dia ficam vinculadas a este ciclo.";
    aviso.classList.add("sucesso");
    aviso.hidden = false;
  } catch (erro) {
    aviso.textContent = erro?.message || "Não foi possível abrir o caixa.";
    aviso.hidden = false;
  } finally {
    btnAbrir.disabled = false;
  }
}

async function fecharCaixa() {
  aviso.hidden = true;
  aviso.classList.remove("sucesso");

  if (estadoAtual !== "aberto") {
    aviso.textContent = "Abra o caixa desta data antes de fazer o fechamento.";
    aviso.hidden = false;
    return;
  }

  if (contadoInput.value.trim() === "") {
    aviso.textContent = "Informe quanto dinheiro foi contado no caixa.";
    aviso.hidden = false;
    contadoInput.focus();
    return;
  }

  btnFechar.disabled = true;
  try {
    await renderizarResumo();

    const fundoInicial = lerMoeda(fundoInput);
    const retiradas = lerMoeda(retiradasInput);
    const dinheiroContado = lerMoeda(contadoInput);
    const dinheiroEsperado = resumoAtual.dinheiro + fundoInicial - retiradas;
    const diferenca = dinheiroContado - dinheiroEsperado;

    await fecharCaixaApi({
      id: fechamentoAtual?.id,
      dataReferencia: dataInput.value,
      quantidadeVendas: resumoAtual.quantidadeVendas,
      faturamento: resumoAtual.faturamento,
      dinheiro: resumoAtual.dinheiro,
      cartao: resumoAtual.cartao,
      pix: resumoAtual.pix,
      custoVendido: resumoAtual.custoVendido,
      custoPerdas: resumoAtual.custoPerdas,
      resultadoBruto: resumoAtual.resultadoBruto,
      fundoInicial,
      retiradas,
      dinheiroEsperado,
      dinheiroContado,
      diferenca,
      observacao: observacaoInput.value.trim(),
    });

    await carregarFechamentoSalvo();
    aviso.textContent = Math.abs(diferenca) < 0.005
      ? "Caixa fechado. A conferência bateu sem diferença."
      : `Caixa fechado com ${diferenca > 0 ? "sobra" : "falta"} de ${formatarMoeda(Math.abs(diferenca))}.`;
    aviso.classList.add("sucesso");
    aviso.hidden = false;
  } catch (erro) {
    aviso.textContent = erro?.message || "Não foi possível fechar o caixa.";
    aviso.hidden = false;
  } finally {
    btnFechar.disabled = false;
  }
}

[fundoInput, retiradasInput, contadoInput].forEach((campo) => {
  campo.addEventListener("input", atualizarConferencia);
});

dataInput.addEventListener("change", carregarFechamentoSalvo);
btnAbrir.addEventListener("click", abrirCaixa);
btnFechar.addEventListener("click", fecharCaixa);
btnProximo.addEventListener("click", prepararProximoCaixa);

const usuario = await exigirUsuario();
if (usuario) {
  dataInput.value = dataLocal();
  await carregarFechamentoSalvo();
}
