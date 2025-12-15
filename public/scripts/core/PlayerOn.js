import {Piece} from './Piece.js';
import {StickCanvas} from '../dice.js';

/**
 * @file PlayerOn.js
 * @description Online multiplayer system for Tâb game
 * Integrates with existing classification system and game flow
 * Updated to use ClientAPI for server communication and handle game flow properly
 */

export class OnlineGameManager {
    constructor() {
        this.clientAPI = window.ClientAPI;
        this.currentGame = null;
        this.playerNick = null;
        this.playerPassword = null;
        this.stopUpdateStream = null;
        this.isConnected = false;
        this.isMyTurn = false;
        this.currentServer = 'group'; // Default
        this.gameBoard = null;
        
        // Server state tracking
        this.serverState = {
            dice: null,
            step: 'from',
            selected: [],
            mustPass: false,
            turn: null,
            initial: null,
            pieces: []
        };
        
        this.initialize();
    }

    // Correct for OS snake path board indexing
    static correctIndexToOS(cols, index){
        // Get row number
        switch(Math.floor(index / cols)){
            case 0:     
                return 4*cols - 1 - index;
            case 1:
                return index + cols;
            case 2:     
                return 4*cols - 1 - index;
            case 3:
                return index % cols;
            default:    console.error("[CorrectIndexToOS] Bad index: ", index);
        }
    }

    static correctIndexFromOS(cols, index){
        // Get row number
        switch(Math.floor(index / cols)){
            case 0:     
                return 3*cols + index;
            case 1:
                return 4*cols - 1 - index;
            case 2:     
                return index - cols;
            case 3:
                return 4*cols - 1 - index;
            default:    console.error("[CorrectIndexFromOS] Bad index: ", index);
        }
    }

    /**
     * Initialize online game system
     */
    initialize() {
        console.log('Online game manager initialized - Using ClientAPI');
        
        // Load any saved credentials
        this.loadPlayerCredentials();
    }

    /**
     * Load player credentials from AuthManager
     */
    loadPlayerCredentials() {
        if (window.AuthManager) {
            // Get current server from pending setup
            if (window.pendingOnlineSetup) {
                this.currentServer = window.pendingOnlineSetup.serverKey;
                const creds = window.AuthManager.getCredentials(this.currentServer);
                if (creds) {
                    this.playerNick = creds.nick;
                    this.playerPassword = creds.password;
                }
            }
        }
    }

    /**
     * Switch between servers
     * @param {string} serverKey - 'official' ou 'group'
     */
    switchServer(serverKey) {
        if (!this.clientAPI) {
            console.error('ClientAPI not available');
            return false;
        }
        
        const switched = this.clientAPI.setServer(serverKey);
        if (switched) {
            this.currentServer = serverKey;
            console.log(`Switched to server: ${serverKey}`);
            
            // Update credentials for new server
            if (window.AuthManager) {
                const creds = window.AuthManager.getCredentials(serverKey);
                if (creds) {
                    this.playerNick = creds.nick;
                    this.playerPassword = creds.password;
                }
            }
        }
        return switched;
    }

    /**
     * Start online game - called from setup.js after login
     */
    async startOnlineGame(boardSize, firstPlayer) {
        try {
            console.log('Starting online game...');
            
            // Ensure we have credentials
            if (!this.playerNick || !this.playerPassword) {
                throw new Error('Not logged in. Please login first.');
            }
            
            // Join game on server
            const joinResult = await this.joinGame(boardSize);
            
            if (!joinResult || joinResult.error) {
                throw new Error(joinResult?.error || 'Failed to join game');
            }
            
            console.log('Game joined successfully:', joinResult);
            
            // Initialize game board for online play
            this.initializeOnlineBoard(boardSize, firstPlayer);
            
            this.showMessage('🔄 Searching for opponent...');
            
            return true;
            
        } catch (error) {
            console.error('Error starting online game:', error);
            this.showError('Failed to start online game: ' + error.message);
            return false;
        }
    }

