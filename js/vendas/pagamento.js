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

export function atualizarResumoPagamento(formatarMoeda, totalVenda = 0) {
  const { total: totalInformado } = valoresPagamento();
  const resumo = document.getElementById("totalInformado");
  const badge = document.getElementById("pagamentoDiferencaTexto");

  resumo.textContent = formatarMoeda(totalInformado);

  const saldo = totalVenda - totalInformado;
  const valoresConferem = Math.abs(saldo) < 0.005;
  resumo.classList.toggle("ok", valoresConferem && totalVenda > 0);

  if (!badge) return;

  badge.className = "";

  if (totalVenda <= 0) {
    badge.textContent = "Adicione produtos para calcular o restante.";
    badge.classList.add("pagamento-diferenca-vazio");
    return;
  }

  if (valoresConferem) {
    badge.textContent = "Pagamento completo";
    badge.classList.add("badge-sucesso");
    return;
  }

  if (saldo > 0) {
    badge.textContent = `Falta ${formatarMoeda(saldo)}`;
    badge.classList.add("badge-aviso");
    return;
  }

  badge.textContent = `Excede em ${formatarMoeda(Math.abs(saldo))}`;
  badge.classList.add("badge-erro");
}

export function limparCamposPagamento() {
  ["valorDinheiro", "valorCartao", "valorPix"].forEach((id) => {
    document.getElementById(id).value = "";
  });
}
