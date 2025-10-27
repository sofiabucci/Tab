// Game board class simplificada
class GameBoard {
    constructor(id, cols) {
        this.cols = parseInt(cols) || 9;
        this.content = new Array(this.cols * 4).fill(null);
        this.boardElements = [];
        this.pieceStates = new Array(this.cols * 4).fill(null);
        
        this.options = {
            mode: (arguments[2]?.mode) || 'pvp',
            difficulty: (arguments[2]?.difficulty) || 'medium',
            firstPlayer: (arguments[2]?.firstPlayer) || 'player-1'
        };

        this.currentPlayer = this.options.firstPlayer;
        this.selectedFrom = null;
        this.rolling = false;

        this.initBoard(id);
        this.setupPieces();
        this.render();

        // IA rola automaticamente se começar
        if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
            setTimeout(() => this.triggerAIRoll(), 1000);
        }
    }

    initBoard(id) {
        const parent = document.getElementById(id);
        parent.innerHTML = '';
        
        const board = document.createElement('div');
        board.className = 'board';
        board.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        parent.appendChild(board);

        for (let i = 0; i < this.cols * 4; i++) {
            let cell = document.createElement('div');
            cell.className = 'board-square';
            cell.addEventListener('click', () => this.handleClick(i));
            board.appendChild(cell);
            this.boardElements[i] = cell;
        }
    }

    setupPieces() {
        // Peças começam da direita
        for (let c = 0; c < this.cols; c++) {
            // Player 2 (top) - direita para esquerda
            const p2Idx = this.cols - 1 - c;
            this.content[p2Idx] = { 
                player: 'player-2', 
                hasConverted: false,
                hasEnteredOpponentHome: false,
                history: [0]
            };
            this.pieceStates[p2Idx] = 'unmoved';

            // Player 1 (bottom) - direita para esquerda  
            const p1Idx = 3 * this.cols + (this.cols - 1 - c);
            this.content[p1Idx] = { 
                player: 'player-1', 
                hasConverted: false,
                hasEnteredOpponentHome: false,
                history: [3]
            };
            this.pieceStates[p1Idx] = 'unmoved';
        }
    }

    handleClick(i) {
        if (!window.lastRoll) {
            this.showMessage('Roll dice first!');
            return;
        }

        const piece = this.content[i];
        
        if (!this.selectedFrom) {
            // Selecionar peça
            if (!piece || piece.player !== this.currentPlayer) {
                this.showMessage('Select your piece');
                return;
            }

            if (this.pieceStates[i] === 'unmoved' && window.lastRoll.value !== 1) {
                this.showMessage('First move must be with Tâb (1)');
                return;
            }

            const target = this.calculateMove(i, window.lastRoll.value);
            if (target === null || (this.content[target] && this.content[target].player === piece.player)) {
                this.showMessage('Invalid move');
                return;
            }

            this.selectedFrom = i;
            this.showMessage('Click target to move');
            this.render();
        } else {
            // Mover peça
            const target = this.calculateMove(this.selectedFrom, window.lastRoll.value);
            if (i === target) {
                this.movePiece(this.selectedFrom, target);
                this.selectedFrom = null;
                
                // IA joga automaticamente se for sua vez
                if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2' && window.lastRoll.repeats) {
                    setTimeout(() => this.triggerAIRoll(), 800);
                }
            } else {
                this.selectedFrom = null;
                this.handleClick(i);
            }
        }
    }

    calculateMove(fromIndex, steps) {
        let row = Math.floor(fromIndex / this.cols);
        let col = fromIndex % this.cols;
        let remaining = steps;

        while (remaining > 0) {
            const direction = (row === 0 || row === 2) ? 1 : -1;
            col += direction;

            if (col < 0) {
                if (row === 1) { row = 0; col = 0; }
                else if (row === 3) { row = 2; col = this.cols - 1; }
                else return null;
            } else if (col >= this.cols) {
                if (row === 0) { row = 1; col = this.cols - 1; }
                else if (row === 2) { row = 3; col = 0; }
                else return null;
            }

            remaining--;
        }

        const result = row * this.cols + col;
        return (result >= 0 && result < this.content.length) ? result : null;
    }

    movePiece(from, to) {
        const piece = this.content[from];
        const targetPiece = this.content[to];
        
        // Captura
        if (targetPiece && targetPiece.player !== piece.player) {
            this.showMessage('Piece captured!');
        }

        // Atualizar estado
        this.content[to] = piece;
        this.content[from] = null;
        
        const wasUnmoved = this.pieceStates[from] === 'unmoved';
        this.pieceStates[to] = wasUnmoved ? 'moved' : this.pieceStates[from];

        // Conversão no primeiro movimento
        if (wasUnmoved && window.lastRoll.value === 1) {
            piece.hasConverted = true;
        }

        // Entrar na home do oponente
        const opponentHomeRow = piece.player === 'player-1' ? 0 : 3;
        if (Math.floor(to / this.cols) === opponentHomeRow && !piece.hasEnteredOpponentHome) {
            piece.hasEnteredOpponentHome = true;
        }

        // Histórico
        if (!piece.history.includes(Math.floor(to / this.cols))) {
            piece.history.push(Math.floor(to / this.cols));
        }

        // Mudar turno se não repeat
        if (!window.lastRoll.repeats) {
            this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
            
            // IA rola automaticamente
            if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
                setTimeout(() => this.triggerAIRoll(), 800);
            }
        }

        this.render();
        this.checkGameEnd();
    }

    triggerAIRoll() {
        if (window.rollStickDice) {
            window.rollStickDice();
        } else {
            this.rollDice();
        }
    }

    async rollDice() {
        if (this.rolling) return;
        this.rolling = true;

        this.showMessage('Rolling...');
        
        setTimeout(() => {
            const faces = Array(4).fill().map(() => Math.random() < 0.5 ? 'light' : 'dark');
            const lightCount = faces.filter(f => f === 'light').length;
            const value = {0:6, 1:1, 2:2, 3:3, 4:4}[lightCount];
            const repeats = [1, 4, 6].includes(value);
            
            window.lastRoll = { value, repeats, faces, lightCount };
            
            const names = {1:'Tâb', 2:'Itneyn', 3:'Teláteh', 4:'Arba\'ah', 6:'Sitteh'};
            const msg = `Roll: ${value} (${names[value]}) - ${repeats ? 'Roll again!' : 'Next player'}`;
            this.showMessage(msg);
            
            this.rolling = false;

            // IA faz movimento automaticamente
            if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
                setTimeout(() => this.makeAIMove(), 500);
            }
        }, 800);
    }

    async makeAIMove() {
        if (!window.IA) {
            this.showMessage('AI not available');
            return;
        }

        try {
            const state = window.IA.fromGameBoard(this.content, this.cols, this.currentPlayer);
            const move = await window.IA.chooseMoveAI(state, window.lastRoll.value, this.options.difficulty);
            
            if (move && move.type !== 'PASS') {
                const indices = window.IA.moveToIndices(move, this.cols);
                this.movePiece(indices.from, indices.to);
                
                if (window.lastRoll.repeats) {
                    setTimeout(() => this.triggerAIRoll(), 1000);
                }
            } else {
                this.currentPlayer = 'player-1';
                this.render();
                this.showMessage('AI passed turn');
            }
        } catch (error) {
            console.error('AI error:', error);
            this.currentPlayer = 'player-1';
            this.render();
        }
    }

    render() {
        this.boardElements.forEach((cell, i) => {
            cell.innerHTML = '';
            const piece = this.content[i];
            
            if (piece) {
                const token = document.createElement('div');
                token.className = `board-token ${piece.player}`;
                
                // Diferentes opacidades baseadas no estado
                const state = this.pieceStates[i];
                if (state === 'unmoved') token.style.opacity = '1.0';
                else if (state === 'moved') token.style.opacity = '0.7';
                else if (state === 'reached-last-row') token.style.opacity = '0.4';
                
                if (this.selectedFrom === i) {
                    token.style.outline = '2px solid gold';
                    token.style.boxShadow = '0 0 8px gold';
                }
                
                cell.appendChild(token);
            }
        });

        const turnMsg = this.options.mode === 'pvc' && this.currentPlayer === 'player-2' 
            ? "AI's turn" 
            : `Player ${this.currentPlayer === 'player-1' ? '1' : '2'}'s turn`;
        this.showMessage(turnMsg);
    }

    showMessage(text) {
        const msgEl = document.getElementById('gameMessage');
        if (msgEl) msgEl.textContent = text;
    }

    checkGameEnd() {
        const p1Pieces = this.content.filter(p => p && p.player === 'player-1').length;
        const p2Pieces = this.content.filter(p => p && p.player === 'player-2').length;
        
        if (p1Pieces === 0 || p2Pieces === 0) {
            const winner = p1Pieces === 0 ? 'Player 2' : 'Player 1';
            this.showMessage(`Game Over! ${winner} wins!`);
            return true;
        }
        return false;
    }

    // Para compatibilidade com o sistema de dados existente
    handleStickRoll(roll) {
        window.lastRoll = roll;
        this.showRollResult(roll);
        
        if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    showRollResult(roll) {
        const names = {1:'Tâb', 2:'Itneyn', 3:'Teláteh', 4:'Arba\'ah', 6:'Sitteh'};
        const msg = `Roll: ${roll.value} (${names[roll.value]}) - ${roll.repeats ? 'Roll again!' : 'Next player'}`;
        this.showMessage(msg);
    }
}

// Inicialização
function generateBoard(columns = 9, options = {}) {
    window.game = new GameBoard('board-container', columns, options);
    
    // Conectar botões
    const passBtn = document.getElementById('passBtn');
    const resignBtn = document.getElementById('resignBtn');
    
    if (passBtn) {
        passBtn.onclick = () => {
            if (window.game && !window.lastRoll?.repeats) {
                window.game.currentPlayer = window.game.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
                window.game.render();
                
                if (window.game.options.mode === 'pvc' && window.game.currentPlayer === 'player-2') {
                    setTimeout(() => window.game.triggerAIRoll(), 800);
                }
            }
        };
    }
    
    if (resignBtn) {
        resignBtn.onclick = () => {
            if (window.game) {
                const winner = window.game.currentPlayer === 'player-1' ? 'Player 2' : 'Player 1';
                window.game.showMessage(`Resigned! ${winner} wins!`);
            }
        };
    }
    
    return window.game;
}

// Compatibilidade com sistema existente
window.generateBoard = generateBoard;
window.GameBoard = GameBoard;

// Listener para eventos de dados existentes
document.addEventListener('stickRoll', (e) => {
    if (window.game) {
        window.game.handleStickRoll(e.detail);
    }
});