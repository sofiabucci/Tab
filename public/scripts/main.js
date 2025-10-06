// scripts/main.js
document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("app");

  // Carrega o HTML do setup dinamicamente
  const response = await fetch("templates/setup.html");
  const setupHTML = await response.text();

  // Injeta o conteúdo no app
  app.innerHTML = setupHTML;

  // Agora que o HTML foi injetado, inicializa a lógica do setup
  if (typeof initSetup === "function") {
    initSetup();
  } else {
    console.error("⚠️ initSetupForm() não foi encontrada. Verifica se setupForm.js está carregado.");
  }
});