    /**
     * JOIN - Join online game
     */
    async joinGame(size) {
        if (!this.clientAPI) {
            throw new Error('ClientAPI not available');
        }
        
        if (!this.playerNick || !this.playerPassword) {
            throw new Error('Player not authenticated');
        }

        const response = await this.clientAPI.join(
            this.playerNick,
            this.playerPassword,
            size,
            null // game=null para criar novo jogo
        );

        if (response.error) {
            throw new Error(response.error);
        }

        this.currentGame = {
            id: response.game,
            size: size,
            status: 'waiting',
            server: this.currentServer
        };

        console.log('Joined online game:', this.currentGame);
        
        // Start listening for game updates
        this.startGameUpdates();

        return response;
    }

    /**
     * UPDATE - Start listening for game updates via Server-Sent Events
     */
    startGameUpdates() {
        if (!this.currentGame || !this.clientAPI) {
            console.error('Cannot start updates: missing game or ClientAPI');
            return;
        }

        // Stop previous stream if exists
        if (this.stopUpdateStream) {
            this.stopUpdateStream();
        }

        console.log(`Starting SSE for game ${this.currentGame.id}, player ${this.playerNick}`);
        
        // Start new stream using ClientAPI
        this.stopUpdateStream = this.clientAPI.startUpdateStream(
            this.currentGame.id,
            this.playerNick,
            (update) => {
                console.log('Game update received:', update);
                this.handleServerUpdate(update);
            },
            (error) => {
                console.error('SSE error:', error);
                this.showError('Connection to server lost');
                this.isConnected = false;
                
                // Try to reconnect after delay
                setTimeout(() => {
                    if (this.currentGame) {
                        this.startGameUpdates();
                    }
                }, 5000);
            }
        );

        this.isConnected = true;
        console.log('Started listening for game updates via ClientAPI');
    }

    /**
     * Handle server updates
     */
    handleServerUpdate(update) {
        if (update.error) {
            this.showError(update.error);
            return;
        }
        
        console.log('Processing server update:', update);
        
        // Update server state
        this.updateServerState(update);
        
        // Handle specific update types
        if (update.winner) {
            this.handleGameEnd(update.winner);
            return;
        }
        
        if (update.dice) {
            this.handleDiceUpdate(update.dice);
        }
        
        if (update.pieces) {
            this.handlePiecesUpdate(update.pieces);
        }
        
        if (update.selected) {
            this.handleSelectedUpdate(update.selected);
        }
        
        if (update.turn) {
            this.handleTurnUpdate(update.turn);
        }
        
        if (update.step) {
            this.handleStepUpdate(update.step);
        }
        
        if (update.mustPass !== undefined) {
            this.handleMustPassUpdate(update.mustPass);
        }
        
        if (update.cell !== undefined) {
            this.handleCellUpdate(update.cell);
        }
        
        // Update UI
        this.updateGameUI();
    }
    
    /**
     * Update server state from update
     */
    updateServerState(update) {
        // Update each property if present in update
        if (update.cell !== undefined)      this.serverState.cell = update.cell;
        if (update.dice !== undefined)      this.serverState.dice = update.dice;
        if (update.initial !== undefined)   this.serverState.initial = update.initial;
        if (update.mustPass !== undefined)  this.serverState.mustPass = update.mustPass;
        if (update.pieces !== undefined)    this.serverState.pieces = update.pieces;
        if (update.players !== undefined)   this.serverState.players = update.players;
        if (update.selected !== undefined)  this.serverState.selected = update.selected;
        if (update.step !== undefined)      this.serverState.step = update.step;
        if (update.turn !== undefined)      this.serverState.turn = update.turn;
        if (update.winner !== undefined)    this.serverState.winner = update.winner;
        
        // Reset diceRolled for the new turn
        if( !this.isMyTurn && (update.turn === this.playerNick)){
            this.gameBoard.diceRolled = false;
        }
        // Update isMyTurn
        this.isMyTurn = (update.turn === this.playerNick);
        
        console.log('Updated server state:', this.serverState);
    }
    
