import { exigirUsuario } from "./auth.js";
import {
  listarRecorrentes,
  criarRecorrente,
  alternarRecorrente,
  excluirRecorrente,
} from "./financeiro-api.js";

const listaEl = document.getElementById("listaRecorrentes");
const formRecorrente = document.getElementById("formRecorrente");
const btnNovaRecorrente = document.getElementById("btnNovaRecorrente");
const btnCancelarRecorrente = document.getElementById("btnCancelarRecorrente");
const btnSalvarRecorrente = document.getElementById("btnSalvarRecorrente");
const avisoRecorrenteForm = document.getElementById("avisoRecorrenteForm");

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function renderizar(itens) {
  if (itens.length === 0) {
    listaEl.innerHTML = `<p class="sem-contas">Nenhuma recorrência cadastrada ainda.</p>`;
    return;
  }

  listaEl.innerHTML = itens
    .map((item) => {
      const meta = [item.categoria, item.pessoa].filter(Boolean).join(" · ");
      const tipoRotulo = item.tipo === "pagar" ? "Despesa" : "Receita";

      return `
      <div class="recorrente-item${item.ativo ? "" : " inativo"}">
        <div class="recorrente-info">
          <b>${escaparHTML(item.descricao)}</b>
          <span>${tipoRotulo}${meta ? " · " + escaparHTML(meta) : ""}</span>
          <span class="recorrente-valor">${formatarMoeda(item.valor)} · todo dia ${item.dia_vencimento}</span>
        </div>
        <div class="recorrente-acao">
          <button type="button" class="recorrente-toggle${item.ativo ? " ativo" : ""}" data-id="${item.id}" data-ativo="${item.ativo}">
            ${item.ativo ? "Ativa" : "Pausada"}
          </button>
          <button type="button" class="recorrente-excluir" data-id="${item.id}" aria-label="Excluir">${iconeLixeira()}</button>
        </div>
      </div>`;
    })
    .join("");

  listaEl.querySelectorAll(".recorrente-toggle").forEach((botao) => {
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      try {
        await alternarRecorrente(botao.dataset.id, botao.dataset.ativo !== "true");
        await carregar();
      } catch (erro) {
        window.alert(erro?.message || "Não foi possível atualizar.");
        botao.disabled = false;
      }
    });
  });

  listaEl.querySelectorAll(".recorrente-excluir").forEach((botao) => {
    botao.addEventListener("click", async () => {
      if (!window.confirm("Excluir esta recorrência? Lançamentos já gerados continuam no histórico.")) return;
      botao.disabled = true;
      try {
        await excluirRecorrente(botao.dataset.id);
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
    const itens = await listarRecorrentes();
    renderizar(itens);
  } catch (erro) {
    listaEl.innerHTML = `<p class="sem-contas">${escaparHTML(erro?.message || "Não foi possível carregar.")}</p>`;
  }
}

function limparFormulario() {
  document.getElementById("campoTipoRecorrente").value = "pagar";
  document.getElementById("campoDescricaoRecorrente").value = "";
  document.getElementById("campoCategoriaRecorrente").value = "";
  document.getElementById("campoPessoaRecorrente").value = "";
  document.getElementById("campoValorRecorrente").value = "";
  document.getElementById("campoDiaRecorrente").value = "";
  avisoRecorrenteForm.hidden = true;
}

btnNovaRecorrente.addEventListener("click", () => {
  formRecorrente.hidden = false;
  btnNovaRecorrente.hidden = true;
  formRecorrente.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

btnCancelarRecorrente.addEventListener("click", () => {
  formRecorrente.hidden = true;
  btnNovaRecorrente.hidden = false;
  limparFormulario();
});

btnSalvarRecorrente.addEventListener("click", async () => {
  const descricao = document.getElementById("campoDescricaoRecorrente").value.trim();
  const valor = parseMoedaBR(document.getElementById("campoValorRecorrente").value);
  const dia = parseInteiroBR(document.getElementById("campoDiaRecorrente").value);

  avisoRecorrenteForm.hidden = true;

  if (!descricao) {
    avisoRecorrenteForm.textContent = "Digite uma descrição.";
    avisoRecorrenteForm.hidden = false;
    return;
  }

  if (!(valor > 0)) {
    avisoRecorrenteForm.textContent = "Informe um valor válido.";
    avisoRecorrenteForm.hidden = false;
    return;
  }

  if (!(dia >= 1 && dia <= 28)) {
    avisoRecorrenteForm.textContent = "O dia do vencimento deve ser entre 1 e 28.";
    avisoRecorrenteForm.hidden = false;
    return;
  }

  btnSalvarRecorrente.disabled = true;
  try {
    await criarRecorrente({
      tipo: document.getElementById("campoTipoRecorrente").value,
      descricao,
      categoria: document.getElementById("campoCategoriaRecorrente").value.trim(),
      pessoa: document.getElementById("campoPessoaRecorrente").value.trim(),
      valor,
      diaVencimento: dia,
    });

    formRecorrente.hidden = true;
    btnNovaRecorrente.hidden = false;
    limparFormulario();
    await carregar();
  } catch (erro) {
    avisoRecorrenteForm.textContent = erro?.message || "Não foi possível salvar.";
    avisoRecorrenteForm.hidden = false;
  } finally {
    btnSalvarRecorrente.disabled = false;
  }
});

const usuario = await exigirUsuario();
if (usuario) await carregar();
