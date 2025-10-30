/**
 * @file board.js
 * @description
 * Implements the DOM-based game board for Tâb game.
 * Manages game state, piece movement, turn validation, AI integration,
 * and rendering of a 4×N grid with complete game logic.
 * 
 * This class handles the complete game flow including dice rolling,
 * player turns, piece movement, captures, and game end conditions.
 */

/**
 * GameBoard class for Tâb game
 * @class
 */
class GameBoard {
    /**
     * Creates a new GameBoard instance
     * @param {string} id - The ID of the board container element
     * @param {number} cols - Number of columns for the board
     * @param {Object} options - Game configuration options
     * @param {string} options.mode - Game mode ('pvp', 'pvc', 'pvpo')
     * @param {string} options.difficulty - AI difficulty ('easy', 'medium', 'hard')
     * @param {string} options.firstPlayer - Starting player ('player-1' or 'player-2')
     */
    constructor(id, cols, options = {}) {
        /** @type {number} */
        this.cols = parseInt(cols) || 9;
        
        /** @type {Array} */
        this.content = Array(this.cols * 4).fill(null);
        
        /** @type {Object} */
        this.options = {
            mode: options.mode || 'pvp',
            difficulty: options.difficulty || 'medium',
            firstPlayer: options.firstPlayer || 'player-1'
        };

        /** @type {string} */
        this.currentPlayer = this.options.firstPlayer;
        
        /** @type {boolean} */
        this.gameActive = true;
        
        /** @type {boolean} */
        this.diceRolled = false;

        this.initBoard(id);
        this.setupPieces();
        this.render();
        
        // Initialize dice rolling control
        if (window.enableStickRolling) {
            const isHumanTurn = !this.isAITurn();
            window.isPlayerTurn = isHumanTurn;
            window.enableStickRolling();
        }
        
        // AI starts automatically if first player
        if (this.isAITurn()) {
            setTimeout(() => this.triggerAIRoll(), 1000);
        }
    }

    /**
     * Initializes the board DOM structure
     * @param {string} id - The container element ID
     */
    initBoard(id) {
        const parent = document.getElementById(id);
        parent.innerHTML = '<div class="board"></div>';
        const board = parent.querySelector('.board');
        board.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        
        for (let i = 0; i < this.cols * 4; i++) {
            const cell = document.createElement('div');
            cell.className = 'board-square';
            cell.onclick = () => this.handleClick(i);
            board.appendChild(cell);
        }
    }

    /**
     * Sets up the initial piece positions
     */
    setupPieces() {
        // Player 2 (top row - linha 0) - PRIMEIRA PEÇA NO SENTIDO DA LINHA (←)
        for (let c = 0; c < this.cols; c++) {
            this.content[c] = { 
                player: 'player-2',
                hasConverted: false 
            };
        }
        // Player 1 (bottom row - linha 3) - PRIMEIRA PEÇA NO SENTIDO DA LINHA (→)
        for (let c = 0; c < this.cols; c++) {
            this.content[3 * this.cols + c] = { 
                player: 'player-1',
                hasConverted: false 
            };
        }
    }

    /**
     * Gets movement direction for a given row
     * @param {number} row - The row index (0-3)
     * @returns {number} - Movement direction (-1 for left, 1 for right)
     */
    getMovementDirection(row) {
        return (row === 0 || row === 2) ? -1 : 1;   
    }

    /**
     * Calculates the target position for a move
     * @param {number} fromIndex - Starting position index
     * @param {number} steps - Number of steps to move
     * @returns {number|null} - Target position index or null if invalid
     */
    calculateMove(fromIndex, steps) {
        if (fromIndex === null || fromIndex === undefined) return null;
        
        const fromRow = Math.floor(fromIndex / this.cols);
        const fromCol = fromIndex % this.cols;
        const player = this.content[fromIndex]?.player;
        
        if (!player) return null;

        let currentRow = fromRow;
        let currentCol = fromCol;
        let remainingSteps = steps;

        while (remainingSteps > 0) {
            const direction = this.getMovementDirection(currentRow);
            let nextCol = currentCol + direction;
            let nextRow = currentRow;

            if (nextCol < 0 || nextCol >= this.cols) {
                const pairedRow = (currentRow === 0) ? 1 : (currentRow === 1) ? 2 : (currentRow === 2) ? 1 : 2;
                nextRow = pairedRow;
                nextCol = direction > 0 ? this.cols - 1 : 0;
            }

            if (nextRow < 0 || nextRow >= 4 || nextCol < 0 || nextCol >= this.cols) {
                return null;
            }

            currentRow = nextRow;
            currentCol = nextCol;
            remainingSteps--;
        }

        return currentRow * this.cols + currentCol;
    }

