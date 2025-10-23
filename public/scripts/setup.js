document.addEventListener('DOMContentLoaded', () => {
  const setupForm = document.getElementById('setupForm');
  const setupModal = document.getElementById('setupModal');
  const setupReset = document.getElementById('setupReset');

  const gameModeSelect = document.getElementById('gameMode');
  const difficultyGroup = document.getElementById('difficultyGroup');

  if (gameModeSelect && difficultyGroup) {
    gameModeSelect.addEventListener('change', () => {
      if (gameModeSelect.value === 'pvc') {
        difficultyGroup.style.display = 'flex';
      } else {
        difficultyGroup.style.display = 'none';
      }
    });
  }

  if (!setupForm) {
    console.warn('setupForm not found — setup UI will be disabled');
    return;
  }

  setupForm.addEventListener('submit', e => {
    e.preventDefault();

    const mode = (gameModeSelect && gameModeSelect.value) || 'pvp';
    const difficultyEl = document.getElementById('difficulty');
    const difficulty = difficultyEl ? difficultyEl.value : null;
    const boardSizeEl = document.getElementById('boardSize');
    const columns = boardSizeEl ? parseInt(boardSizeEl.value) : 9;
    const firstPlayerEl = document.getElementById('firstPlayerSelect');
    const firstPlayer = firstPlayerEl ? firstPlayerEl.value : 'player1';

    // Pass options to generateBoard so the board can be configured
    const options = {
      mode,
      difficulty: mode === 'pvc' ? (difficulty || 'medium') : null,
      // normalize to 'player-1' or 'player-2' used by GameBoard
      firstPlayer: firstPlayer === 'player2' ? 'player-2' : 'player-1',
      algorithm: mode === 'pvc' ? 'MINIMAX' : null
    };

    // Set global IA algorithm for runtime
    if (mode === 'pvc') {
      window.IA = window.IA || {};
      window.IA.algorithm = 'MINIMAX';
    }

    // Always clear board container before creating new board
    const parent = document.getElementById('board-container');
    if (parent) parent.innerHTML = '';
    if (typeof generateBoard === 'function') {
      try {
        generateBoard(columns, options);
      } catch (err) {
        console.error('Error generating board:', err);
      }
      // If AI starts first in pvc mode, trigger a roll so AI can act (dice module will dispatch stickRoll when rolled)
      if (options.mode === 'pvc' && options.firstPlayer === 'player-2') {
        if (window.stickDiceLastRoll && typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('stickRoll', { detail: window.stickDiceLastRoll }));
        }
      }
    } else {
      if (window.GameBoard) {
        try { new GameBoard('board-container', columns, options); } catch (err) { console.error(err); }
      }
    }

    if (setupModal) setupModal.classList.add('hidden');

    console.log('Configurações do jogo:', { 
      mode, 
      difficulty: mode === 'pvc' ? difficulty : 'N/A', 
      columns, 
      firstPlayer 
    });
  });

  if (setupReset && typeof setupReset.addEventListener === 'function') {
    setupReset.addEventListener('click', () => setupForm.reset());
  }
});
