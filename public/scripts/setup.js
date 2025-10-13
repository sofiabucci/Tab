const setupForm = document.getElementById('setupForm');
const setupModal = document.getElementById('setupModal');
const setupReset = document.getElementById('setupReset');

const gameModeSelect = document.getElementById('gameMode');
const difficultyGroup = document.getElementById('difficultyGroup');

gameModeSelect.addEventListener('change', () => {
  if (gameModeSelect.value === 'pvc') {
    difficultyGroup.style.display = 'flex';
  } else {
    difficultyGroup.style.display = 'none';
  }
});

setupForm.addEventListener('submit', e => {
  e.preventDefault();

  const mode = gameModeSelect.value;
  const difficulty = document.getElementById('difficulty').value;
  const columns = parseInt(document.getElementById('boardSize').value);
  const firstPlayer = document.getElementById('firstPlayerSelect').value;

  generateBoard(columns);

  setupModal.classList.add('hidden');

  console.log('Configurações do jogo:', { 
    mode, 
    difficulty: mode === 'pvc' ? difficulty : 'N/A', 
    columns, 
    firstPlayer 
  });
});

setupReset.addEventListener('click', () => setupForm.reset());
