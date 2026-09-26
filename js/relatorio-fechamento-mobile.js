const paramsRelatorioFechamento = new URLSearchParams(window.location.search);

if (paramsRelatorioFechamento.get("tipo") === "fechamento") {
  document.body.classList.add("relatorio-fechamento-ativo");

  const numeroMoeda = (texto) => {
    const limpo = String(texto || "")
      .replace(/R\$/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");
    const valor = Number(limpo);
    return Number.isFinite(valor) ? valor : 0;
  };

  const prepararTabelaFechamentos = () => {
    const conteudo = document.getElementById("conteudoRelatorio");
    if (!conteudo) return false;

    const secao = [...conteudo.querySelectorAll(".relatorio-secao")]
      .find((item) => item.querySelector("h2")?.textContent?.trim().toLowerCase() === "fechamentos salvos");
    const tabela = secao?.querySelector(".tabela-documento");
    const wrap = secao?.querySelector(".tabela-documento-wrap");
    if (!secao || !tabela || !wrap) return false;

    secao.classList.add("relatorio-secao-fechamento");
    tabela.classList.add("tabela-fechamento");
    wrap.classList.add("tabela-fechamento-wrap");

    const rotulos = [
      "Data",
      "Vendas",
      "Faturamento",
      "Dinheiro",
      "Pix",
      "Cartão",
      "Resultado bruto",
      "Diferença",
    ];

    tabela.querySelectorAll("tbody tr").forEach((linha) => {
      if (linha.querySelector(".sem-registros")) {
        linha.classList.add("fechamento-vazio");
        return;
      }

      [...linha.children].forEach((celula, indice) => {
        celula.dataset.rotulo = rotulos[indice] || "";
      });

      const resultado = linha.children[6];
      const diferenca = linha.children[7];

      if (resultado) {
        resultado.classList.add("valor-resultado");
        const valor = numeroMoeda(resultado.textContent);
        if (valor > 0) resultado.classList.add("positivo");
        if (valor < 0) resultado.classList.add("negativo");
      }

      if (diferenca) {
        diferenca.classList.add("valor-diferenca");
        const valor = numeroMoeda(diferenca.textContent);
        diferenca.classList.add(valor > 0 ? "positivo" : valor < 0 ? "negativo" : "neutro");
      }
    });

    return true;
  };

  if (!prepararTabelaFechamentos()) {
    const alvo = document.getElementById("conteudoRelatorio");
    if (alvo) {
      const observer = new MutationObserver(() => {
        if (prepararTabelaFechamentos()) observer.disconnect();
      });
      observer.observe(alvo, { childList: true, subtree: true });
    }
  }
}
