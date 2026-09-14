import { obterTotalVenda } from "./carrinho.js";

export function valoresPagamento() {
  const dinheiro = Number(document.getElementById("valorDinheiro").value) || 0;
  const cartao = Number(document.getElementById("valorCartao").value) || 0;
  const pix = Number(document.getElementById("valorPix").value) || 0;

  return {
    dinheiro,
    cartao,
    pix,
    total: dinheiro + cartao + pix,
  };
}

export function atualizarResumoPagamento(formatarMoeda) {
  const { total: totalInformado } = valoresPagamento();
  const totalVenda = obterTotalVenda();
  const resumo = document.getElementById("totalInformado");

  resumo.textContent = formatarMoeda(totalInformado);

  const valoresConferem = Math.abs(totalInformado - totalVenda) < 0.005;
  resumo.classList.toggle("ok", valoresConferem && totalVenda > 0);
}

export function limparCamposPagamento() {
  ["valorDinheiro", "valorCartao", "valorPix"].forEach((id) => {
    document.getElementById(id).value = "";
  });
}
