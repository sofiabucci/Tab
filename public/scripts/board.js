
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
            mode: options.mode || 'pvp', // 'pvp' | 'pvc' | 'pvpo'
            difficulty: options.difficulty || 'medium',
            // Accept 'player1'|'player2' or 'player-1'|'player-2'
            firstPlayer: (function(fp){
                if (!fp) return 'player-1';
                if (fp === 'player1' || fp === 'player-1') return 'player-1';
                if (fp === 'player2' || fp === 'player-2') return 'player-2';
                return 'player-1';
    })(options.firstPlayer)
    };

        // Set starting player code: 'player-1' or 'player-2'
        this.currentPlayer = this.options.firstPlayer === 'player-2' ? 'player-2' : 'player-1';

        const parent = document.getElementById(id);
        // Clear existing board if present
        parent.innerHTML = '';

        const board = document.createElement('div');
        board.className = 'board';
        parent.appendChild(board);

        board.style.gridTemplateRows = `repeat(4, auto)`;
        board.style.gridTemplateColumns = `repeat(${this.cols}, auto)`;

        // Create cells
        for(let i = 0; i < this.cols*4; i++) {
            let cell = document.createElement('div');
            cell.className = 'board-square';
            cell.dataset.index = i;
            board.appendChild(cell);

            // Initial tokens for starting rows (visual only)
            if(i < this.cols || i > 3*this.cols - 1){
                let token = document.createElement('div');
                let token_class = (i < this.cols ? 'board-token player-2' : 'board-token player-1');
                token.className = token_class;
                token.dataset.index = i;
                cell.appendChild(token);
            }

            // Add click event: restrict by mode and current player
            cell.addEventListener('click', () => {
                // PvP: only allow current player to move their own pieces
                if (this.options.mode === 'pvp') {
                    const piece = this.content[i];
                    if (!piece || piece.player !== this.currentPlayer) return;
                }
                // PvOnline: only allow moves if local player matches currentPlayer (placeholder, needs network wiring)
                if (this.options.mode === 'pvpo') {
                    if (typeof window.localPlayer !== 'undefined' && window.localPlayer !== this.currentPlayer) return;
                }
                if (this.play) this.play(i);
            });

            this.boardElements[i] = cell;  
        }

        // Initialize content array with logical objects representing pieces or null
        // We'll use objects like { player: 'player-1' } or null
        this.content.fill(null);

        // Place 15 pieces per player, filling left-to-right then top-to-bottom if columns < 15
        let placedP2 = 0;
        let placedP1 = 0;
        for (let c = 0; c < this.cols && placedP2 < 15; c++) {
            this.content[c] = { player: 'player-2' };
            placedP2++;
        }
        for (let c = 0; c < this.cols && placedP1 < 15; c++) {
            const idx = 3*this.cols + c;
            this.content[idx] = { player: 'player-1' };
            placedP1++;
        }
        // If columns < 15, continue filling next available cells in row 0 and row 3
        let extraP2 = 15 - placedP2;
        let extraP1 = 15 - placedP1;
        let col = 0;
        while (extraP2 > 0) {
            // wrap to next available cell in row 0
            if (!this.content[col]) {
                this.content[col] = { player: 'player-2' };
                extraP2--;
            }
            col = (col + 1) % this.cols;
        }
        col = 0;
        while (extraP1 > 0) {
            const idx = 3*this.cols + col;
            if (!this.content[idx]) {
                this.content[idx] = { player: 'player-1' };
                extraP1--;
            }
            col = (col + 1) % this.cols;
        }

        // Render initial state
        this.render();

        // Listen to stickRoll events from dice.js to drive turns
            document.addEventListener('stickRoll', async (e) => {
                const roll = e.detail; // { value, repeats, ... }
                // PvAI: AI acts on player-2 turn
                if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
                    await this.handleAIMove(roll.value, roll.repeats);
                }
                // PvOnline: placeholder for networked dice roll handling
                if (this.options.mode === 'pvpo') {
                    // TODO: send dice roll to server or process remote roll
                }
            });

    }

    // Render tokens based on this.content
    render() {
        for (let i = 0; i < this.boardElements.length; i++) {
            const cell = this.boardElements[i];
            // remove existing token visuals inside cell
            // keep only the square container, remove tokens
            Array.from(cell.querySelectorAll('.board-token')).forEach(t => t.remove());
            const obj = this.content[i];
            if (obj && obj.player) {
                const token = document.createElement('div');
                token.className = `board-token ${obj.player === 'player-1' ? 'player-1' : 'player-2'}`;
                token.dataset.index = i;
                cell.appendChild(token);
            }
        }
    }

    // Apply a move given flat indices
    applyMoveIndices(fromIdx, toIdx) {
        const piece = this.content[fromIdx];
        if (!piece) return false;
        // capture logic: replace destination
        this.content[fromIdx] = null;
        this.content[toIdx] = { player: piece.player };
        // flip current player
        this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
        this.render();
        // Emit moveEnded so dice resets
        document.dispatchEvent(new CustomEvent('moveEnded'));
        return true;
    }

    async handleAIMove(stickValue, repeats) {
        // Build IA state from current content
        if (!window.IA) return;
        const state = window.IA.fromGameBoard(this.content, this.cols, this.currentPlayer);
        // difficulty mapping: setup uses 'easy'|'medium'|'hard'
        const choice = await window.IA.chooseMoveAI(state, this.options.difficulty);
        if (!choice || choice.type === 'PASS') {
            // End AI's turn
            this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
            document.dispatchEvent(new CustomEvent('moveEnded'));
            return;
        }
        const indices = window.IA.moveToIndices(choice, this.cols);
        if (indices.type === 'PASS') {
            this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
            document.dispatchEvent(new CustomEvent('moveEnded'));
            return;
        }

        // Apply the move visually
        this.applyMoveIndices(indices.from, indices.to);
        // If roll allows repeats and repeats is true, AI might play again; dice.js will dispatch another stickRoll when user presses roll
    }

}

// Expose a helper to generate the board with options
function generateBoard(columns, options = {}) {
    // Ensure columns is a number and fallback to 9
    const cols = parseInt(columns) || 9;
    // Create a GameBoard instance and store it globally if needed
    window._currentGameBoard = new GameBoard('board-container', cols, options);
    return window._currentGameBoard;
}

// Initial load with default columns (9)
window.onload = function() {
    generateBoard(9, { firstPlayer: 'player1', mode: 'pvp', difficulty: null, algorithm: null });
}

// Expose generateBoard and GameBoard to global scope
window.generateBoard = generateBoard;
window.GameBoard = GameBoard;