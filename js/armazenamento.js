export const CHAVE_PRODUTOS = "padaria_produtos";
export const CHAVE_VENDAS = "padaria_vendas";
export const CHAVE_PERDAS = "padaria_perdas";
export const CHAVE_FECHAMENTOS = "padaria_fechamentos";

export function lerLista(chave) {
  try {
    const valor = JSON.parse(localStorage.getItem(chave) || "[]");
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

export function salvarLista(chave, lista) {
  localStorage.setItem(chave, JSON.stringify(lista));
}
