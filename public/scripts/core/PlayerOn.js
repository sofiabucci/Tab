/**
 * @file online.js
 * @description Online multiplayer system for Tâb game
 * Integrates with existing classification system and game flow
 */

class OnlineGameManager {
    constructor() {
        this.serverUrl = 'http://twserver.alunos.dcc.fc.up.pt:8008';
        this.currentGame = null;
        this.playerNick = null;
        this.playerPassword = null;
        this.eventSource = null;
        this.isConnected = false;
        this.isMyTurn = false;
        
        this.initialize();
    }

    /**
     * Initialize online game system
     */
    initialize() {
        this.loadPlayerCredentials();
        console.log('Online game manager initialized');
    }

    /**
     * Load player credentials from localStorage
     */
    loadPlayerCredentials() {
        this.playerNick = localStorage.getItem('tabOnlineNick');
        this.playerPassword = localStorage.getItem('tabOnlinePassword');
    }

    /**
     * Save player credentials to localStorage
     */
    savePlayerCredentials(nick, password) {
        this.playerNick = nick;
        this.playerPassword = password;
        localStorage.setItem('tabOnlineNick', nick);
        localStorage.setItem('tabOnlinePassword', password);
    }

    /**
     * Start online game - called from setup.js
     */
    async startOnlineGame(boardSize, firstPlayer) {
        try {
            console.log('Starting online game...');

            // Ensure player is registered
            if (!this.playerNick || !this.playerPassword) {
                await this.showRegistrationModal();
                if (!this.playerNick || !this.playerPassword) {
                    throw new Error('Registration cancelled');
                }
            }

            // Join game on server
            await this.joinGame(boardSize);

            // Initialize game board for online play
            this.initializeOnlineBoard(boardSize);

            this.showMessage('🔄 Procurando oponente...');

            return true;

        } catch (error) {
            console.error('Error starting online game:', error);
            this.showError('Erro ao iniciar jogo online: ' + error.message);
            return false;
        }
    }

    /**
     * Show registration modal
     */
    async showRegistrationModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="setup-container">
                    <h2>Registo para Jogo Online</h2>
                    <form id="registerForm">
                        <div class="form-group">
                            <label for="onlineNick">Nickname:</label>
                            <input type="text" id="onlineNick" required maxlength="20" placeholder="Seu nickname">
                        </div>
                        <div class="form-group">
                            <label for="onlinePassword">Password:</label>
                            <input type="password" id="onlinePassword" required placeholder="Sua password">
                        </div>
                        <div class="setup-controls">
                            <button type="submit" class="btn-primary">Registar & Jogar</button>
                            <button type="button" class="btn-secondary" id="cancelOnline">Cancelar</button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            const registerForm = modal.querySelector('#registerForm');
            const cancelBtn = modal.querySelector('#cancelOnline');

            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nick = document.getElementById('onlineNick').value;
                const password = document.getElementById('onlinePassword').value;

