/**
 * @file setup.js
 * @description Game setup and configuration management
 * Handles game mode selection, difficulty settings, and board initialization
 */

document.addEventListener('DOMContentLoaded', function() {
    /** @type {HTMLFormElement} */
    const setupForm = document.getElementById('setupForm');
    
    /** @type {HTMLElement} */
    const setupModal = document.getElementById('setupModal');
    
    /** @type {HTMLButtonElement} */
    const setupReset = document.getElementById('setupReset');
    
    /** @type {HTMLSelectElement} */
    const gameModeSelect = document.getElementById('gameMode');
    
    /** @type {HTMLElement} */
    const difficultyGroup = document.getElementById('difficultyGroup');
    
    /** @type {HTMLElement} */
    const player2Label = document.getElementById('player2Label');

    /**
     * Update UI based on selected game mode
     */
    function handleGameModeChange() {
        if (!gameModeSelect) return;

        const mode = gameModeSelect.value;
        
        switch (mode) {
            case 'pvc':
                if (difficultyGroup) difficultyGroup.style.display = 'flex';
                if (player2Label) player2Label.textContent = 'AI (Maroon)';
                break;
            case 'pvpo':
                if (difficultyGroup) difficultyGroup.style.display = 'none';
                if (player2Label) player2Label.textContent = 'Online Player (Maroon)';
                break;
            default:
                if (difficultyGroup) difficultyGroup.style.display = 'none';
                if (player2Label) player2Label.textContent = 'Player 2 (Maroon)';
        }
    }

    /**
     * Handle game setup form submission
     * @param {Event} e - Form submit event
     */
    async function handleSetupSubmit(e) {
        e.preventDefault();

        const mode = gameModeSelect.value;
        const difficulty = document.getElementById('difficulty').value;
        const columns = parseInt(document.getElementById('boardSize').value);
        const firstPlayer = document.getElementById('firstPlayerSelect').value;

        // ONLINE GAME - handled by online manager
        if (mode === 'pvpo') {
            const success = await window.onlineGameManager.startOnlineGame(columns, firstPlayer);
            if (success) {
                closeSetupModal();
            }
            return;
        }

        // LOCAL GAMES - existing logic
        updatePlayerLabels(mode);

        const normalizedFirst = (firstPlayer === 'player2' || firstPlayer === 'player-2') ? 'player-2' : 'player-1';
        const options = {
            mode: mode || 'pvp',
            difficulty: mode === 'pvc' ? (difficulty || 'medium') : undefined,
            firstPlayer: normalizedFirst
        };

        initializeGameBoard(columns, options);
        closeSetupModal();

        console.log('Game settings:', { mode, difficulty, columns, firstPlayer });
    }

    /**
     * Update player labels based on game mode
     * @param {string} mode - Game mode
     */
    function updatePlayerLabels(mode) {
        if (!player2Label) return;

        const labels = {
            'pvc': 'AI (Maroon)',
            'pvpo': 'Online Player (Maroon)',
            'pvp': 'Player 2 (Maroon)'
        };

        player2Label.textContent = labels[mode] || labels.pvp;
    }

    /**
     * Initialize the game board with specified options
     * @param {number} columns - Number of board columns
     * @param {Object} options - Game configuration options
     */
    function initializeGameBoard(columns, options) {
        // Set game start time for classification
        if (window.game) {
            window.game.gameStartTime = Date.now();
        }
        
        if (typeof generateBoard === 'function') {
            const gameBoard = generateBoard(columns, options);
            
            // Set game start time
            gameBoard.gameStartTime = Date.now();
            
            // Trigger AI start if applicable
            if (options.mode === 'pvc' && options.firstPlayer === 'player-2') {
                setTimeout(() => {
                    if (gameBoard.isAITurn()) {
                        gameBoard.triggerAIRoll();
                    }
                }, 1500);
            }
        } else if (window.GameBoard) {
            // Fallback initialization
            const parent = document.getElementById('board-container');
            if (parent) {
                parent.innerHTML = '';
                const gameBoard = new GameBoard('board-container', columns, options);
                gameBoard.gameStartTime = Date.now();
            }
        }
    }

    /**
     * Close setup modal
     */
    function closeSetupModal() {
        if (setupModal) {
            setupModal.classList.add('hidden');
        }
    }

    /**
     * Reset setup form to default values
     */
    function resetSetupForm() {
        if (setupForm) setupForm.reset();
        if (player2Label) player2Label.textContent = 'Player 2 (Maroon)';
        if (difficultyGroup) difficultyGroup.style.display = 'none';
    }

    // Event listeners
    if (gameModeSelect) {
        gameModeSelect.addEventListener('change', handleGameModeChange);
    }

    if (setupForm) {
        setupForm.addEventListener('submit', handleSetupSubmit);
    }

    if (setupReset) {
        setupReset.addEventListener('click', resetSetupForm);
    }
});