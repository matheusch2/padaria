import { listarVendasPeriodo } from "./vendas-api.js";
import { listarPerdasPeriodo } from "./perdas-api.js";
import { buscarFechamento, salvarFechamento as persistirFechamento } from "./fechamentos-api.js";
import { exigirUsuario } from "./auth.js";

const dataInput = document.getElementById("dataFechamento");
const fundoInput = document.getElementById("fundoInicial");
const retiradasInput = document.getElementById("retiradasCaixa");
const contadoInput = document.getElementById("dinheiroContado");
const observacaoInput = document.getElementById("observacaoFechamento");
const aviso = document.getElementById("avisoFechamento");
const status = document.getElementById("statusFechamento");
const btnFechar = document.getElementById("btnFecharCaixa");

let resumoAtual = null;

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

async function carregarFechamentoSalvo() {
  aviso.hidden = true;
  aviso.classList.remove("sucesso");
  status.hidden = true;

  try {
    const fechamento = await buscarFechamento(dataInput.value);

    if (!fechamento) {
      fundoInput.value = "";
      retiradasInput.value = "";
      contadoInput.value = "";
      observacaoInput.value = "";
      btnFechar.textContent = "Salvar fechamento";
      await renderizarResumo();
      return;
    }

    fundoInput.value = formatarCampoMoeda(fechamento.fundo_inicial);
    retiradasInput.value = formatarCampoMoeda(fechamento.retiradas);
    contadoInput.value = formatarCampoMoeda(fechamento.dinheiro_contado);
    observacaoInput.value = fechamento.observacao || "";
    btnFechar.textContent = "Atualizar fechamento";

    const salvoEm = new Date(fechamento.atualizado_em || fechamento.criado_em);
    status.textContent = Number.isNaN(salvoEm.getTime())
      ? "Fechamento já salvo para esta data."
      : `Fechamento salvo em ${salvoEm.toLocaleDateString("pt-BR")} às ${salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
    status.hidden = false;
    await renderizarResumo();
  } catch (erro) {
    aviso.textContent = erro?.message || "Não foi possível carregar o fechamento.";
    aviso.hidden = false;
  }
}

async function salvarFechamento() {
  aviso.hidden = true;
  aviso.classList.remove("sucesso");

  if (!dataInput.value) {
    aviso.textContent = "Selecione a data do fechamento.";
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

    await persistirFechamento({
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

    aviso.textContent = Math.abs(diferenca) < 0.005
      ? "Fechamento salvo. O caixa conferiu sem diferença."
      : `Fechamento salvo com ${diferenca > 0 ? "sobra" : "falta"} de ${formatarMoeda(Math.abs(diferenca))}.`;
    aviso.classList.add("sucesso");
    aviso.hidden = false;

    btnFechar.textContent = "Atualizar fechamento";
    const agora = new Date();
    status.textContent = `Fechamento salvo em ${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
    status.hidden = false;
  } catch (erro) {
    aviso.textContent = erro?.message || "Não foi possível salvar o fechamento.";
    aviso.hidden = false;
  } finally {
    btnFechar.disabled = false;
  }
}

[fundoInput, retiradasInput, contadoInput].forEach((campo) => {
  campo.addEventListener("input", atualizarConferencia);
});

dataInput.addEventListener("change", carregarFechamentoSalvo);
btnFechar.addEventListener("click", salvarFechamento);

const usuario = await exigirUsuario();
if (usuario) {
  dataInput.value = dataLocal();
  await carregarFechamentoSalvo();
}