    /**
     * Handle dice update
     * @param {{stickValues: boolean[], value: number, keepPlaying: boolean} | null} dice - Representação do dado de paus. Null se tiver sido usado.
     */
    handleDiceUpdate(dice) {
        console.log('Dice update:', dice);
        
        // Update dice in game board
        if (this.gameBoard && dice && dice.value) {
            this.gameBoard.setLastRoll({ value: dice.value, repeats: dice.keepPlaying });
            this.gameBoard.diceRolled = true;
            
            // Update dice display
            const diceCanvas = document.getElementById('dice-canvas');
            const stickCanvas = new StickCanvas(150, 75, null);
            diceCanvas.innerHTML = '';
            diceCanvas.appendChild(stickCanvas.canvas);
            stickCanvas.faces = dice.stickValues;
            stickCanvas.drawWithAnimation();
            
            
            const diceResult = document.getElementById('diceResult');
            const names = { 1: 'Tâb', 2: 'Itneyn', 3: 'Teláteh', 4: 'Arba\'ah', 6: 'Sitteh' };
            
            if (diceResult) {
                diceResult.innerHTML = '';

                diceResult.innerHTML = diceResult.innerHTML + `
                    <div class="dice-result-info">
                    <div class="dice-value">Dado: ${dice.value} (${names[dice.value]})</div>
                    ${dice.keepPlaying ? '<div class="dice-repeats">Pode lançar novamente!</div>' : ''}
                    </div>
                    `;
            }
            
            // Show message
            const msg = `Dice rolled: ${dice.value} (${names[dice.value]})${dice.keepPlaying ? ' - Roll again!' : ''}`;
            this.showMessage(msg);
        }
    }
    
    /**
     * Handle pieces update
     */
    handlePiecesUpdate(pieces) {
        console.log('Pieces update received');
        
        if (!this.gameBoard || !pieces) return;
        
        // Convert server pieces format to board format
        this.updateBoardFromServerPieces(pieces);
        // Re-render board
        this.gameBoard.render();

        //Flip board for player 2
        if(this.serverState.players && this.serverState.players[this.playerNick] === 'Red'){
            document.getElementById('board').style.transform = 'rotate(180deg)';
        };
    }
    
    /**
     * Handle selected cells update
     */
    handleSelectedUpdate(selected) {
        console.log('Selected cells:', selected);
        
        if (selected && selected.length > 0) {
            this.highlightCells(selected);
        }
    }
    
    /**
     * Handle turn update
     */
    handleTurnUpdate(turn) {
        console.log('Turn update:', turn);
        
        //Reset dice on turn change
        if(!this.isMyTurn && (turn === this.playerNick)){
            const diceCanvas = document.getElementById('dice-canvas');
            const stickCanvas = new StickCanvas(150, 75, [false,false,false,false]);
            diceCanvas.innerHTML = '';
            diceCanvas.appendChild(stickCanvas.canvas);
            stickCanvas.draw(true);
        }

        this.isMyTurn = (turn === this.playerNick);
        
        if (this.gameBoard) {
            // Update current player in game board
            const isPlayer1 = (this.serverState.initial === this.playerNick);
            this.gameBoard.currentPlayer = isPlayer1 ? 'player-1' : 'player-2';
            
            // Show message
            if (this.isMyTurn) {
                this.showMessage('Your turn!');
            } else {
                const opponent = this.getOpponentName();
                this.showMessage(`${opponent}'s turn`);
            }
        }
    }
    
    /**
     * Handle step update
     */
    handleStepUpdate(step) {
        console.log('Step update:', step);
        
        // Update game state based on step
        if (step === 'from') {
            if (this.gameBoard) {
                this.gameBoard.gameState = GameBoard.GAME_STATES.IDLE;
                this.gameBoard.selectedTokenIndex = null;
            }
        } else if (step === 'to') {
            if (this.gameBoard) {
                this.gameBoard.gameState = GameBoard.GAME_STATES.TOKEN_SELECTED;
            }
        }
    }
    
