import { cadastrarUsuario, revelarPagina } from "./auth.js";
import { supabase } from "./supabase.js";

const emailInput = document.getElementById("emailCadastro");
const senhaInput = document.getElementById("senhaCadastro");
const confirmarSenhaInput = document.getElementById("confirmarSenhaCadastro");
const btnCriar = document.getElementById("btnCriar");
const btnAlternarSenha = document.getElementById("btnAlternarSenha");
const btnAlternarConfirmarSenha = document.getElementById("btnAlternarConfirmarSenha");
const aviso = document.getElementById("avisoCadastro");

const DESTINO_APOS_CADASTRO = "index.html";

function mostrarAviso(texto, sucesso = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

function bloquear(estado) {
  btnCriar.disabled = estado;
  emailInput.disabled = estado;
  senhaInput.disabled = estado;
  confirmarSenhaInput.disabled = estado;
  btnAlternarSenha.disabled = estado;
  btnAlternarConfirmarSenha.disabled = estado;
}

function alternarVisibilidade(campo, botao) {
  const exibindo = campo.type === "text";
  campo.type = exibindo ? "password" : "text";
  botao.setAttribute("aria-pressed", String(!exibindo));
  botao.setAttribute("aria-label", exibindo ? "Mostrar senha" : "Ocultar senha");
}

async function validarCampos() {
  const email = emailInput.value.trim();
  const senha = senhaInput.value;
  const confirmarSenha = confirmarSenhaInput.value;

  if (!email || !email.includes("@")) {
    mostrarAviso("Informe um e-mail válido.");
    emailInput.focus();
    return null;
  }

  if (senha.length < 6) {
    mostrarAviso("A senha precisa ter pelo menos 6 caracteres.");
    senhaInput.focus();
    return null;
  }

  if (senha !== confirmarSenha) {
    mostrarAviso("As senhas não são iguais.");
    confirmarSenhaInput.focus();
    return null;
  }

  return { email, senha };
}

btnCriar.addEventListener("click", async () => {
  const campos = await validarCampos();
  if (!campos) return;

  bloquear(true);
  aviso.hidden = true;
  try {
    const dados = await cadastrarUsuario(campos.email, campos.senha);
    if (dados.session) {
      window.location.replace(DESTINO_APOS_CADASTRO);
      return;
    }
    mostrarAviso("Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre.", true);
    emailInput.value = "";
    senhaInput.value = "";
    confirmarSenhaInput.value = "";
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível criar a conta.");
  } finally {
    bloquear(false);
  }
});

btnAlternarSenha.addEventListener("click", () => alternarVisibilidade(senhaInput, btnAlternarSenha));
btnAlternarConfirmarSenha.addEventListener("click", () => alternarVisibilidade(confirmarSenhaInput, btnAlternarConfirmarSenha));

confirmarSenhaInput.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") btnCriar.click();
});

const { data } = await supabase.auth.getSession();
if (data.session?.user) {
  window.location.replace(DESTINO_APOS_CADASTRO);
} else {
  revelarPagina();
}
