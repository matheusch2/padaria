import { exigirUsuario, sair } from "./auth.js";

const usuario = await exigirUsuario();

if (usuario) {
  const avatar = document.querySelector(".avatar");
  const botaoConfig = document.querySelector(".config");
  const inicial = (usuario.email || "U").trim().charAt(0).toUpperCase() || "U";

  if (avatar) {
    avatar.textContent = inicial;
    avatar.setAttribute("aria-label", `Usuário ${usuario.email || "autenticado"}`);
    avatar.title = usuario.email || "Usuário autenticado";
  }

  if (botaoConfig) {
    botaoConfig.title = "Sair da conta";
    botaoConfig.setAttribute("aria-label", "Sair da conta");
    botaoConfig.addEventListener("click", async () => {
      if (!window.confirm("Sair da conta?")) return;
      try {
        await sair();
      } catch (erro) {
        window.alert(erro?.message || "Não foi possível sair.");
      }
    });
  }
}