    /**
     * Handle must pass update
     * @param {string} mustPass - Nick
     */
    handleMustPassUpdate(mustPass) {
        console.log('Must pass update:', mustPass);
        
        if (mustPass && this.isMyTurn) {
            this.showMessage('You must pass your turn');
            
            // Auto-pass after delay
            setTimeout(() => {
                if (this.isMyTurn && this.currentGame) {
                    this.passTurn();
                }
            }, 2500);
        }
    }
    
    /**
     * Handle cell update
     * @param {{square: number, position: number}} cell
     */
    handleCellUpdate(cell) {
        console.log('Cell update:', cell);
        
        // Handle cell selection or movement
        if (this.gameBoard && this.serverState.step === 'from') {
            // Player selected a piece
            this.gameBoard.selectedTokenIndex = cell;
        }
    }
    
    /**
     * Handle game end
     */
    handleGameEnd(winner) {
        console.log('Game ended. Winner:', winner);
        
        const isWin = winner === this.playerNick;
        
        // Show victory modal
        if (this.gameBoard) {
            const winnerName = isWin ? 'You' : this.getOpponentName();
            this.gameBoard.showVictoryModal(winnerName, false);
        }
        
        // Record game for classification
        if (window.classification) {
            const opponent = this.getOpponentName();
            const gameDuration = this.gameBoard ? Math.floor((Date.now() - this.gameBoard.gameStartTime) / 1000) : 0;
            
            window.classification.recordResult(this.playerNick, isWin);
        }
        
        // Clean up
        this.stopGameUpdates();
        this.currentGame = null;
        this.isMyTurn = false;
    }

    /**
     * Initialize online game board
     */
    initializeOnlineBoard(boardSize, firstPlayer) {
        console.log('Initializing online board with size:', boardSize);
        
        // Clear any existing game
        if (window.game && window.game.stopGameUpdates) {
            window.game.stopGameUpdates();
        }
        
        // Create game board with online mode
        const options = {
            mode: this.currentServer === 'official' ? 'pvpOS' : 'pvpGS',
            firstPlayer: firstPlayer || 'player-1',
            isOnline: true
        };
        
        if (typeof generateBoard === 'function') {
            this.gameBoard = generateBoard(boardSize, options);
            window.game = this.gameBoard;
            
            // Set up online-specific event handlers
            this.setupOnlineEventHandlers();
            
            console.log('Online game board initialized:', this.gameBoard);
        }
    }
    
    /**
     * Set up online-specific event handlers
     */
    setupOnlineEventHandlers() {
        if (!this.gameBoard) return;
        
        // Override dice roll handler for online play
        const originalHandleStickRoll = this.gameBoard.handleStickRoll;
        this.gameBoard.handleStickRoll = (roll) => {
            // Call original handler
            originalHandleStickRoll.call(this.gameBoard, roll);
            
            // Send roll to server if it's our turn
            if (this.isMyTurn && this.currentGame) {
                this.rollDice();
            }
        };
        
        // Override move handler for online play
        const originalMovePiece = this.gameBoard.movePiece;
        this.gameBoard.movePiece = (from, to, diceValue) => {
            // Call original handler
            const result = originalMovePiece.call(this.gameBoard, from, to, diceValue);
            
            // Send move to server if it's our turn
            if (result && this.isMyTurn && this.currentGame) {
                this.notifyMove(from, to);
            }
            
            return result;
        };
        
        // Override pass turn handler
        const originalPassTurn = this.gameBoard.passTurn;
        this.gameBoard.passTurn = () => {
            // Call original handler
            originalPassTurn.call(this.gameBoard);
            
            // Send pass to server if it's our turn
            if (this.isMyTurn && this.currentGame) {
                this.passTurn();
            }
        };
        
        // Override resign handler
        const originalResign = this.gameBoard.resign;
        this.gameBoard.resign = () => {
            // Send leave to server
            if (this.currentGame) {
                this.leaveGame();
            }
            
            // Call original handler
            originalResign.call(this.gameBoard);
        };
    }

