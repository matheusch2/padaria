import { exigirUsuario } from "./auth.js";

const aviso = document.getElementById("avisoFinanceiro");
const botoesPendentes = [...document.querySelectorAll("[data-financeiro-pendente]")];

botoesPendentes.forEach((botao) => {
  botao.addEventListener("click", () => {
    const nome = botao.dataset.financeiroPendente || "Este módulo";
    aviso.textContent = `${nome}: estrutura visual será montada na próxima etapa.`;
    aviso.hidden = false;
    aviso.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

await exigirUsuario();
