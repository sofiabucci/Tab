// Game board class
class GameBoard {
    constructor(id, cols) {
        // Accept either (id, cols) or (id, cols, options)
        let options = {};
        if (arguments.length >= 3) options = arguments[2] || {};

        this.cols = parseInt(cols) || 9;
        this.content = new Array(this.cols*4);
        this.boardElements = new Array(this.cols*4);
        
        // Store game options
        this.options = {
            mode: options.mode || 'pvp',
            difficulty: options.difficulty || 'medium',
            firstPlayer: options.firstPlayer || 'player-1'
        };

        // Normalize firstPlayer values
        const fp = ('' + this.options.firstPlayer).toString();
        const normalizedFirst = (fp === 'player2' || fp === 'player-2') ? 'player-2' : 'player-1';
        this.options.firstPlayer = normalizedFirst;

        // Set starting player code
        this.currentPlayer = this.options.firstPlayer === 'player-2' ? 'player-2' : 'player-1';
        
        // Track piece states: 'unmoved', 'moved', 'reached-last-row'
        this.pieceStates = new Array(this.cols*4);
        this.pieceStates.fill(null);

        const parent = document.getElementById(id);
        parent.innerHTML = '';

        const board = document.createElement('div');
        board.className = 'board';
        board.style.setProperty('--cols', this.cols.toString());
        parent.appendChild(board);

        board.style.gridTemplateRows = `repeat(4, auto)`;
        board.style.gridTemplateColumns = `repeat(${this.cols}, auto)`;

        // Create cells
        for(let i = 0; i < this.cols*4; i++) {
            let cell = document.createElement('div');
            cell.className = 'board-square';
            cell.dataset.index = i;
            board.appendChild(cell);

            cell.addEventListener('click', () => this.play && this.play(i));
            this.boardElements[i] = cell;  
        }

        // Initialize content array
        this.content.fill(null);

        // Place initial pieces
        for (let c = 0; c < this.cols; c++) {
            // Player 2 (top row)
            this.content[c] = { player: 'player-2' };
            this.pieceStates[c] = 'unmoved';
            
            // Player 1 (bottom row)
            const idx = 3*this.cols + c;
            this.content[idx] = { player: 'player-1' };
            this.pieceStates[idx] = 'unmoved';
        }

        this.render();

        // Listen to stickRoll events
        document.addEventListener('stickRoll', async (e) => {
            const roll = e.detail;
            if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
                // Small delay to make AI move visible
                setTimeout(() => {
                    this.handleAIMove(roll.value, roll.repeats);
                }, 500);
            }
        });
    }

    // Get row from index
    getRow(index) {
        return Math.floor(index / this.cols);
    }

    // Get column from index
    getCol(index) {
        return index % this.cols;
    }

    // Get index from row and column
    getIndex(row, col) {
        return row * this.cols + col;
    }

    getMovementDirection(row) {
        // Linhas 0 e 2: esquerda para direita (→)
        // Linhas 1 e 3: direita para esquerda (←)
        return (row === 0 || row === 2) ? 1 : -1;
    }

    calculateNextPosition(fromIndex, steps) {
        if (fromIndex === null || fromIndex === undefined) return null;
        
        const fromRow = this.getRow(fromIndex);
        const fromCol = this.getCol(fromIndex);
        const player = this.content[fromIndex]?.player;
        
        if (!player) return null;

        let currentRow = fromRow;
        let currentCol = fromCol;
        let remainingSteps = steps;

        while (remainingSteps > 0) {
            const direction = this.getMovementDirection(currentRow);
            let nextCol = currentCol + direction;
            let nextRow = currentRow;

            // Verificar transições entre linhas
            if (nextCol < 0) {
                // Mudar para linha anterior
                if (currentRow === 1) {
                    nextRow = 0;
                    nextCol = 0;
                } else if (currentRow === 3) {
                    nextRow = 2;
                    nextCol = this.cols - 1;
                } else {
                    return null; // Movimento inválido
                }
            } else if (nextCol >= this.cols) {
                // Mudar para próxima linha
                if (currentRow === 0) {
                    nextRow = 1;
                    nextCol = this.cols - 1;
                } else if (currentRow === 2) {
                    // Da linha 2 pode ir para linha 3
                    nextRow = 3;
                    nextCol = this.cols - 1;
                } else {
                    return null; // Movimento inválido
                }
            }

            // Verificar limites
            if (nextRow < 0 || nextRow >= 4 || nextCol < 0 || nextCol >= this.cols) {
                return null;
            }

            currentRow = nextRow;
            currentCol = nextCol;
            remainingSteps--;
        }

        return this.getIndex(currentRow, currentCol);
    }

    hasPiecesInHomeRow(player) {
        const homeRow = player === 'player-1' ? 3 : 0;
        for (let c = 0; c < this.cols; c++) {
            const idx = this.getIndex(homeRow, c);
            if (this.content[idx] && this.content[idx].player === player) {
                return true;
            }
        }
        return false;
    }

    // Render tokens with state-based transparency
    render() {
        try {
            const msg = document.getElementById('gameMessage');
            if (msg) {
                const text = this.currentPlayer === 'player-1'
                    ? "Player 1's turn: place or move a piece."
                    : "Player 2's turn: place or move a piece.";
                msg.textContent = text;
            }
        } catch (err) { /* ignore */ }
        
        for (let i = 0; i < this.boardElements.length; i++) {
            const cell = this.boardElements[i];
            Array.from(cell.querySelectorAll('.board-token')).forEach(t => t.remove());
            const obj = this.content[i];
            if (obj && obj.player) {
                const token = document.createElement('div');
                token.className = `board-token ${obj.player === 'player-1' ? 'player-1' : 'player-2'}`;
                
                // Apply transparency based on piece state
                const state = this.pieceStates[i];
                if (state === 'unmoved') {
                    token.style.opacity = '1.0';
                } else if (state === 'moved') {
                    token.style.opacity = '0.7';
                } else if (state === 'reached-last-row') {
                    token.style.opacity = '0.4';
                }
                
                token.dataset.index = i;
                token.setAttribute('aria-label', obj.player);
                cell.appendChild(token);
            }
        }
    }

    applyMoveIndices(fromIdx, toIdx, keepTurn = false) {
        const piece = this.content[fromIdx];
        if (!piece) return false;
        
        // Verificar captura
        const targetPiece = this.content[toIdx];
        const wasCapture = targetPiece && targetPiece.player !== piece.player;

        // Atualizar estado da peça
        const toRow = this.getRow(toIdx);
        const lastRow = piece.player === 'player-1' ? 0 : 3; // Linha final oposta
        
        if (toRow === lastRow && this.pieceStates[fromIdx] !== 'reached-last-row') {
            this.pieceStates[toIdx] = 'reached-last-row';
        } else if (this.pieceStates[fromIdx] === 'unmoved') {
            this.pieceStates[toIdx] = 'moved';
        } else {
            this.pieceStates[toIdx] = this.pieceStates[fromIdx];
        }

        // Mover peça
        this.content[fromIdx] = null;
        this.pieceStates[fromIdx] = null;
        this.content[toIdx] = piece;
        
        // Remover peça capturada se houver
        if (wasCapture) {
            this.content[toIdx] = piece; // A peça que se moveu fica na posição
        }

        // Verificar se o jogador pode jogar novamente
        const lastRoll = window.stickDiceLastRoll;
        const canPlayAgain = lastRoll && lastRoll.repeats && !keepTurn;

        if (!canPlayAgain) {
            this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
        }

        this.render();
        
        if (!canPlayAgain) {
            document.dispatchEvent(new CustomEvent('moveEnded'));
        }

        // Notificar sobre captura
        try {
            const msg = document.getElementById('gameMessage');
            if (msg && wasCapture) {
                msg.textContent = 'Piece captured!';
            }
        } catch (err) { /* ignore */ }

        // Verificar fim de jogo
        this.checkGameOver();
        
        return true;
    }

    // CORREÇÃO: Lógica principal do movimento
    play(fromIndex){
        // Verificar se há roll disponível
        const last = window.stickDiceLastRoll;
        if (!last) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'Wait: no roll available. Click Roll.';
            return;
        }

        const piece = this.content[fromIndex];
        if (!piece) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'Invalid selection: no piece in this square.';
            return;
        }

        if (piece.player !== this.currentPlayer) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = "This is not your piece. Wait for your turn.";
            return;
        }

        // CORREÇÃO: Verificar regra do primeiro movimento
        const pieceState = this.pieceStates[fromIndex];
        if (pieceState === 'unmoved' && last.value !== 1) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'First move must be with Tâb (value 1)';
            return;
        }

        // CORREÇÃO: Verificar restrição de movimento na última linha
        const fromRow = this.getRow(fromIndex);
        const lastRow = piece.player === 'player-1' ? 0 : 3;
        if (fromRow === lastRow && this.pieceStates[fromIndex] === 'reached-last-row') {
            if (this.hasPiecesInHomeRow(piece.player)) {
                const msg = document.getElementById('gameMessage');
                if (msg) msg.textContent = 'Cannot move in last row while pieces remain in home row';
                return;
            }
        }

        // Calcular posição alvo
        const target = this.calculateNextPosition(fromIndex, last.value);
        
        if (target === null || target < 0 || target >= this.content.length) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'Invalid move: out of board bounds.';
            return;
        }

        // Verificar se o destino tem peça do mesmo jogador
        const dest = this.content[target];
        if (dest && dest.player === piece.player) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'Blocked: your piece is in the destination.';
            return;
        }

        // CORREÇÃO: Verificar retorno à linha inicial
        const targetRow = this.getRow(target);
        const homeRow = piece.player === 'player-1' ? 3 : 0;
        if (targetRow === homeRow && pieceState !== 'unmoved') {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'Cannot return to home row.';
            return;
        }

        // Aplicar movimento
        const success = this.applyMoveIndices(fromIndex, target, last.repeats);
        if (success) {
            const msg = document.getElementById('gameMessage');
            if (msg) {
                if (last.repeats) {
                    msg.textContent = `Move executed! Roll again.`;
                } else {
                    msg.textContent = `Move executed: ${fromIndex} → ${target}`;
                }
            }
        }
    }

    async handleAIMove(stickValue, repeats) {
        if (!window.IA) {
            console.warn('IA module not loaded');
            return;
        }

        try {
            // Construir estado para a IA
            const state = window.IA.fromGameBoard(this.content, this.cols, this.currentPlayer);
            
            // Escolher movimento
            const choice = await window.IA.chooseMoveAI(state, this.options.difficulty);
            
            if (!choice || choice.type === 'PASS') {
                // Finalizar turno da IA
                this.currentPlayer = 'player-1';
                this.render();
                document.dispatchEvent(new CustomEvent('moveEnded'));
                return;
            }

            // Converter movimento para índices
            const indices = window.IA.moveToIndices(choice, this.cols);
            
            if (indices.type === 'PASS') {
                this.currentPlayer = 'player-1';
                this.render();
                document.dispatchEvent(new CustomEvent('moveEnded'));
                return;
            }

            // Aplicar movimento visualmente
            this.applyMoveIndices(indices.from, indices.to);

        } catch (error) {
            console.error('AI move error:', error);
            // Em caso de erro, passar a vez
            this.currentPlayer = 'player-1';
            this.render();
            document.dispatchEvent(new CustomEvent('moveEnded'));
        }
    }

    // Determinar se o jogador atual tem algum movimento legal
    canPass() {
        const last = window.stickDiceLastRoll;
        if (!last) return false;

        const value = last.value;
        
        for (let i = 0; i < this.content.length; i++) {
            const piece = this.content[i];
            if (!piece || piece.player !== this.currentPlayer) continue;

            // Verificar regra do primeiro movimento
            const pieceState = this.pieceStates[i];
            if (pieceState === 'unmoved' && value !== 1) continue;

            // Verificar restrição da última linha
            const fromRow = this.getRow(i);
            const lastRow = piece.player === 'player-1' ? 0 : 3;
            if (fromRow === lastRow && pieceState === 'reached-last-row' && this.hasPiecesInHomeRow(piece.player)) {
                continue;
            }

            // Calcular alvo
            const target = this.calculateNextPosition(i, value);
            if (target === null || target < 0 || target >= this.content.length) continue;

            // Verificar destino
            const dest = this.content[target];
            if (dest && dest.player === piece.player) continue;

            // Verificar retorno à linha inicial
            const targetRow = this.getRow(target);
            const homeRow = piece.player === 'player-1' ? 3 : 0;
            if (targetRow === homeRow && pieceState !== 'unmoved') continue;

            // Movimento válido encontrado
            return false;
        }

        // Nenhum movimento legal encontrado
        return true;
    }

    // Resign: give victory to opponent and emit event
    resign() {
        const winner = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
        // Show message
        try {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = `Player resigned. Victory for ${winner === 'player-1' ? 'Player 1' : 'Player 2'}`;
        } catch (err) {}
        // Emit an event for logger
        document.dispatchEvent(new CustomEvent('playerResigned', { detail: { winner } }));
        // Optionally, disable further interaction by clearing play handler
        this.play = function(){ /* game ended */ };
    }

    // Check if game is over
    checkGameOver() {
        let player1Pieces = 0;
        let player2Pieces = 0;

        for (let i = 0; i < this.content.length; i++) {
            if (this.content[i]) {
                if (this.content[i].player === 'player-1') {
                    player1Pieces++;
                } else {
                    player2Pieces++;
                }
            }
        }

        if (player1Pieces === 0 || player2Pieces === 0) {
            const winner = player1Pieces === 0 ? 'Player 2' : 'Player 1';
            try {
                const msg = document.getElementById('gameMessage');
                if (msg) msg.textContent = `Game Over! ${winner} wins!`;
            } catch (err) {}
            
            // Disable further moves
            this.play = function(){ /* game ended */ };
            return true;
        }
        return false;
    }
}

