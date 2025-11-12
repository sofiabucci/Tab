//@ts-check

/**
 * @file Main.js
 * @description
 * The current OOP focused code structure is nonfunctional.
 * Because of this, the last working version of these scrips are being used in the index.html file.
 */

// import { Dice } from './Dice.js';
import { Player } from './Player.js';
import { Piece } from './Piece.js';
import { Board } from './Board.js';
import { MovementCalculator } from './MovementCalculator.js';

/**
 * Board Manager class for Tâb game.
 */
class GameBoard {

    static GAME_STATES = {
        IDLE: 'idle',
        TOKEN_SELECTED: 'token-selected',
        TARGET_SELECTED: 'target-selected'
    };

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
        this.cols = cols || 9;

        /** @type {Board} Board object containing player Pieces*/
        this.board = new Board(id, cols);

        /** @type {MovementCalculator} */
        this.movementCalculator = new MovementCalculator(4, this.cols);

        /** @type {String} Game state*/
        this.gameState = GameBoard.GAME_STATES.IDLE;

        /** @type {number|null} Board index of selected token*/
        this.selectedToken = null;

        /** @type {Object} */
        this.options = {
            mode: options.mode || 'pvp',
            difficulty: options.difficulty || 'medium',
            firstPlayer: options.firstPlayer || 'player-1'
        };

        /** @type {string} */
        this.currentPlayer = this.options.firstPlayer || Player.P1;

        /** @type {boolean} */
        this.gameActive = true;

        /** @type {boolean} */
        this.diceRolled = false;

        this.board.initDOM(this.handleClick);
        this.render();

        // Initialize dice rolling control
        if (window.enableStickRolling) {
            const isHumanTurn = !this.isAITurn();
            window.enableStickRolling();
        }

