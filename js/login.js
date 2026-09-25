import { entrar, cadastrarUsuario } from "./auth.js";
import { supabase } from "./supabase.js";

const emailInput = document.getElementById("emailLogin");
const senhaInput = document.getElementById("senhaLogin");
const btnEntrar = document.getElementById("btnEntrar");
const btnCriar = document.getElementById("btnCriarConta");
const aviso = document.getElementById("avisoLogin");

function destinoSeguro() {
  const valor = new URLSearchParams(window.location.search).get("redirect") || "index.html";
  if (valor.includes("://") || valor.startsWith("//") || valor.startsWith("/")) return "index.html";
  return valor;
}

function mostrarAviso(texto, sucesso = false) {
  aviso.textContent = texto;
  aviso.classList.toggle("sucesso", sucesso);
  aviso.hidden = false;
}

function bloquear(estado) {
  btnEntrar.disabled = estado;
  btnCriar.disabled = estado;
  emailInput.disabled = estado;
  senhaInput.disabled = estado;
}

async function validarCampos() {
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

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

  return { email, senha };
}

btnEntrar.addEventListener("click", async () => {
  const campos = await validarCampos();
  if (!campos) return;

  bloquear(true);
  aviso.hidden = true;
  try {
    await entrar(campos.email, campos.senha);
    window.location.replace(destinoSeguro());
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível entrar.");
  } finally {
    bloquear(false);
  }
});

btnCriar.addEventListener("click", async () => {
  const campos = await validarCampos();
  if (!campos) return;

  bloquear(true);
  aviso.hidden = true;
  try {
    const dados = await cadastrarUsuario(campos.email, campos.senha);
    if (dados.session) {
      window.location.replace(destinoSeguro());
      return;
    }
    mostrarAviso("Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.", true);
  } catch (erro) {
    mostrarAviso(erro?.message || "Não foi possível criar a conta.");
  } finally {
    bloquear(false);
  }
});

senhaInput.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") btnEntrar.click();
});

const { data } = await supabase.auth.getSession();
if (data.session?.user) window.location.replace(destinoSeguro());
