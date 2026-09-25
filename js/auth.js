import { supabase } from "./supabase.js";

function paginaAtual() {
  const nome = window.location.pathname.split("/").pop() || "index.html";
  return `${nome}${window.location.search || ""}`;
}

export async function obterUsuario() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}

export async function exigirUsuario() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    const destino = encodeURIComponent(paginaAtual());
    window.location.replace(`login.html?redirect=${destino}`);
    return null;
  }

  return data.session.user;
}

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: senha,
  });
  if (error) throw error;
  return data;
}

export async function cadastrarUsuario(email, senha) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: senha,
  });
  if (error) throw error;
  return data;
}

export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.replace("login.html");
}
