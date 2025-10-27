// Game board class simplificada
class GameBoard {
    constructor(id, cols) {
        this.cols = parseInt(cols) || 9;
        this.content = Array(this.cols * 4).fill(null);
        
        // Opções do setup
        this.options = {
            mode: (arguments[2]?.mode) || 'pvp',
            difficulty: (arguments[2]?.difficulty) || 'medium',
            firstPlayer: (arguments[2]?.firstPlayer) || 'player-1'
        };

        this.currentPlayer = this.options.firstPlayer;
        this.gameActive = true;
        
        this.initBoard(id);
        this.setupPieces();
        this.render();
        
        // IA começa automaticamente se for primeiro
        if (this.isAITurn()) {
            setTimeout(() => this.triggerAIRoll(), 1000);
        }
    }

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

    // CORREÇÃO: Direções corrigidas conforme especificado
    getMovementDirection(row) {
    // CORREÇÃO: Direções conforme especificado
    // Linha 0: ← (esquerda)
    // Linha 1: → (direita) 
    // Linha 2: ← (esquerda)
    // Linha 3: → (direita)
        return (row === 0 || row === 2) ? -1 : 1;   
    }

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

            // CORREÇÃO: Conectar as linhas do meio (1 <-> 2) quando ultrapassar as bordas.
            if (nextCol < 0 || nextCol >= this.cols) {
                // Mapear pares de linhas para permitir conexão entre as linhas do meio:
                //  row 0 -> 1
                //  row 1 -> 2
                //  row 2 -> 1
                //  row 3 -> 2
                const pairedRow = (currentRow === 0) ? 1 : (currentRow === 1) ? 2 : (currentRow === 2) ? 1 : 2;
                nextRow = pairedRow;
                // Ao saltar de linha, pousamos na borda externa correspondente à direção
                nextCol = direction > 0 ? this.cols - 1 : 0;
            }

            // Verificar limites de segurança
            if (nextRow < 0 || nextRow >= 4 || nextCol < 0 || nextCol >= this.cols) {
                return null;
            }

