import { recuperarSenha, revelarPagina } from "./auth.js";
import { supabase } from "./supabase.js";

const emailInput = document.getElementById("emailRecuperar");
const btnEnviar = document.getElementById("btnEnviar");
const aviso = document.getElementById("avisoRecuperar");

function mostrarAviso(texto, sucesso = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

btnEnviar.addEventListener("click", async () => {
  const email = emailInput.value.trim();

  if (!email || !email.includes("@")) {
    mostrarAviso("Informe um e-mail válido.");
    emailInput.focus();
    return;
  }

  btnEnviar.disabled = true;
  emailInput.disabled = true;
  aviso.hidden = true;
  try {
    await recuperarSenha(email);
    mostrarAviso("Enviamos um link para seu e-mail. Confira sua caixa de entrada para criar uma nova senha.", true);
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível enviar o link de recuperação.");
    btnEnviar.disabled = false;
    emailInput.disabled = false;
  }
});

emailInput.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") btnEnviar.click();
});

const { data } = await supabase.auth.getSession();
if (data.session?.user) {
  window.location.replace("index.html");
} else {
  revelarPagina();
}
