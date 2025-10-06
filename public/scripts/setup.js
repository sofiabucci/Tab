function initSetup() {
  const form = document.getElementById("gameSetupForm");
  if (!form) {
    console.warn("setupForm não encontrado, HTML pode não estar carregado ainda.");
    return;
  }

  const gameModeSelect = document.getElementById("gameMode");
  const difficultyGroup = document.getElementById("difficultyGroup");

  // Mostra ou esconde a dificuldade conforme o modo de jogo
  gameModeSelect.addEventListener("change", () => {
    if (gameModeSelect.value === "pvc") {
      difficultyGroup.style.display = "block";
    } else {
      difficultyGroup.style.display = "none";
    }
  });

  // Quando o formulário for enviado
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const gameMode = document.getElementById("gameMode").value;
    const difficulty = document.getElementById("difficulty").value;
    const boardSize = document.getElementById("boardSize").value;
    const firstPlayer = document.querySelector("#firstPlayer select").value;

    const config = { gameMode, difficulty, boardSize, firstPlayer };

    // Salva as configurações
    sessionStorage.setItem("tabGameConfig", JSON.stringify(config));

    // Redireciona para o tabuleiro
    window.location.href = "templates/board.html";
  });

  // Botão de reset
  const backBtn = document.getElementById("backBtn");
  backBtn.addEventListener("click", () => form.reset());
}