    /**
     * Handles click events on board squares
     * @param {number} i - Clicked square index
     */
    handleClick(i) {
        if (!this.gameActive) {
            this.showMessage('Game over!');
            return;
        }
        
        // Check if dice has been rolled
        if (!this.diceRolled || !window.lastRoll) {
            this.showMessage('Roll dice first!');
            return;
        }
        
        // Check if it's human player's turn
        if (this.isAITurn()) {
            this.showMessage("Wait for AI's move");
            return;
        }
        
        const piece = this.content[i];
        if (!piece || piece.player !== this.currentPlayer) {
            this.showMessage('Select your piece');
            return;
        }

        // Check first move rule (only with Tâb)
        if (!piece.hasConverted && window.lastRoll.value !== 1) {
            this.showMessage('First move must be with Tâb (1)');
            return;
        }

        const target = this.calculateMove(i, window.lastRoll.value);
        if (!target) {
            this.showMessage('Invalid move');
            return;
        }

        // Check if destination has same player's piece
        if (this.content[target] && this.content[target].player === piece.player) {
            this.showMessage('Blocked - your piece in destination');
            return;
        }

        this.movePiece(i, target);
    }

        /**
     * Moves a piece from one position to another
     * @param {number} from - Source position index
     * @param {number} to - Target position index
     */
    movePiece(from, to) {
        const piece = this.content[from];
        
        // Capture logic
        if (this.content[to] && this.content[to].player !== piece.player) {
            this.showMessage('Piece captured!');
        }

        // Mark conversion on first move with Tâb (1)
        if (!piece.hasConverted && window.lastRoll.value === 1) {
            piece.hasConverted = true;
            this.showMessage('Piece activated with Tâb!');
        }

        this.content[to] = piece;
        this.content[from] = null;

        // Render antes de verificar fim de jogo
        this.render();
        
        // Verificar fim de jogo APÓS o movimento
        this.checkGameEnd();

        // End turn (only one move per turn even with repeat)
        this.endTurn();
    }

    /**
     * Ends the current turn and switches players
     */
    endTurn() {
        // Se foi um lançamento que permite repetição, mantém o turno
        if (window.lastRoll && window.lastRoll.repeats) {
            // Permite rolar novamente no mesmo turno
            this.diceRolled = false;
            window.canRollAgain = true;
            
            if (window.enableStickRolling) {
                window.enableStickRolling();
            }
            
            this.render();
            
            // Se for IA, faz reroll automático após delay
            if (this.isAITurn()) {
                setTimeout(() => this.triggerAIRoll(), 1000);
            }
        } else {
            // Reset dice state
            this.diceRolled = false;
            window.lastRoll = null;
            window.canRollAgain = false;
            
            // Switch players
            this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
            
            // Reset and enable dice for next player
            if (window.resetStickDice) {
                window.resetStickDice();
            }
            if (window.enableStickRolling) {
                window.enableStickRolling();
            }
            
            // Dispatch turn change event
            document.dispatchEvent(new CustomEvent('turnChanged'));
            
            this.render();
            this.checkGameEnd();
            
            // If it's AI's turn, trigger automatic roll
            if (this.isAITurn()) {
                setTimeout(() => this.triggerAIRoll(), 800);
            }
        }
    }

    /**
     * Triggers AI dice roll
     */
    triggerAIRoll() {
        if (window.rollStickDice && !this.diceRolled) {
            this.diceRolled = true;
            window.rollStickDice();
        }
    }

