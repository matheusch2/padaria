export const CHAVE_PRODUTOS = "padaria_produtos";
export const CHAVE_VENDAS = "padaria_vendas";

export function lerLista(chave) {
  return JSON.parse(localStorage.getItem(chave) || "[]");
}

export function salvarLista(chave, lista) {
  localStorage.setItem(chave, JSON.stringify(lista));
}
