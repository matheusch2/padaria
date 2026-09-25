import {
  CHAVE_FECHAMENTOS,
  CHAVE_PERDAS,
  CHAVE_VENDAS,
  lerLista,
  salvarLista,
} from "./armazenamento.js";
import { carregarProdutos } from "./produtos.js";

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

function dataLocalDoISO(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "" : dataLocal(data);
}

function calcularResumo(dataReferencia) {
  const vendas = lerLista(CHAVE_VENDAS).filter(
    (venda) => dataLocalDoISO(venda.data) === dataReferencia,
  );
  const perdas = lerLista(CHAVE_PERDAS).filter(
    (perda) => dataLocalDoISO(perda.data) === dataReferencia,
  );
  const produtos = carregarProdutos();
  const custosAtuais = new Map(
    produtos.map((produto) => [produto.id, Number(produto.custo) || 0]),
  );

  const faturamento = vendas.reduce((soma, venda) => soma + (Number(venda.total) || 0), 0);
  const dinheiro = vendas.reduce((soma, venda) => soma + (Number(venda.pagamento?.dinheiro) || 0), 0);
  const cartao = vendas.reduce((soma, venda) => soma + (Number(venda.pagamento?.cartao) || 0), 0);
  const pix = vendas.reduce((soma, venda) => soma + (Number(venda.pagamento?.pix) || 0), 0);

  let itensSemCustoHistorico = 0;
  const custoVendido = vendas.reduce((totalVendas, venda) => {
    const custoDaVenda = (venda.itens || []).reduce((totalItens, item) => {
      const quantidade = Number(item.quantidade) || 0;
      let custoUnitario;

      if (item.custo !== undefined && item.custo !== null) {
        custoUnitario = Number(item.custo) || 0;
      } else {
        custoUnitario = custosAtuais.get(item.produtoId) || 0;
        itensSemCustoHistorico += 1;
      }

      return totalItens + custoUnitario * quantidade;
    }, 0);
    return totalVendas + custoDaVenda;
  }, 0);

  const custoPerdas = perdas.reduce((soma, perda) => {
    const custoTotal = Number(perda.custoTotal);
    if (Number.isFinite(custoTotal)) return soma + custoTotal;
    return soma + (Number(perda.custoUnitario) || 0) * (Number(perda.quantidade) || 0);
  }, 0);

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
    itensSemCustoHistorico,
  };
}

function renderizarResumo() {
  resumoAtual = calcularResumo(dataInput.value);

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

function carregarFechamentoSalvo() {
  const fechamento = lerLista(CHAVE_FECHAMENTOS).find(
    (item) => item.dataReferencia === dataInput.value,
  );

  aviso.hidden = true;
  aviso.classList.remove("sucesso");

  if (!fechamento) {
    fundoInput.value = "";
    retiradasInput.value = "";
    contadoInput.value = "";
    observacaoInput.value = "";
    status.hidden = true;
    btnFechar.textContent = "Salvar fechamento";
    renderizarResumo();
    return;
  }

  fundoInput.value = formatarCampoMoeda(fechamento.fundoInicial);
  retiradasInput.value = formatarCampoMoeda(fechamento.retiradas);
  contadoInput.value = formatarCampoMoeda(fechamento.dinheiroContado);
  observacaoInput.value = fechamento.observacao || "";
  btnFechar.textContent = "Atualizar fechamento";

  const salvoEm = new Date(fechamento.salvoEm);
  status.textContent = Number.isNaN(salvoEm.getTime())
    ? "Fechamento já salvo para esta data."
    : `Fechamento salvo em ${salvoEm.toLocaleDateString("pt-BR")} às ${salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
  status.hidden = false;
  renderizarResumo();
}

function salvarFechamento() {
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

  renderizarResumo();

  const fundoInicial = lerMoeda(fundoInput);
  const retiradas = lerMoeda(retiradasInput);
  const dinheiroContado = lerMoeda(contadoInput);
  const dinheiroEsperado = resumoAtual.dinheiro + fundoInicial - retiradas;
  const diferenca = dinheiroContado - dinheiroEsperado;
  const fechamentos = lerLista(CHAVE_FECHAMENTOS);
  const indiceExistente = fechamentos.findIndex(
    (item) => item.dataReferencia === dataInput.value,
  );

  const anterior = indiceExistente >= 0 ? fechamentos[indiceExistente] : null;
  const fechamento = {
    id: anterior?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    dataReferencia: dataInput.value,
    salvoEm: new Date().toISOString(),
    quantidadeVendas: resumoAtual.quantidadeVendas,
    faturamento: resumoAtual.faturamento,
    pagamento: {
      dinheiro: resumoAtual.dinheiro,
      cartao: resumoAtual.cartao,
      pix: resumoAtual.pix,
    },
    custoVendido: resumoAtual.custoVendido,
    perdas: resumoAtual.custoPerdas,
    resultadoBruto: resumoAtual.resultadoBruto,
    fundoInicial,
    retiradas,
    dinheiroEsperado,
    dinheiroContado,
    diferenca,
    observacao: observacaoInput.value.trim(),
  };

  if (indiceExistente >= 0) fechamentos[indiceExistente] = fechamento;
  else fechamentos.push(fechamento);

  salvarLista(CHAVE_FECHAMENTOS, fechamentos);

  aviso.textContent = Math.abs(diferenca) < 0.005
    ? "Fechamento salvo. O caixa conferiu sem diferença."
    : `Fechamento salvo com ${diferenca > 0 ? "sobra" : "falta"} de ${formatarMoeda(Math.abs(diferenca))}.`;
  aviso.classList.add("sucesso");
  aviso.hidden = false;

  btnFechar.textContent = "Atualizar fechamento";
  const agora = new Date();
  status.textContent = `Fechamento salvo em ${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
  status.hidden = false;
}

[dataInput, fundoInput, retiradasInput, contadoInput].forEach((campo) => {
  campo.addEventListener("input", () => {
    if (campo === dataInput) return;
    atualizarConferencia();
  });
});

dataInput.addEventListener("change", carregarFechamentoSalvo);
btnFechar.addEventListener("click", salvarFechamento);

dataInput.value = dataLocal();
carregarFechamentoSalvo();