// Expose a helper to generate the board with options
function generateBoard(columns, options = {}) {
    // Ensure columns is a number and fallback to 9
    const cols = parseInt(columns) || 9;
    // Create a GameBoard instance and store it globally if needed
    window._currentGameBoard = new GameBoard('board-container', cols, options);
    
    // Wire UI controls (pass/resign) to the generated board
    try {
        const passBtn = document.getElementById('passBtn');
        const resignBtn = document.getElementById('resignBtn');
        
        if (passBtn) {
            passBtn.disabled = false;
            passBtn.onclick = () => {
                const gb = window._currentGameBoard;
                if (!gb) return;
                if (gb.canPass()) {
                    document.dispatchEvent(new CustomEvent('playerPassed', { detail: { player: gb.currentPlayer } }));
                    gb.currentPlayer = gb.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
                    gb.render();
                } else {
                    const msg = document.getElementById('gameMessage');
                    if (msg) msg.textContent = 'A move is still possible - you cannot pass.';
                }
            };
        }
        
        if (resignBtn) {
            resignBtn.onclick = () => {
                const gb = window._currentGameBoard;
                if (!gb) return;
                gb.resign();
            };
        }
    } catch (err) { 
        console.warn('Could not wire action buttons', err); 
    }
    
    return window._currentGameBoard;
}

// Setup form handling - REMOVIDO (já existe em setup.js)
// Expose generateBoard and GameBoard to global scope
window.generateBoard = generateBoard;
window.GameBoard = GameBoard;