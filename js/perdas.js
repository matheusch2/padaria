import { CHAVE_PERDAS, lerLista, salvarLista } from "./armazenamento.js";
import { carregarProdutos, ajustarEstoque } from "./produtos.js";

const produtoSelect = document.getElementById("produtoPerda");
const tipoSelect = document.getElementById("tipoSaida");
const quantidadeInput = document.getElementById("quantidadePerda");
const motivoSelect = document.getElementById("motivoPerda");
const observacaoInput = document.getElementById("observacaoPerda");
const aviso = document.getElementById("avisoPerda");
const btnRegistrar = document.getElementById("btnRegistrarPerda");

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarQuantidade(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function lerQuantidade() {
  return Number(String(quantidadeInput.value || "").replace(/\D/g, "")) || 0;
}

function produtoSelecionado() {
  return carregarProdutos().find((produto) => produto.id === produtoSelect.value) || null;
}

function hojeLocal(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataLocalDoISO(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "" : hojeLocal(data);
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mostrarAviso(texto, sucesso = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

function esconderAviso() {
  aviso.hidden = true;
  aviso.classList.remove("sucesso");
}

function carregarSelectProdutos() {
  const produtos = carregarProdutos().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (!produtos.length) {
    produtoSelect.innerHTML = '<option value="">Nenhum produto cadastrado</option>';
    produtoSelect.disabled = true;
    btnRegistrar.disabled = true;
    atualizarResumoProduto();
    return;
  }

  produtoSelect.disabled = false;
  btnRegistrar.disabled = false;
  produtoSelect.innerHTML = '<option value="">Selecione um produto</option>' + produtos
    .map((produto) => `<option value="${produto.id}">${escaparHTML(produto.nome)}</option>`)
    .join("");
}

function atualizarResumoProduto() {
  const produto = produtoSelecionado();
  const resumo = document.getElementById("produtoResumo");
  const quantidade = lerQuantidade();

  if (!produto) {
    resumo.hidden = true;
    document.getElementById("impactoPerda").textContent = formatarMoeda(0);
    return;
  }

  resumo.hidden = false;
  document.getElementById("estoqueAtual").textContent = `${formatarQuantidade(produto.estoque)} ${produto.unidade || "un"}`;
  document.getElementById("custoUnitario").textContent = formatarMoeda(produto.custo);
  document.getElementById("impactoPerda").textContent = formatarMoeda((Number(produto.custo) || 0) * quantidade);
}

function registrarSaida() {
  esconderAviso();
  const produto = produtoSelecionado();
  const quantidade = lerQuantidade();

  if (!produto) {
    mostrarAviso("Selecione um produto.");
    produtoSelect.focus();
    return;
  }

  if (!(quantidade > 0)) {
    mostrarAviso("Informe uma quantidade maior que zero.");
    quantidadeInput.focus();
    return;
  }

  const estoqueAtual = Number(produto.estoque) || 0;
  if (quantidade > estoqueAtual) {
    mostrarAviso(`A quantidade informada é maior que o estoque atual (${formatarQuantidade(estoqueAtual)} ${produto.unidade || "un"}).`);
    quantidadeInput.focus();
    return;
  }

  const custoUnitario = Number(produto.custo) || 0;
  const registro = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    data: new Date().toISOString(),
    produtoId: produto.id,
    nome: produto.nome,
    unidade: produto.unidade || "un",
    tipo: tipoSelect.value,
    quantidade,
    custoUnitario,
    custoTotal: custoUnitario * quantidade,
    motivo: motivoSelect.value,
    observacao: observacaoInput.value.trim(),
  };

  const perdas = lerLista(CHAVE_PERDAS);
  perdas.push(registro);
  salvarLista(CHAVE_PERDAS, perdas);
  ajustarEstoque(produto.id, -quantidade);

  quantidadeInput.value = "";
  observacaoInput.value = "";
  mostrarAviso("Saída registrada. O estoque e o resultado foram atualizados.", true);
  atualizarResumoProduto();
  renderizarHistorico();
}

function estornarRegistro(id) {
  const perdas = lerLista(CHAVE_PERDAS);
  const registro = perdas.find((item) => item.id === id);
  if (!registro) return;

  if (!window.confirm(`Estornar a saída de ${registro.quantidade} ${registro.unidade || "un"} de "${registro.nome}"?`)) return;

  const produtoAtualizado = ajustarEstoque(registro.produtoId, Number(registro.quantidade) || 0);
  if (!produtoAtualizado) {
    mostrarAviso("Não foi possível estornar porque o produto não existe mais no cadastro.");
    return;
  }

  salvarLista(CHAVE_PERDAS, perdas.filter((item) => item.id !== id));
  mostrarAviso("Movimentação estornada e estoque devolvido.", true);
  atualizarResumoProduto();
  renderizarHistorico();
}

function renderizarHistorico() {
  const dataHoje = hojeLocal();
  const registros = lerLista(CHAVE_PERDAS)
    .filter((registro) => dataLocalDoISO(registro.data) === dataHoje)
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const total = registros.reduce((soma, item) => soma + (Number(item.custoTotal) || 0), 0);
  document.getElementById("totalPerdasHoje").textContent = formatarMoeda(total);

  const lista = document.getElementById("listaPerdas");
  if (!registros.length) {
    lista.innerHTML = '<p class="sem-registros">Nenhuma perda ou sobra registrada hoje.</p>';
    return;
  }

  lista.innerHTML = registros.map((registro) => {
    const hora = new Date(registro.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const tipo = registro.tipo === "sobra" ? "Sobra" : "Perda";
    const observacao = registro.observacao ? ` · ${escaparHTML(registro.observacao)}` : "";

    return `
      <div class="perda-item">
        <div class="perda-principal">
          <b>${escaparHTML(registro.nome)}</b>
          <span>${tipo} · ${formatarQuantidade(registro.quantidade)} ${escaparHTML(registro.unidade || "un")} · ${escaparHTML(registro.motivo || "Sem motivo")}${observacao}</span>
        </div>
        <div class="perda-valor">
          <b>− ${formatarMoeda(registro.custoTotal)}</b>
          <small>${hora}</small>
        </div>
        <button class="btn-estornar" type="button" data-estornar="${registro.id}">Estornar</button>
      </div>`;
  }).join("");

  lista.querySelectorAll("[data-estornar]").forEach((botao) => {
    botao.addEventListener("click", () => estornarRegistro(botao.dataset.estornar));
  });
}

produtoSelect.addEventListener("change", () => {
  esconderAviso();
  atualizarResumoProduto();
});
quantidadeInput.addEventListener("input", atualizarResumoProduto);
btnRegistrar.addEventListener("click", registrarSaida);

carregarSelectProdutos();
atualizarResumoProduto();
renderizarHistorico();
