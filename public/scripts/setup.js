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

  // Pass options to generateBoard so the board can be configured
  const options = {
    mode,
    difficulty: mode === 'pvc' ? (difficulty || 'medium') : null,
    // normalize to 'player-1' or 'player-2' used by GameBoard
    firstPlayer: firstPlayer === 'player2' ? 'player-2' : 'player-1'
  };

  if (typeof generateBoard === 'function') {
    const gb = generateBoard(columns, options);
    // If AI starts first in pvc mode, trigger a roll so AI can act (dice module will dispatch stickRoll when rolled)
    if (options.mode === 'pvc' && options.firstPlayer === 'player-2') {
      // If stickDiceLastRoll is available and has a value, dispatch manually; otherwise leave for user to roll
      if (window.stickDiceLastRoll && typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('stickRoll', { detail: window.stickDiceLastRoll }));
      }
    }
  } else {
    // Fallback: try creating GameBoard directly if generateBoard isn't available
    if (window.GameBoard) {
      // remove existing board container content before creating
      const parent = document.getElementById('board-container');
      parent.innerHTML = '';
      new GameBoard('board-container', columns, options);
    }
  }

  setupModal.classList.add('hidden');

  console.log('Configurações do jogo:', { 
    mode, 
    difficulty: mode === 'pvc' ? difficulty : 'N/A', 
    columns, 
    firstPlayer 
  });
});

setupReset.addEventListener('click', () => setupForm.reset());