            currentRow = nextRow;
            currentCol = nextCol;
            remainingSteps--;
        }

        return currentRow * this.cols + currentCol;
    }

    handleClick(i) {
        if (!this.gameActive || !window.lastRoll) {
            this.showMessage('Roll dice first!');
            return;
        }
        
        const piece = this.content[i];
        if (!piece || piece.player !== this.currentPlayer) {
            this.showMessage('Select your piece');
            return;
        }

        // Verificar primeiro movimento (só com Tâb)
        if (!piece.hasConverted && window.lastRoll.value !== 1) {
            this.showMessage('First move must be with Tâb (1)');
            return;
        }

        const target = this.calculateMove(i, window.lastRoll.value);
        if (!target) {
            this.showMessage('Invalid move');
            return;
        }

        // Verificar se destino tem peça do mesmo jogador
        if (this.content[target] && this.content[target].player === piece.player) {
            this.showMessage('Blocked - your piece in destination');
            return;
        }

        this.movePiece(i, target);
    }

    movePiece(from, to) {
        const piece = this.content[from];
        
        // Captura
        if (this.content[to] && this.content[to].player !== piece.player) {
            this.showMessage('Piece captured!');
        }

        // Marcar conversão no primeiro movimento
        if (!piece.hasConverted && window.lastRoll.value === 1) {
            piece.hasConverted = true;
        }

        this.content[to] = piece;
        this.content[from] = null;

        // Mudar turno se não for repeat
        if (!window.lastRoll.repeats) {
            this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
            if (this.isAITurn()) setTimeout(() => this.triggerAIRoll(), 800);
        }

        this.render();
        this.checkGameEnd();
    }

    triggerAIRoll() {
        if (window.rollStickDice) {
            window.rollStickDice();
        }
    }

    async makeAIMove() {
        if (!window.IA || !this.gameActive) return;
        
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
            }
        } catch (error) {
            console.error('AI error:', error);
            this.currentPlayer = 'player-1';
            this.render();
        }
    }

    passTurn() {
        if (!this.gameActive) return;
        
        if (!window.lastRoll) {
            this.showMessage('Roll dice first!');
            return;
        }

        if (window.lastRoll.repeats) {
            this.showMessage('Cannot pass - you have another roll!');
            return;
        }

        this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
        this.render();
        
        if (this.isAITurn()) {
            setTimeout(() => this.triggerAIRoll(), 800);
        }
    }

    resign() {
        if (!this.gameActive) return;
        
        const winner = this.currentPlayer === 'player-1' ? 'Player 2' : 'Player 1';
        this.gameActive = false;
        this.showVictoryModal(winner, true);
    }

    showVictoryModal(winner, isResign = false) {
        const modal = document.getElementById('victoryModal');
        const message = document.getElementById('victoryMessage');
        const reason = document.getElementById('victoryReason');
        
        if (modal && message && reason) {
            message.innerHTML = `<strong>${winner} wins!</strong>`;
            reason.textContent = isResign ? 'Player resigned' : 'All pieces captured';
            modal.classList.remove('hidden');
            
            // Configurar botões
            document.getElementById('newGameFromVictory').onclick = () => {
                modal.classList.add('hidden');
                this.showSetupModal();
            };
            
            document.getElementById('closeVictoryModal').onclick = () => {
                modal.classList.add('hidden');
            };
        }
    }

    showSetupModal() {
        const setupModal = document.getElementById('setupModal');
        if (setupModal) {
            setupModal.classList.remove('hidden');
        }
    }

    checkGameEnd() {
        if (!this.gameActive) return;
        
        const p1Pieces = this.content.filter(p => p && p.player === 'player-1').length;
        const p2Pieces = this.content.filter(p => p && p.player === 'player-2').length;
        
        if (p1Pieces === 0 || p2Pieces === 0) {
            const winner = p1Pieces === 0 ? 'Player 2' : 'Player 1';
            this.gameActive = false;
            this.showVictoryModal(winner, false);
        }
    }

    render() {
        document.querySelectorAll('.board-square').forEach((cell, i) => {
            cell.innerHTML = '';
            if (this.content[i]) {
                const token = document.createElement('div');
                token.className = `board-token ${this.content[i].player}`;
                
                // Diferentes opacidades baseadas no estado
                if (!this.content[i].hasConverted) {
                    token.style.opacity = '1.0';
                } else {
                    token.style.opacity = '0.7';
                }
                
                cell.appendChild(token);
            }
        });
        
        // Atualizar mensagem de turno
        let turnMsg;
        if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
            turnMsg = "AI's turn";
        } else {
            turnMsg = `Player ${this.currentPlayer === 'player-1' ? '1' : '2'}'s turn`;
        }
        this.showMessage(turnMsg);
    }

    showMessage(text) {
        const msgEl = document.getElementById('gameMessage');
        if (msgEl) msgEl.textContent = text;
    }

    isAITurn() {
        return this.options.mode === 'pvc' && this.currentPlayer === 'player-2';
    }

    // Compatibilidade com sistema de dados
    handleStickRoll(roll) {
        window.lastRoll = roll;
        
        const names = {1:'Tâb', 2:'Itneyn', 3:'Teláteh', 4:'Arba\'ah', 6:'Sitteh'};
        const msg = `Roll: ${roll.value} (${names[roll.value]}) - ${roll.repeats ? 'Roll again!' : 'Next player'}`;
        this.showMessage(msg);
        
        if (this.isAITurn()) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }
}

// Inicialização e configuração dos botões
function generateBoard(columns = 9, options = {}) {
    window.game = new GameBoard('board-container', columns, options);
    setupActionButtons();
    return window.game;
}

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

// Configurar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setupActionButtons();
});

// Expor funções globais
window.generateBoard = generateBoard;
window.GameBoard = GameBoard;

// Listener para eventos de dados
document.addEventListener('stickRoll', (e) => {
    if (window.game) {
        window.game.handleStickRoll(e.detail);
    }
});