                try {
                    await this.register(nick, password);
                    this.savePlayerCredentials(nick, password);
                    modal.remove();
                    resolve();
                } catch (error) {
                    this.showError('Erro no registo: ' + error.message);
                }
            });

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve();
            });
        });
    }

    /**
     * REGISTER - Register player on server
     */
    async register(nick, password) {
        const response = await this.makeRequest('register', { nick, password });
        
        if (response.error) {
            throw new Error(response.error);
        }

        console.log('Player registered successfully:', nick);
        return response;
    }

    /**
     * JOIN - Join online game
     */
    async joinGame(size) {
        const response = await this.makeRequest('join', {
            nick: this.playerNick,
            password: this.playerPassword,
            size: size,
            game: 'tab'
        });

        if (response.error) {
            throw new Error(response.error);
        }

        this.currentGame = {
            id: response.game,
            size: size,
            players: response.players,
            turn: response.turn,
            pieces: response.pieces,
            initial: response.initial
        };

        this.isMyTurn = response.turn === this.playerNick;

        // Start listening for game updates
        this.startGameUpdates();

        console.log('Joined online game:', this.currentGame);
        return response;
    }

    /**
     * LEAVE - Leave current game
     */
    async leaveGame() {
        if (!this.currentGame) return;

        try {
            const response = await this.makeRequest('leave', {
                nick: this.playerNick,
                password: this.playerPassword,
                game: this.currentGame.id
            });

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
     * ROLL - Roll dice in online game
     */
    async rollDice() {
        if (!this.currentGame || !this.isMyTurn) return;

        try {
            const response = await this.makeRequest('roll', {
                nick: this.playerNick,
                password: this.playerPassword,
                game: this.currentGame.id,
                cell: 0 // Cell parameter for roll
            });

            if (response.error) {
                this.showError('Erro ao lançar dados: ' + response.error);
                return;
            }

            console.log('Dice rolled online:', response);
            this.handleServerResponse(response);

        } catch (error) {
            this.showError('Erro de comunicação: ' + error.message);
        }
    }

    /**
     * PASS - Pass turn in online game
     */
    async passTurn() {
        if (!this.currentGame || !this.isMyTurn) return;

        try {
            const response = await this.makeRequest('pass', {
                nick: this.playerNick,
                password: this.playerPassword,
                game: this.currentGame.id,
                cell: 0
            });

            if (response.error) {
                this.showError('Erro ao passar vez: ' + response.error);
                return;
            }

            console.log('Turn passed online');
            this.handleServerResponse(response);

        } catch (error) {
            this.showError('Erro de comunicação: ' + error.message);
        }
    }

    /**
     * NOTIFY - Notify server of a move
     */
    async notifyMove(fromCell, toCell) {
        if (!this.currentGame || !this.isMyTurn) return;

        try {
            const moveCode = this.encodeMove(fromCell, toCell);
            
            const response = await this.makeRequest('notify', {
                nick: this.playerNick,
                password: this.playerPassword,
                game: this.currentGame.id,
                cell: moveCode
            });

            if (response.error) {
                this.showError('Erro na jogada: ' + response.error);
                return;
            }

            console.log('Move notified to server:', { fromCell, toCell, moveCode });
            this.handleServerResponse(response);

        } catch (error) {
            this.showError('Erro de comunicação: ' + error.message);
        }
    }

    /**
     * UPDATE - Start listening for game updates via Server-Sent Events
     */
    startGameUpdates() {
        if (!this.currentGame) return;

        const updateUrl = `${this.serverUrl}/update?game=${this.currentGame.id}&nick=${this.playerNick}`;
        
        this.eventSource = new EventSource(updateUrl);
        
        this.eventSource.onmessage = (event) => {
            try {
                const update = JSON.parse(event.data);
                console.log('Game update received:', update);
                this.handleServerResponse(update);
            } catch (error) {
                console.error('Error parsing game update:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            this.showError('Conexão com o servidor perdida');
            this.isConnected = false;
        };

        this.isConnected = true;
        console.log('Started listening for game updates');
    }

    /**
     * Stop listening for game updates
     */
    stopGameUpdates() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        console.log('Stopped listening for game updates');
    }

    /**
     * Handle server responses and updates
     */
    handleServerResponse(response) {
        if (response.error) {
            this.showError(response.error);
            return;
        }

        // Update game state
        this.updateGameState(response);

        // Handle specific response types
        if (response.winner) {
            this.handleGameEnd(response.winner);
            return;
        }

        if (response.mustPass) {
            this.handleMustPass();
        }

        if (response.dice) {
            this.handleDiceResult(response.dice);
        }

        if (response.selected) {
            this.handleSelectedCells(response.selected);
        }

        // Update UI
        this.updateGameUI();
    }

    /**
     * Update game state from server response
     */
    updateGameState(serverData) {
        if (!this.currentGame) return;

        // Update basic game state
        if (serverData.turn !== undefined) {
            this.currentGame.turn = serverData.turn;
            this.isMyTurn = serverData.turn === this.playerNick;
        }

        if (serverData.pieces) {
            this.currentGame.pieces = serverData.pieces;
        }

        if (serverData.players) {
            this.currentGame.players = serverData.players;
        }

        // Update board if pieces changed
        if (serverData.pieces && window.game) {
            this.updateBoard();
        }
    }

    /**
     * Update game board with server pieces data
     */
    updateBoard() {
        if (!this.currentGame.pieces || !window.game) return;

        const board = window.game.board;
        const cols = board.cols;

        // Clear board
        for (let i = 0; i < board.content.length; i++) {
            board.content[i] = null;
        }

        // Place pieces according to server data
        this.currentGame.pieces.forEach((pieceCode, index) => {
            if (pieceCode !== null && pieceCode !== 0) {
                const player = pieceCode === 1 ? 'player-1' : 'player-2';
                const state = this.determinePieceState(index, player, cols);
                board.content[index] = new Piece(player, index, state);
            }
        });

        // Re-render board
        window.game.render();
    }

    /**
     * Determine piece state based on position
     */
    determinePieceState(index, player, cols) {
        const row = Math.floor(index / cols);
        const isStartingRow = (player === 'player-1' && row === 3) || 
                             (player === 'player-2' && row === 0);
        
        return isStartingRow ? 'unmoved' : 'moved';
    }

    /**
     * Update game UI
     */
    updateGameUI() {
        if (!window.game) return;

        // Update turn message
        if (this.isMyTurn) {
            window.game.showMessage('Sua vez de jogar!');
        } else {
            const opponent = this.getOpponentName();
            window.game.showMessage(`Vez de ${opponent}`);
        }

        // Update control buttons
        this.updateControlButtons();
    }

    /**
     * Update control buttons based on game state
     */
    updateControlButtons() {
        const rollBtn = document.getElementById('rollDiceBtn');
        const passBtn = document.getElementById('passBtn');

        if (rollBtn) {
            rollBtn.disabled = !this.isMyTurn;
            rollBtn.style.opacity = this.isMyTurn ? '1' : '0.5';
        }

        if (passBtn) {
            passBtn.disabled = !this.isMyTurn;
            passBtn.style.opacity = this.isMyTurn ? '1' : '0.5';
        }
    }

    /**
     * Handle dice result from server
     */
    handleDiceResult(diceValue) {
        console.log('Dice result from server:', diceValue);
        
        // Update UI with dice result
        const diceResult = document.getElementById('diceResult');
        if (diceResult) {
            const names = { 1: 'Tâb', 2: 'Itneyn', 3: 'Teláteh', 4: 'Arba\'ah', 6: 'Sitteh' };
            diceResult.innerHTML = `
                <div class="dice-result-info">
                    <div class="dice-value">Dado: ${diceValue} (${names[diceValue]})</div>
                    ${this.isMyTurn ? '<div class="dice-repeats">Faça sua jogada!</div>' : ''}
                </div>
            `;
        }

        if (window.game) {
            window.game.diceRolled = true;
            window.lastRoll = { value: diceValue };
        }
    }

    /**
     * Handle game end
     */
    handleGameEnd(winner) {
        console.log('Game ended. Winner:', winner);
        
        const isWin = winner === this.playerNick;
        
        // Show victory modal
        if (window.game) {
            window.game.showVictoryModal(winner, false);
        }

        // Record game for classification
        if (window.classification) {
            const opponent = this.getOpponentName();
            window.classification.recordGame(
                this.playerNick,
                opponent,
                winner,
                Math.floor((Date.now() - window.game.gameStartTime) / 1000),
                isWin ? 9 : 0, // pieces remaining - ajustar conforme necessário
                9, // total pieces
                'pvpo', // player vs player online
                false,
                null
            );
        }

        // Clean up
        this.stopGameUpdates();
        this.currentGame = null;
        this.isMyTurn = false;
    }

    /**
     * Handle must pass situation
     */
    handleMustPass() {
        this.showMessage('Você deve passar a vez');
        
        // Auto-pass after short delay
        if (this.isMyTurn) {
            setTimeout(() => {
                if (this.isMyTurn && this.currentGame) {
                    this.passTurn();
                }
            }, 2000);
        }
    }

    /**
     * Handle selected cells (for move selection)
     */
    handleSelectedCells(selected) {
        console.log('Selected cells:', selected);
        // Implement cell highlighting for move selection
        this.highlightCells(selected);
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
     * Initialize online game board
     */
    initializeOnlineBoard(boardSize) {
        // Use existing game initialization with online mode
        if (typeof generateBoard === 'function') {
            const options = {
                mode: 'pvpo',
                firstPlayer: 'player-1' // Server will handle actual first player
            };
            window.game = generateBoard(boardSize, options);
        }
    }

    /**
     * Get opponent name
     */
    getOpponentName() {
        if (!this.currentGame.players) return 'Oponente';
        return this.currentGame.players.find(p => p !== this.playerNick) || 'Oponente';
    }

    /**
     * Encode move for server (simplified)
     */
    encodeMove(fromCell, toCell) {
        // Simple encoding: fromCell * 100 + toCell
        return fromCell * 100 + toCell;
    }

    /**
     * Make request to server
     */
    async makeRequest(endpoint, data) {
        try {
            const response = await fetch(`${this.serverUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Request to ${endpoint} failed:`, error);
            throw new Error('Falha de comunicação com o servidor');
        }
    }

    /**
     * RANKING - Get server ranking
     */
    async getRanking(group = 99, size = 20) {
        try {
            const response = await this.makeRequest('ranking', { group, size });
            
            if (response.error) {
                throw new Error(response.error);
            }

            return response.ranking || [];
        } catch (error) {
            console.error('Error getting ranking:', error);
            return [];
        }
    }

    /**
     * Show message in game UI
     */
    showMessage(message) {
        if (window.game) {
            window.game.showMessage(message);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('Online game error:', message);
        if (window.game) {
            window.game.showMessage('❌ ' + message);
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
            isMyTurn: this.isMyTurn
        };
    }
}

// Initialize online game manager
window.onlineGameManager = new OnlineGameManager();