import { redefinirSenha, revelarPagina } from "./auth.js";
import { supabase } from "./supabase.js";

const novaSenhaInput = document.getElementById("novaSenha");
const confirmarNovaSenhaInput = document.getElementById("confirmarNovaSenha");
const btnSalvar = document.getElementById("btnSalvar");
const btnAlternarSenha = document.getElementById("btnAlternarSenha");
const btnAlternarConfirmarSenha = document.getElementById("btnAlternarConfirmarSenha");
const aviso = document.getElementById("avisoRedefinir");

function mostrarAviso(texto, sucesso = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

function bloquear(estado) {
  btnSalvar.disabled = estado;
  novaSenhaInput.disabled = estado;
  confirmarNovaSenhaInput.disabled = estado;
}

function alternarVisibilidade(campo, botao) {
  const exibindo = campo.type === "text";
  campo.type = exibindo ? "password" : "text";
  botao.setAttribute("aria-pressed", String(!exibindo));
  botao.setAttribute("aria-label", exibindo ? "Mostrar senha" : "Ocultar senha");
}

btnSalvar.addEventListener("click", async () => {
  const novaSenha = novaSenhaInput.value;
  const confirmar = confirmarNovaSenhaInput.value;

  aviso.hidden = true;

  if (novaSenha.length < 6) {
    mostrarAviso("A senha precisa ter pelo menos 6 caracteres.");
    novaSenhaInput.focus();
    return;
  }

  if (novaSenha !== confirmar) {
    mostrarAviso("As senhas não são iguais.");
    confirmarNovaSenhaInput.focus();
    return;
  }

  bloquear(true);
  try {
    await redefinirSenha(novaSenha);
    window.location.replace("index.html");
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível salvar a nova senha.");
    bloquear(false);
  }
});

btnAlternarSenha.addEventListener("click", () => alternarVisibilidade(novaSenhaInput, btnAlternarSenha));
btnAlternarConfirmarSenha.addEventListener("click", () => alternarVisibilidade(confirmarNovaSenhaInput, btnAlternarConfirmarSenha));

confirmarNovaSenhaInput.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") btnSalvar.click();
});

const { data } = await supabase.auth.getSession();
if (data.session?.user) {
  revelarPagina();
} else {
  mostrarAviso("Link inválido ou expirado. Solicite um novo link de recuperação.");
  bloquear(true);
  revelarPagina();
}