    /**
     * Makes AI move based on current game state
     */
    async makeAIMove() {
        if (!window.IA || !this.gameActive || !window.lastRoll) return;
        
        try {
            const state = window.IA.fromGameBoard(this.content, this.cols, this.currentPlayer);
            const move = await window.IA.chooseMoveAI(state, window.lastRoll.value, this.options.difficulty);
            
            if (move && move.type !== 'PASS') {
                const indices = window.IA.moveToIndices(move, this.cols);
                this.movePiece(indices.from, indices.to);
            } else {
                // AI cannot move - pass turn
                this.showMessage('AI cannot move - passing turn');
                this.endTurn();
            }
        } catch (error) {
            console.error('AI error:', error);
            this.endTurn();
        }
    }

    /**
     * Passes the current turn if no valid moves available
     */
    passTurn() {
        if (!this.gameActive) return;
        
        if (!this.diceRolled || !window.lastRoll) {
            this.showMessage('Roll dice first!');
            return;
        }

        // Check if valid moves exist
        const hasValidMoves = this.checkValidMoves();
        if (hasValidMoves) {
            this.showMessage('You have valid moves - cannot pass!');
            return;
        }

        this.showMessage('No valid moves - passing turn');
        this.endTurn();
    }

    /**
     * Checks if current player has any valid moves
     * @returns {boolean} - True if valid moves exist
     */
    checkValidMoves() {
        if (!window.lastRoll) return false;
        
        for (let i = 0; i < this.content.length; i++) {
            const piece = this.content[i];
            if (!piece || piece.player !== this.currentPlayer) continue;
            
            // Check first move rule (only with Tâb)
            if (!piece.hasConverted && window.lastRoll.value !== 1) continue;
            
            const target = this.calculateMove(i, window.lastRoll.value);
            if (!target) continue;

            // Check if destination doesn't have same player's piece
            if (!this.content[target] || this.content[target].player !== piece.player) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Resigns the current game
     */
    resign() {
        if (!this.gameActive) return;
        
        const winner = this.currentPlayer === 'player-1' ? 'Player 2' : 'Player 1';
        this.gameActive = false;
        this.showVictoryModal(winner, true);
    }

    /**
     * Shows victory modal with winner information
     * @param {string} winner - The winning player
     * @param {boolean} isResign - Whether game ended by resignation
     */
    showVictoryModal(winner, isResign = false) {
        const modal = document.getElementById('victoryModal');
        const message = document.getElementById('victoryMessage');
        const reason = document.getElementById('victoryReason');
        
        if (modal && message && reason) {
            message.innerHTML = `<strong>${winner} wins!</strong>`;
            reason.textContent = isResign ? 'Player resigned' : 'All pieces captured';
            modal.classList.remove('hidden');
            
            // REGISTRAR NA CLASSIFICAÇÃO - ADICIONE ESTE BLOCO
            if (window.classification && this.gameStartTime) {
                const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
                const winnerName = winner === 'Player 1' ? 'Player 1' : (winner === 'Player 2' ? 'Player 2' : winner);
                const loserName = winner === 'Player 1' ? (this.options.mode === 'pvc' ? 'AI' : 'Player 2') : 'Player 1';
                
                // Contar peças restantes do vencedor
                const winnerPieces = this.content.filter(p => p && p.player === (winner === 'Player 1' ? 'player-1' : 'player-2')).length;
                
                console.log('Recording game result for classification:', {
                    winner: winnerName,
                    loser: loserName,
                    duration: gameDuration,
                    piecesRemaining: winnerPieces,
                    mode: this.options.mode
                });
                
                window.classification.recordGame(
                    'Player 1',
                    this.options.mode === 'pvc' ? 'AI' : 'Player 2',
                    winnerName,
                    gameDuration,
                    winnerPieces,
                    this.cols, // total pieces
                    this.options.mode
                );
            }
            
            // Configure buttons
            document.getElementById('newGameFromVictory').onclick = () => {
                modal.classList.add('hidden');
                this.showSetupModal();
            };
            
            document.getElementById('closeVictoryModal').onclick = () => {
                modal.classList.add('hidden');
            };
        }
    }

    /**
     * Shows the game setup modal
     */
    showSetupModal() {
        const setupModal = document.getElementById('setupModal');
        if (setupModal) {
            setupModal.classList.remove('hidden');
        }
    }

    /**
     * Checks if game has ended and shows victory modal
     */
    checkGameEnd() {
        if (!this.gameActive) return;
        
        // Contar TODAS as peças (convertidas e não convertidas)
        const p1Pieces = this.content.filter(p => p && p.player === 'player-1').length;
        const p2Pieces = this.content.filter(p => p && p.player === 'player-2').length;
        
        console.log('Player 1 pieces (total):', p1Pieces);
        console.log('Player 2 pieces (total):', p2Pieces);
        
        // Verificar se algum player não tem mais peças no tabuleiro
        if (p1Pieces === 0) {
            const winner = 'Player 2';
            this.gameActive = false;
            this.showVictoryModal(winner, false);
            return true;
        } else if (p2Pieces === 0) {
            const winner = 'Player 1';
            this.gameActive = false;
            this.showVictoryModal(winner, false);
            return true;
        }
        
        return false;
    }

    /**
     * Renders the current game state to the DOM
     */
    render() {
        document.querySelectorAll('.board-square').forEach((cell, i) => {
            cell.innerHTML = '';
            if (this.content[i]) {
                const token = document.createElement('div');
                token.className = `board-token ${this.content[i].player}`;
                
                if (!this.content[i].hasConverted) {
                    token.style.opacity = '1.0';
                } else {
                    token.style.opacity = '0.7';
                }
                
                cell.appendChild(token);
            }
        });
        
        // Update turn message
        let turnMsg;
        if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
            turnMsg = "AI's turn - Rolling...";
        } else if (this.diceRolled) {
            turnMsg = `Player ${this.currentPlayer === 'player-1' ? '1' : '2'} - Make your move!`;
        } else {
            turnMsg = `Player ${this.currentPlayer === 'player-1' ? '1' : '2'} - Roll dice!`;
        }
        this.showMessage(turnMsg);
        
        // Update dice roll button state
        if (window.updateRollButtonState) {
            window.updateRollButtonState();
        }
    }

    /**
     * Shows message in the game message box
     * @param {string} text - Message to display
     */
    showMessage(text) {
        const msgEl = document.getElementById('gameMessage');
        if (msgEl) msgEl.textContent = text;
    }

    /**
     * Checks if it's currently AI's turn
     * @returns {boolean} - True if AI's turn
     */
    isAITurn() {
        return this.options.mode === 'pvc' && this.currentPlayer === 'player-2';
    }

    /**
     * Handles stick dice roll events
     * @param {Object} roll - Roll result object
     */
    handleStickRoll(roll) {
        window.lastRoll = roll;
        this.diceRolled = true;
        
        const names = {1:'Tâb', 2:'Itneyn', 3:'Teláteh', 4:'Arba\'ah', 6:'Sitteh'};
        const repeatMsg = roll.repeats ? ' - Roll again!' : ' - Make your move!';
        const msg = `Roll: ${roll.value} (${names[roll.value]})${repeatMsg}`;
        this.showMessage(msg);
        
        // Atualiza estado do botão de rolar
        if (window.updateRollButtonState) {
            window.updateRollButtonState();
        }
        
        this.render();
        
        if (this.isAITurn()) {
            // Se for IA, faz movimento após delay
            setTimeout(() => this.makeAIMove(), 500);
        }
    }
}

/**
 * Generates a new game board with specified parameters
 * @param {number} columns - Number of columns for the board
 * @param {Object} options - Game configuration options
 * @returns {GameBoard} - The created GameBoard instance
 */
function generateBoard(columns = 9, options = {}) {
    window.game = new GameBoard('board-container', columns, options);
    setupActionButtons();
    return window.game;
}

/**
 * Sets up action buttons (pass, resign)
 */
function setupActionButtons() {
    const passBtn = document.getElementById('passBtn');
    const resignBtn = document.getElementById('resignBtn');
    
    if (passBtn) {
        passBtn.onclick = () => {
            if (window.game) window.game.passTurn();
        };
    }
    
    if (resignBtn) {
        resignBtn.onclick = () => {
            if (window.game) {
                if (confirm('Are you sure you want to resign?')) {
                    window.game.resign();
                }
            }
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupActionButtons();
});

// Expose functions globally
window.generateBoard = generateBoard;
window.GameBoard = GameBoard;

// Event listeners for dice and turn events
document.addEventListener('stickRoll', (e) => {
    if (window.game) {
        window.game.handleStickRoll(e.detail);
    }
});

document.addEventListener('turnChanged', () => {
    if (window.game && window.updateRollButtonState) {
        window.updateRollButtonState();
    }
});