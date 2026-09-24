import { obterTotalVenda } from "./carrinho.js";

export function valoresPagamento() {
  const dinheiro = parseMoedaBR(document.getElementById("valorDinheiro").value);
  const cartao = parseMoedaBR(document.getElementById("valorCartao").value);
  const pix = parseMoedaBR(document.getElementById("valorPix").value);

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
  const diferenca = document.getElementById("pagamentoDiferenca");

  resumo.textContent = formatarMoeda(totalInformado);

  const saldo = totalVenda - totalInformado;
  const valoresConferem = Math.abs(saldo) < 0.005;
  resumo.classList.toggle("ok", valoresConferem && totalVenda > 0);

  if (!diferenca) return;

  diferenca.classList.remove("ok");

  if (totalVenda <= 0) {
    diferenca.textContent = "Adicione produtos para calcular o restante.";
    return;
  }

  if (valoresConferem) {
    diferenca.textContent = "Pagamento completo";
    diferenca.classList.add("ok");
    return;
  }

  if (saldo > 0) {
    diferenca.textContent = `Falta ${formatarMoeda(saldo)} para completar a venda`;
    return;
  }

  diferenca.textContent = `Valor excede a venda em ${formatarMoeda(Math.abs(saldo))}`;
}

export function limparCamposPagamento() {
  ["valorDinheiro", "valorCartao", "valorPix"].forEach((id) => {
    document.getElementById(id).value = "";
  });
}
