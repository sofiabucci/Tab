document.addEventListener('DOMContentLoaded', function() {
    const setupForm = document.getElementById('setupForm');
    const setupModal = document.getElementById('setupModal');
    const setupReset = document.getElementById('setupReset');
    const gameModeSelect = document.getElementById('gameMode');
    const difficultyGroup = document.getElementById('difficultyGroup');
    const player2Label = document.getElementById('player2Label');

    if (gameModeSelect) {
        gameModeSelect.addEventListener('change', () => {
            if (gameModeSelect.value === 'pvc') {
                difficultyGroup.style.display = 'flex';
                if (player2Label) player2Label.textContent = 'AI (Maroon)';
            } else if (gameModeSelect.value === 'pvpo') {
                difficultyGroup.style.display = 'none';
                if (player2Label) player2Label.textContent = 'Online Player (Maroon)';
            } else {
                difficultyGroup.style.display = 'none';
                if (player2Label) player2Label.textContent = 'Player 2 (Maroon)';
            }
        });
    }

    if (setupForm) {
        setupForm.addEventListener('submit', e => {
            e.preventDefault();

            const mode = gameModeSelect.value;
            const difficulty = document.getElementById('difficulty').value;
            const columns = parseInt(document.getElementById('boardSize').value);
            const firstPlayer = document.getElementById('firstPlayerSelect').value;

            // Update player labels based on game mode
            if (player2Label) {
                if (mode === 'pvc') {
                    player2Label.textContent = 'AI (Maroon)';
                } else if (mode === 'pvpo') {
                    player2Label.textContent = 'Online Player (Maroon)';
                } else {
                    player2Label.textContent = 'Player 2 (Maroon)';
                }
            }

            // Normalize and pass options to generateBoard so the board can be configured
            const normalizedFirst = (firstPlayer === 'player2' || firstPlayer === 'player-2') ? 'player-2' : 'player-1';
            const options = {
                mode: mode || 'pvp',
                difficulty: mode === 'pvc' ? (difficulty || 'medium') : undefined,
                // normalize to 'player-1' or 'player-2' used by GameBoard
                firstPlayer: normalizedFirst
            };

            if (typeof generateBoard === 'function') {
                const gb = generateBoard(columns, options);
                
                // If AI starts first in pvc mode, trigger a roll so AI can act
                if (options.mode === 'pvc' && options.firstPlayer === 'player-2') {
                    // trigger an actual dice roll so the AI receives a stickRoll event
                    if (typeof window.rollStickDice === 'function') {
                        window.rollStickDice();
                    } else if (window.stickDiceLastRoll && typeof document !== 'undefined') {
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

            if (setupModal) {
                setupModal.classList.add('hidden');
            }

            console.log('Game settings:', { 
                mode, 
                difficulty: mode === 'pvc' ? difficulty : 'N/A', 
                columns, 
                firstPlayer 
            });
        });
    }

    if (setupReset) {
        setupReset.addEventListener('click', () => {
            if (setupForm) setupForm.reset();
            // Reset player labels
            if (player2Label) player2Label.textContent = 'Player 2 (Maroon)';
            if (difficultyGroup) difficultyGroup.style.display = 'none';
        });
    }
});