    /**
     * Update board from server pieces format
     */
    updateBoardFromServerPieces(serverPieces) {
        if (!this.gameBoard || !serverPieces) return;
        
        const board = this.gameBoard.board;
        const cols = board.cols;
        
        // Clear board
        for (let i = 0; i < board.content.length; i++) {
            board.content[i] = null;
        }
        
        // Place pieces according to server data
        serverPieces.forEach((pieceData, index) => {
            if (pieceData && pieceData.color) {
                // Convert server color to player ID
                const player = pieceData.color === 'Blue' ? 'player-1' : 'player-2';
                
                // Determine piece state
                let state = Piece.MOVED;
                if (!pieceData.inMotion) {
                    state = Piece.UNMOVED;
                } else if (pieceData.reachedLastRow) {
                    state = Piece.PROMOTED;
                }
                
                // Create piece
                const i = OnlineGameManager.correctIndexFromOS(this.gameBoard.cols, index);
                board.content[i] = new Piece(player, i, state);
            }
        });
    }

    /**
     * ROLL - Roll dice in online game
     */
    async rollDice() {
        if (!this.currentGame || !this.isMyTurn || !this.clientAPI) {
            console.log('Cannot roll: not my turn or no game');
            return;
        }

        try {
            console.log('Rolling dice online...');
            
            const response = await this.clientAPI.roll(
                this.playerNick,
                this.playerPassword,
                this.currentGame.id,
                0 // Cell parameter for roll
            );

            if (response.error) {
                this.showError('Roll error: ' + response.error);
                return;
            }

            console.log('Dice rolled online:', response);

        } catch (error) {
            this.showError('Communication error: ' + error.message);
        }
    }

    /**
     * NOTIFY - Notify server of a move
     */
    async notifyMove(fromCell, toCell) {
        if (!this.currentGame || !this.isMyTurn || !this.clientAPI) {
            console.log('Cannot notify move: not my turn or no game');
            return;
        }

        try {
            console.log('Notifying move:', { fromCell, toCell });
            
            // Send the cell that was clicked (from or to depending on step)
            let cellToSend = fromCell;
            if (this.serverState.step === 'to') {
                cellToSend = toCell;
            }
            
            const i = OnlineGameManager.correctIndexToOS(this.gameBoard.cols, cellToSend);
            const response = await this.clientAPI.notify(
                this.playerNick,
                this.playerPassword,
                this.currentGame.id,
                i // Official server uses different indexing to our gameBoard
            );

            if (response.error) {
                this.showError('Move error: ' + response.error);
                return;
            }

            console.log('Move notified to server:', response);

        } catch (error) {
            this.showError('Communication error: ' + error.message);
        }
    }

    /**
     * PASS - Pass turn in online game
     */
    async passTurn() {
        if (!this.currentGame || !this.isMyTurn || !this.clientAPI) {
            console.log('Cannot pass: not my turn or no game');
            return;
        }

        try {
            console.log('Passing turn online...');

            const response = await this.clientAPI.passTurn(
                this.playerNick,
                this.playerPassword,
                this.currentGame.id,
                0
            );

            if (response.error) {
                this.showError('Pass error: ' + response.error);
                return;
            }else{
                const diceCanvas = document.getElementById('dice-canvas');
                const stickCanvas = new StickCanvas(150, 75, [false,false,false,false]);
                diceCanvas.innerHTML = '';
                diceCanvas.appendChild(stickCanvas.canvas);
                stickCanvas.draw(true);
            }

            console.log('Turn passed online:', response);

        } catch (error) {
            this.showError('Communication error: ' + error.message);
        }
    }

    /**
     * LEAVE - Leave current game
     */
    async leaveGame() {
        if (!this.currentGame || !this.clientAPI) {
            console.log('No game to leave');
            return;
        }

        try {
            console.log('Leaving game...');
            
            const response = await this.clientAPI.leave(
                this.playerNick,
                this.playerPassword,
                this.currentGame.id
            );

            if (response.error) {
                console.error('Error leaving game:', response.error);
            }
        } catch (error) {
            console.error('Error leaving game:', error);
        }

        this.stopGameUpdates();
        this.currentGame = null;
        this.isMyTurn = false;
        console.log('Left online game');
    }