        // AI starts automatically if first player
        if (this.isAITurn()) {
            setTimeout(() => this.triggerAIRoll(), 1000);
        }
    }

    /**
     * @returns {number | null} value of the last dice roll
     */
    getLastRoll() {
        if (window.lastRoll && window.lastRoll.value) return window.lastRoll.value;

        return null;
    }

    /**
     * @returns {boolean} value of the last dice roll allows for player to play again.
     */
    canRepeat() {
        const value = this.getLastRoll();
        if (value) {
            return ([1, 4, 6].includes(value));
        }
        return false;
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
        if (!this.diceRolled || !this.getLastRoll()) {
            this.showMessage('Roll dice first!');
            return;
        }

        // Check if it's human player's turn
        if (this.isAITurn()) {
            this.showMessage("Wait for AI's move");
            return;
        }

        const diceValue = this.getLastRoll();

        switch (this.gameState) {
            // Choose token
            case GameBoard.GAME_STATES.IDLE:
                handleTokenSelect(i, diceValue);
                break;
            // Choose target once token is selected
            case GameBoard.GAME_STATES.TOKEN_SELECTED:
                handleTargetSelect(i, diceValue);
                break;
        }

    }

    resetGameState() {
        this.gameState = GameBoard.GAME_STATES.IDLE;
        this.selectedToken = null;
    }

    handleTokenSelect(i, diceValue) {
        const piece = this.board.getPieceAt(i);

        if (!piece || piece.player !== this.currentPlayer) {
            this.showMessage('Select your piece');
            return false;
        }

        // Check first move rule (only with Tâb)
        if (piece.state === Piece.UNMOVED && diceValue !== 1) {
            this.showMessage('First move must be with Tâb (1)');
            return false;
        }

        // Valid token selected
        this.gameState = GameBoard.GAME_STATES.TOKEN_SELECTED;
        this.selectedToken = piece;
        return true;
    }

    handleTargetSelect(targetIndex, diceValue) {
        if (!this.selectedToken || this.selectedToken === targetIndex) {
            // Deselect
            this.resetGameState();
            return false;
        }

        // Validate clicked index
        let errorMessage = { text: '' };
        if (this.isValidMove(this.selectedToken, targetIndex, diceValue, errorMessage)) {
            this.gameState = GameBoard.GAME_STATES.TARGET_SELECTED;
            return this.movePiece(this.selectedToken, targetIndex);
        }

        this.showMessage(errorMessage.text);
        this.resetGameState();
        return false;
    }

    /**
     * Determines whether a piece at `fromIndex` can legally move to `toIndex` using `diceValue` steps.
     * If the move is invalid, sets an error message in `errorMessage.text`.
     *
     * @param {number} from - The index of the piece's current position on the board.
     * @param {number} to - The index of the intended destination on the board.
     * @param {number} diceValue - The number of steps to move, typically determined by a dice roll.
     * @param {{ text: string }} [errorMessage={ text: '' }] - An object to hold the error message if the move is invalid.
     * @returns {boolean} True if the move is valid; false otherwise.
     */
    isValidMove(from, to, diceValue, errorMessage = { text: '' }) {
        const piece = this.board.getPieceAt(from);
        const pieceAtTarget = this.board.getPieceAt(to);
        const targets = this.movementCalculator.calculateTarget(from, diceValue);

        // Not a move
        if (!piece || !targets || !targets.includes(to)) {
            errorMessage.text = 'Invalid move';
            return false;
        }

        // If true, handle as a promotion move.
        const isPromotionMove = to === targets[1];

        // Friendly piece
        if (pieceAtTarget && pieceAtTarget.player === piece.player) {
            errorMessage.text = 'Blocked - your piece in destination';
            return false;
        }

        switch (piece.state) {
            case Piece.UNMOVED:
                if (isPromotionMove) {
                    errorMessage.text = 'Invalid move';
                    return false;
                }
                if (diceValue !== 1) {
                    errorMessage.text = 'First move must be with Tâb (1)';
                    return false;
                }
                break;

            case Piece.PROMOTED:
                // Promoted pieces must follow normal flow (targets[0])
                if (isPromotionMove) {
                    errorMessage.text = 'Promoted pieces cannot revisit the last row';
                    return false;
                }
                break;

            case Piece.MOVED:
                if (isPromotionMove) {
                    //Player starting row
                    const homeRow = (piece.player === Player.P1) ? this.board.rows - 1 : 0;

                    // Our home row
                    if (homeRow === this.board.getRowFromIndex(to)) {
                        errorMessage.text = 'Pieces cannot revisit their starting row';
                        return false;
                    }
                    // Enemy home row
                    if (!this.startingRowIsEmpty(piece.player)) {
                        errorMessage.text = 'Starting row must be empty before visiting the last row';
                        return false;
                    }
                }
                break;
        }

        return true;
    }

    // False if there is a friendly piece in player's starting row.
    startingRowIsEmpty(playerId) {
        // Starting row
        const row = (playerId === Player.P1) ? this.board.rows - 1 : 0;

        for (let i = 0; i < this.board.cols; i++) {
            const piece = this.board.getPieceAt(row * this.board.cols + i);

            if (piece && piece.player === playerId) {
                return false;
            }
        }

        return true;
    }

    /**
     * Moves a piece from one position to another. Does not validate.
     * @param {number} from - Source position index
     * @param {number} to - Target position index
     */
    movePiece(from, to, diceValue = this.getLastRoll()) {
        const piece = this.board.getPieceAt(from);
        const pieceAtTarget = this.board.getPieceAt(to);
        const targets = this.movementCalculator.calculateTarget(from, to, diceValue);

        // Capture logic
        if (pieceAtTarget) {
            this.showMessage('Piece captured!');
        }

        // Mark conversion on first move with Tâb (1)
        if (piece.state === Piece.UNMOVED) {
            piece.state = Piece.MOVED;
            this.showMessage('Piece activated with Tâb!');
        }

        if (targets.length() === 2 && to === targets[1]) {
            piece.state = Piece.PROMOTED;
        }

        this.board.setPieceAt(to, piece);
        this.board.setPieceAt(from, null);

        // Render updated board
        this.render();

        // Verify game end
        this.checkGameEnd();

        // End turn (only one move per turn even with repeat)
        this.endTurn();
    }

    /**
     * Ends the current turn and switches players
     */
    endTurn() {
        // If last roll allows repeat
        if (this.canRepeat()) {
            // Allow same player to roll again
            this.diceRolled = false;
            window.canRollAgain = true;

            if (window.enableStickRolling) {
                window.enableStickRolling();
            }

            this.render();

            // If it's AI's turn, trigger automatic roll
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

        const resigningPlayer = this.currentPlayer === 'player-1' ? 'Player 1' : 'Player 2';
        const winner = this.currentPlayer === 'player-1' ? 'Player 2' : 'Player 1';

        this.gameActive = false;
        this.showVictoryModal(winner, true, resigningPlayer);
    }

    /**
     * Shows victory modal with winner information
     * @param {string} winner - The winning player
     * @param {boolean} isResign - Whether game ended by resignation
     * @param {string} resigningPlayer - Player who resigned (only for resign)
     */
    showVictoryModal(winner, isResign = false, resigningPlayer = null) {
        const modal = document.getElementById('victoryModal');
        const message = document.getElementById('victoryMessage');
        const reason = document.getElementById('victoryReason');

        if (modal && message && reason) {
            message.innerHTML = `<strong>${winner} wins!</strong>`;
            reason.textContent = isResign ? `${resigningPlayer} resigned` : 'All pieces captured';
            modal.classList.remove('hidden');

            // Record game result for classification
            if (window.classification && this.gameStartTime) {
                const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);

                // Use consistent names
                const winnerName = winner; // This should be "Player 1", "Player 2", or "AI"
                const player2Name = this.options.mode === 'pvc' ? 'AI' : 'Player 2';

                // Count remaining pieces for winner
                const winnerPieces = this.content.filter(p => p && p.player === (winner === 'Player 1' ? 'player-1' : 'player-2')).length;

                console.log('Calling classification.recordGame with:', {
                    winner: winnerName,
                    player2: player2Name,
                    mode: this.options.mode
                });

                window.classification.recordGame(
                    'Player 1',     // Always Player 1
                    player2Name,    // AI or Player 2
                    winnerName,     // The actual winner
                    gameDuration,
                    winnerPieces,
                    this.cols,
                    this.options.mode,
                    isResign,
                    resigningPlayer
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

        // Count pieces for each player
        const pieces = this.board.findPlayerPieces();
        const p1Pieces = pieces.P1Pieces.length();
        const p2Pieces = pieces.P2Pieces.length();

        console.log('Player 1 pieces (total):', p1Pieces);
        console.log('Player 2 pieces (total):', p2Pieces);

        // Verify if a player has no pieces left
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
            const piece = this.board.getPieceAt(i);

            if (piece) {
                const token = piece.createElement();
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
        MovementCalculator.showMessage(text);
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

        const names = { 1: 'Tâb', 2: 'Itneyn', 3: 'Teláteh', 4: 'Arba\'ah', 6: 'Sitteh' };
        const repeatMsg = roll.repeats ? ' - Roll again!' : ' - Make your move!';
        const msg = `Roll: ${roll.value} (${names[roll.value]})${repeatMsg}`;
        this.showMessage(msg);

        if (window.updateRollButtonState) {
            window.updateRollButtonState();
        }

        this.render();

        if (this.isAITurn()) {
            // If it's AI's turn, make move after short delay
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
    window.game = new GameBoard(Board.DEFAULT_CONTAINER, columns, options);
    setupActionButtons();

    // Event listeners for dice events
    document.addEventListener('stickRoll', (e) => {
        if (window.game) {
            window.game.handleStickRoll(e.detail);
        }
    });

    // Event listeners for turn events
    document.addEventListener('turnChanged', () => {
        if (window.game && window.updateRollButtonState) {
            window.updateRollButtonState();
        }
    });

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
document.addEventListener('DOMContentLoaded', function () {
    setupActionButtons();
});

// Expose functions globally
window.generateBoard = generateBoard;