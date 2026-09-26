const paramsRelatorioEstoque = new URLSearchParams(window.location.search);

if (paramsRelatorioEstoque.get("tipo") === "estoque") {
  document.body.classList.add("relatorio-estoque-ativo");

  const prepararTabelaEstoque = () => {
    const conteudo = document.getElementById("conteudoRelatorio");
    if (!conteudo) return false;

    const secao = [...conteudo.querySelectorAll(".relatorio-secao")]
      .find((item) => item.querySelector("h2")?.textContent?.trim().toLowerCase() === "posição atual do estoque");
    const tabela = secao?.querySelector(".tabela-documento");
    const wrap = secao?.querySelector(".tabela-documento-wrap");
    if (!secao || !tabela || !wrap) return false;

    secao.classList.add("relatorio-secao-estoque");
    tabela.classList.add("tabela-estoque");
    wrap.classList.add("tabela-estoque-wrap");

    const rotulos = ["Produto", "Categoria", "Estoque", "Custo unitário", "Preço de venda", "Valor em custo"];
    tabela.querySelectorAll("tbody tr").forEach((linha) => {
      [...linha.children].forEach((celula, indice) => {
        if (celula.classList.contains("sem-registros")) return;
        celula.dataset.rotulo = rotulos[indice] || "";
      });
    });

    return true;
  };

  if (!prepararTabelaEstoque()) {
    const alvo = document.getElementById("conteudoRelatorio");
    if (alvo) {
      const observer = new MutationObserver(() => {
        if (prepararTabelaEstoque()) observer.disconnect();
      });
      observer.observe(alvo, { childList: true, subtree: true });
    }
  }
}
