import { exigirUsuario } from "./auth.js";
import {
  gerarRecorrentesPendentes,
  listarLancamentos,
  criarLancamento,
  marcarComoPago,
  excluirLancamento,
} from "./financeiro-api.js";

const listaEl = document.getElementById("listaLancamentos");
const totalReceitasEl = document.getElementById("totalReceitas");
const totalDespesasEl = document.getElementById("totalDespesas");
const totalSaldoEl = document.getElementById("totalSaldo");
const botoesPeriodo = [...document.querySelectorAll("[data-periodo]")];
const botoesTipo = [...document.querySelectorAll("[data-tipo]")];

const formLancamento = document.getElementById("formLancamento");
const btnNovoLancamento = document.getElementById("btnNovoLancamento");
const btnCancelarLancamento = document.getElementById("btnCancelarLancamento");
const btnSalvarLancamento = document.getElementById("btnSalvarLancamento");
const avisoLancamentoForm = document.getElementById("avisoLancamentoForm");

let periodoAtivo = "mes";
let tipoAtivo = "todos";
let cache = [];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconeLixeira() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>`;
}

function limitesDoPeriodo(periodo) {
  const hoje = new Date();

  if (periodo === "mes") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
  }

  if (periodo === "mes-passado") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
  }

  return {};
}

function atualizarResumo() {
  const realizados = cache.filter((item) => item.status === "pago");
  const receitas = realizados.filter((item) => item.tipo === "receber").reduce((s, i) => s + Number(i.valor), 0);
  const despesas = realizados.filter((item) => item.tipo === "pagar").reduce((s, i) => s + Number(i.valor), 0);

  totalReceitasEl.textContent = formatarMoeda(receitas);
  totalDespesasEl.textContent = formatarMoeda(despesas);
  totalSaldoEl.textContent = formatarMoeda(receitas - despesas);
  totalSaldoEl.style.color = receitas - despesas < 0 ? "rgb(var(--erro))" : "";
}

function renderizarLista() {
  const itens = tipoAtivo === "todos" ? cache : cache.filter((item) => item.tipo === tipoAtivo);
  const ordenados = [...itens].sort((a, b) => b.vencimento.localeCompare(a.vencimento));

  if (ordenados.length === 0) {
    listaEl.innerHTML = `<p class="sem-contas">Nenhum lançamento neste período.</p>`;
    return;
  }

  listaEl.innerHTML = ordenados
    .map((item) => {
      const meta = [item.categoria, item.pessoa].filter(Boolean).join(" · ");
      const badgeStatus = item.status === "pago" ? "badge-sucesso" : "badge-aviso";
      const rotuloStatus = item.status === "pago" ? "Pago" : "Pendente";

      return `
      <div class="lancamento-item">
        <div class="lancamento-info">
          <div class="lancamento-meta-linha">
            <span class="lancamento-tipo-badge ${item.tipo}">${item.tipo === "receber" ? "Receita" : "Despesa"}</span>
            <span class="${badgeStatus}">${rotuloStatus}</span>
          </div>
          <b>${escaparHTML(item.descricao)}</b>
          <span>${escaparHTML(meta || "Sem categoria")} · ${formatarData(item.vencimento)}</span>
        </div>
        <div class="lancamento-acao">
          <b>${formatarMoeda(item.valor)}</b>
          ${
            item.status === "pendente"
              ? `<button type="button" class="lancamento-marcar-pago" data-id="${item.id}">Marcar como feito</button>`
              : `<button type="button" class="lancamento-excluir" data-id="${item.id}" aria-label="Excluir">${iconeLixeira()}</button>`
          }
        </div>
      </div>`;
    })
    .join("");

  listaEl.querySelectorAll(".lancamento-marcar-pago").forEach((botao) => {
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      try {
        await marcarComoPago(botao.dataset.id);
        await carregar();
      } catch (erro) {
        window.alert(erro?.message || "Não foi possível atualizar.");
        botao.disabled = false;
      }
    });
  });

  listaEl.querySelectorAll(".lancamento-excluir").forEach((botao) => {
    botao.addEventListener("click", async () => {
      if (!window.confirm("Excluir este lançamento?")) return;
      botao.disabled = true;
      try {
        await excluirLancamento(botao.dataset.id);
        await carregar();
      } catch (erro) {
        window.alert(erro?.message || "Não foi possível excluir.");
        botao.disabled = false;
      }
    });
  });
}

async function carregar() {
  listaEl.innerHTML = `<p class="sem-contas">Carregando...</p>`;
  try {
    cache = await listarLancamentos(limitesDoPeriodo(periodoAtivo));
    atualizarResumo();
    renderizarLista();
  } catch (erro) {
    listaEl.innerHTML = `<p class="sem-contas">${escaparHTML(erro?.message || "Não foi possível carregar.")}</p>`;
  }
}

botoesPeriodo.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPeriodo.forEach((item) => item.classList.toggle("ativo", item === botao));
    periodoAtivo = botao.dataset.periodo;
    carregar();
  });
});

botoesTipo.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesTipo.forEach((item) => item.classList.toggle("ativo", item === botao));
    tipoAtivo = botao.dataset.tipo;
    renderizarLista();
  });
});

function limparFormulario() {
  document.getElementById("campoTipoLancamento").value = "pagar";
  document.getElementById("campoDescricaoLancamento").value = "";
  document.getElementById("campoCategoriaLancamento").value = "";
  document.getElementById("campoPessoaLancamento").value = "";
  document.getElementById("campoValorLancamento").value = "";
  document.getElementById("campoDataLancamento").value = new Date().toISOString().slice(0, 10);
  document.getElementById("campoJaLancado").checked = true;
  avisoLancamentoForm.hidden = true;
}

btnNovoLancamento.addEventListener("click", () => {
  limparFormulario();
  formLancamento.hidden = false;
  btnNovoLancamento.hidden = true;
  formLancamento.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

btnCancelarLancamento.addEventListener("click", () => {
  formLancamento.hidden = true;
  btnNovoLancamento.hidden = false;
});

btnSalvarLancamento.addEventListener("click", async () => {
  const descricao = document.getElementById("campoDescricaoLancamento").value.trim();
  const valor = parseMoedaBR(document.getElementById("campoValorLancamento").value);
  const data = document.getElementById("campoDataLancamento").value;

  avisoLancamentoForm.hidden = true;

  if (!descricao) {
    avisoLancamentoForm.textContent = "Digite uma descrição.";
    avisoLancamentoForm.hidden = false;
    return;
  }

  if (!(valor > 0)) {
    avisoLancamentoForm.textContent = "Informe um valor válido.";
    avisoLancamentoForm.hidden = false;
    return;
  }

  if (!data) {
    avisoLancamentoForm.textContent = "Escolha a data.";
    avisoLancamentoForm.hidden = false;
    return;
  }

  btnSalvarLancamento.disabled = true;
  try {
    await criarLancamento({
      tipo: document.getElementById("campoTipoLancamento").value,
      descricao,
      categoria: document.getElementById("campoCategoriaLancamento").value.trim(),
      pessoa: document.getElementById("campoPessoaLancamento").value.trim(),
      valor,
      vencimento: data,
      jaPago: document.getElementById("campoJaLancado").checked,
    });

    formLancamento.hidden = true;
    btnNovoLancamento.hidden = false;
    await carregar();
  } catch (erro) {
    avisoLancamentoForm.textContent = erro?.message || "Não foi possível salvar.";
    avisoLancamentoForm.hidden = false;
  } finally {
    btnSalvarLancamento.disabled = false;
  }
});

const usuario = await exigirUsuario();
if (usuario) {
  try {
    await gerarRecorrentesPendentes();
  } catch (erro) {
    console.error(erro);
  }
  await carregar();
}
