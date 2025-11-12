// import { Dice } from './Dice.js';
import { Player } from './Player.js';
import { Piece } from './Piece.js';
import { Board } from './Board.js';
import { MovementCalculator } from './MovementCalculator.js';
import { MessageService } from './MessageService.js';

/**
 * GameBoard - Manager class for Tâb game.
 * High-level controller for a single board game instance. Manages board state, piece movement,
 * dice interactions, turn flow (including AI turns), UI rendering, and end-of-game handling.
*
* The class expects a Board implementation, MovementCalculator, Piece and Player enums/objects,
* and several optional global/window helpers (e.g. stick-dice helpers, AI helpers, classification).
*
* Global/window dependencies and interactions:
*   - Reads/writes window.lastRoll (object: { value: number, repeats?: boolean }).
*   - Optionally calls window.enableStickRolling(), window.resetStickDice(), window.rollStickDice(), window.updateRollButtonState().
*   - Optionally uses window.IA for AI functions (fromGameBoard, chooseMoveAI, moveToIndices).
*   - Optionally calls window.classification.recordGame(...) to persist game results.
 *   - Dispatches a custom 'turnChanged' DOM event on player change.
 * 
 * Events:
 *   - Dispatches CustomEvent 'turnChanged' when player turn is switched.
*
* Notes & Side Effects:
*   - Many methods rely on global/window helpers and on the concrete implementations of Board, MovementCalculator,
*     Piece and Player. The class performs DOM mutations (showing/hiding modals, updating elements with ids like 'victoryModal').
*   - Methods such as movePiece assume the caller has already validated the move. isValidMove is provided to validate moves.
*   - The class logs diagnostic information (console.log / console.error) during end-of-game checking and AI errors.
* @class
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
     * @param {string} options.firstPlayer - Starting player ({@link Player.P1} or {@link Player.P2})
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
        this.selectedTokenIndex = null;

        /** @type {Object} */
        this.options = {
            mode: options.mode || 'pvp',
            difficulty: options.difficulty || 'medium',
            firstPlayer: options.firstPlayer || Player.P1
        };

        /** @type {string} */
        this.currentPlayer = this.options.firstPlayer || Player.P1;

        /** @type {boolean} */
        this.gameActive = true;

        this.gameStartTime = Date.now();

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
     * @returns {number} - Returns last roll value (from window.lastRoll) or null if none.
     */
    getLastRoll() {
        if (window.lastRoll && window.lastRoll.value) return window.lastRoll.value;

        console.error("Could not get LastRoll");
    }

    /**
     * @returns {boolean} - True if the last roll value grants an extra turn (e.g. values like 1, 4, 6).
     */
    canRepeat() {
        const value = this.getLastRoll();
        if (value) {
            return ([1, 4, 6].includes(value));
        }
        return false;
    }

    /**
     * Handles UI clicks on board squares. Enforces gameActive, diceRolled and turn ownership checks,
     * and routes to token selection (GAME_STATES.IDLE) or target selection (GAME_STATES.TOKEN_SELECTED).
     * @param {number} i - Index of the clicked board square.
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
                this.handleTokenSelect(i, diceValue);
                break;
            // Choose target once token is selected
            case GameBoard.GAME_STATES.TOKEN_SELECTED:
                this.handleTargetSelect(i, diceValue);
                break;
        }

    }

    /**
     * Resets interaction state to idle and clears selection.
     */
    resetGameState() {
        this.gameState = GameBoard.GAME_STATES.IDLE;
        this.selectedTokenIndex = null;
    }

    /**
     * Selects a piece for movement if owned by current player and respects first-move rules.
     * @param {number} i - Index of selected token.
     * @param {number} diceValue - Current dice value.
     * @returns {boolean} - True on successful selection, false otherwise.
     */
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
        this.selectedTokenIndex = i;
        return true;
    }
    /**
     * Attempts to move previously selected piece to a target. Validates via isValidMove and
     * calls movePiece on success. Deselects and resets state on invalid attempts.
     * @param {number} targetIndex - Target square index to move to.
     * @param {number} diceValue - Current dice value.
     * @returns {boolean} - True if move performed, false otherwise.
     */
    handleTargetSelect(targetIndex, diceValue) {
        if (!this.selectedTokenIndex || this.selectedTokenIndex === targetIndex) {
            // Deselect
            this.resetGameState();
            return false;
        }

        // Validate clicked index
        let errorMessage = { text: '' };
        if (this.isValidMove(this.selectedTokenIndex, targetIndex, diceValue, errorMessage)) {
            this.gameState = GameBoard.GAME_STATES.TARGET_SELECTED;
            return this.movePiece(this.selectedTokenIndex, targetIndex);
        }

        this.showMessage(errorMessage.text);
        this.resetGameState();
        return false;
    }

    /**
     * Validates a proposed move according to movementCalculator targets, piece states (UNMOVED, MOVED, PROMOTED),
     * promotion rules, collisions with friendly pieces, and starting/ending row restrictions.
     * @param {number} from - Source index.
     * @param {number} to - Destination index.
     * @param {number} diceValue - Dice value used for the attempted move.
     * @param {{ text: string }} [errorMessage={ text: '' }] - Optional object to receive an error message when invalid.
     * @returns {boolean} - True if the move is legal; false otherwise (populates errorMessage.text).
     *
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
    /**
     * @param {string} playerId - Player id to check (Player.P1|Player.P2).
     * @returns {boolean} - Returns false if a friendly piece exists on that player's starting row.
     */
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
     * @param {number} from - Source index.
     * @param {number} to - Destination index.
     * @param {number} [diceValue] - Optional diceValue, defaults to getLastRoll().
     * Executes movement without re-validating: handles capture messages, state transitions (UNMOVED->MOVED, PROMOTED),
     * sets pieces on board array, renders, checks for game end and ends the turn. Note: does not throw on invalid data.
     *
     */
    movePiece(from, to, diceValue = this.getLastRoll()) {
        const piece = this.board.getPieceAt(from);
        const pieceAtTarget = this.board.getPieceAt(to);
        const targets = this.movementCalculator.calculateTarget(from, diceValue);

        if(!piece || !targets) {
            console.error("Invalid movePiece call. Expected a valid move.")
            return
        };

        // Capture logic
        if (pieceAtTarget) {
            this.showMessage('Piece captured!');
        }

        // Mark conversion on first move with Tâb (1)
        if (piece.state === Piece.UNMOVED) {
            piece.state = Piece.MOVED;
            this.showMessage('Piece activated with Tâb!');
        }

        if (targets.length === 2 && to === targets[1]) {
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
            this.currentPlayer = this.currentPlayer === Player.P1 ? Player.P2 : Player.P1;

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
            const state = window.IA.fromGameBoard(this.board.content, this.cols, this.currentPlayer);
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
     * @see {@link GameBoard.isValidMove}
     */
    checkValidMoves() {
        if (!window.lastRoll) return false;

        for (let i = 0; i < this.board.content.length; i++) {
            const piece = this.board.content[i];
            if (!piece || piece.player !== this.currentPlayer) continue;

            // Check first move rule (only with Tâb)
            if (!piece.hasConverted && window.lastRoll.value !== 1) continue;

            const temp = this.movementCalculator.calculateTarget(i, window.lastRoll.value);
            const target = temp? temp[0] : null;
            if (!target) continue;

            // Check if destination doesn't have same player's piece
            if (!this.board.content[target] || this.board.content[target].player !== piece.player) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ends the game immediately with the current player resigning. Shows victory modal and marks the game inactive.
     */
    resign() {
        if (!this.gameActive) return;

        const resigningPlayer = this.currentPlayer === Player.P1 ? 'Player 1' : 'Player 2';
        const winner = this.currentPlayer === Player.P1 ? 'Player 2' : 'Player 1';

        this.gameActive = false;
        this.showVictoryModal(winner, true, resigningPlayer);
    }

    // TODO: Integrate Player class
    /**
     * Presents the modal, records the game via window.classification.recordGame when available, and wires modal actions.
     * @param {string} winner - Human-readable winner label ("Player 1", "Player 2", or "AI").
     * @param {boolean} [isResign=false] - True when triggered by resignation.
     * @param {string|null} [resigningPlayer=null] - Name/id of the resigning player when applicable.
     *
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
                const winnerPieces = this.board.content.filter(p => p && p.player === (winner === 'Player 1' ? Player.P1 : Player.P2)).length;

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
     * Reveals the setup modal UI allowing players to configure/start a new game.
     */
    showSetupModal() {
        const setupModal = document.getElementById('setupModal');
        if (setupModal) {
            setupModal.classList.remove('hidden');
        }
    }

    /**
    * @returns {boolean} - Evaluates whether either player has zero remaining pieces and invokes showVictoryModal when applicable.
    */
    checkGameEnd() {
        if (!this.gameActive) return true;

        // Count pieces for each player
        const pieceLists = this.board.findPlayerPieces();
        const p1Pieces = pieceLists.P1Pieces.length();
        const p2Pieces = pieceLists.P2Pieces.length();

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
    * Re-renders the board DOM (pieces), updates user-facing messages and dice button states. Uses board.getPieceAt and piece.createElement.
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
        if (this.options.mode === 'pvc' && this.currentPlayer === Player.P2) {
            turnMsg = "AI's turn - Rolling...";
        } else if (this.diceRolled) {
            turnMsg = `Player ${this.currentPlayer === Player.P1 ? '1' : '2'} - Make your move!`;
        } else {
            turnMsg = `Player ${this.currentPlayer === Player.P1 ? '1' : '2'} - Roll dice!`;
        }
        this.showMessage(turnMsg);

        // Update dice roll button state
        if (window.updateRollButtonState) {
            window.updateRollButtonState();
        }
    }

    /**
    * @method showMessage
    * @param {string} text - Synchronously displays a message to the player via {@link MessageService.showMessage}.
    * 
     */
    showMessage(text) {
        MessageService.showMessage(text);
    }

    /**
     * Checks if it's currently AI's turn
     * @returns {boolean} - True if AI's turn
     */
    isAITurn() {
        return this.options.mode === 'pvc' && this.currentPlayer === Player.P2;
    }

    /**
     * Handles stick dice roll events
     * @param {{ value: number, repeats?: boolean }} roll - Roll result object (value and optional repeats flag).
     * Stores the roll on window.lastRoll, marks diceRolled, shows human-readable roll message, triggers AI move if appropriate.
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