    /**
     * Stop listening for game updates
     */
    stopGameUpdates() {
        if (this.stopUpdateStream) {
            this.stopUpdateStream();
            this.stopUpdateStream = null;
        }
        this.isConnected = false;
        console.log('Stopped listening for game updates');
    }

    /**
     * Highlight cells on board
     */
    highlightCells(cells) {
        // Remove previous highlights
        document.querySelectorAll('.cell-highlighted').forEach(cell => {
            cell.classList.remove('cell-highlighted');
        });

        // Add new highlights
        cells.forEach(cellIndex => {
            const cell = document.querySelectorAll('.board-square')[cellIndex];
            if (cell) {
                cell.classList.add('cell-highlighted');
            }
        });
    }

    /**
     * Update game UI
     */
    updateGameUI() {
        if (!this.gameBoard) return;

        // Update turn message
        let turnMsg;
        if (this.isMyTurn) {
            turnMsg = 'Your turn!';
        } else {
            const opponent = this.getOpponentName();
            turnMsg = `${opponent}'s turn`;
        }
        
        this.showMessage(turnMsg);

        // Update control buttons
        this.updateControlButtons();
    }

    /**
     * Update control buttons based on game state
     */
    updateControlButtons() {
        const rollBtn = document.getElementById('rollDiceBtn');
        const passBtn = document.getElementById('passBtn');
        const resignBtn = document.getElementById('resignBtn');

        if (rollBtn) {
            rollBtn.disabled = !this.isMyTurn || this.gameBoard.diceRolled;
            rollBtn.style.opacity = (this.isMyTurn && !this.gameBoard.diceRolled) ? '1' : '0.5';
        }

        if (passBtn) {
            passBtn.disabled = !this.isMyTurn || !this.gameBoard.diceRolled;
            passBtn.style.opacity = (this.isMyTurn && this.gameBoard.diceRolled) ? '1' : '0.5';
        }
        
        if (resignBtn) {
            resignBtn.disabled = !this.currentGame;
            resignBtn.style.opacity = this.currentGame ? '1' : '0.5';
        }
    }

    /**
     * Get opponent name
     */
    getOpponentName() {
        if (!this.serverState.players || !this.playerNick) return 'Opponent';
        
        // Find Opponents's name in the list of players
        return Object.keys(this.serverState.players).find(nick => nick !== this.playerNick) || 'Opponent';
    }

    /**
     * Show message in game UI
     */
    showMessage(message) {
        if (this.gameBoard) {
            this.gameBoard.showMessage(message);
        } else {
            console.log('Game message:', message);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('Online game error:', message);
        if (this.gameBoard) {
            this.gameBoard.showMessage('❌ ' + message);
        }
    }

    /**
     * Get current game status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            currentGame: this.currentGame,
            playerNick: this.playerNick,
            isMyTurn: this.isMyTurn,
            server: this.currentServer,
            serverState: this.serverState
        };
    }
}

// Initialize online game manager
window.OnlineGameManager = OnlineGameManager;

// Create global instance but don't initialize immediately
window.initOnlineGameManager = function () {
    if (!window.onlineGameManager) {
        window.onlineGameManager = new OnlineGameManager();
        console.log('OnlineGameManager initialized');
    }
    return window.onlineGameManager;
};

// Auto-initialize if certain conditions are met
document.addEventListener('DOMContentLoaded', function () {
    if (window.AuthManager) {
        // Check if we have credentials for any server
        const hasOfficialCreds = window.AuthManager.getCredentials('official');
        const hasGroupCreds = window.AuthManager.getCredentials('group');

        if (hasOfficialCreds || hasGroupCreds || window.pendingOnlineSetup) {
            window.initOnlineGameManager();
        }
    }
});