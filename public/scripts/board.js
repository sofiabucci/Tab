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
            firstPlayer: options.firstPlayer || 'player-1'
        };

        // Normalize firstPlayer values (accept 'player1','player-1','player2','player-2')
        const fp = ('' + this.options.firstPlayer).toString();
        const normalizedFirst = (fp === 'player2' || fp === 'player-2') ? 'player-2' : 'player-1';
        this.options.firstPlayer = normalizedFirst;

        // Set starting player code: 'player-1' or 'player-2'
        this.currentPlayer = this.options.firstPlayer === 'player-2' ? 'player-2' : 'player-1';

        const parent = document.getElementById(id);
        // Clear existing board if present
        parent.innerHTML = '';

        const board = document.createElement('div');
        board.className = 'board';
        
        // DEFINE A VARIÁVEL CSS --cols PARA CONTROLE DE TAMANHO
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

            // Add click event (play handler may be attached later)
            cell.addEventListener('click', () => this.play && this.play(i));

            this.boardElements[i] = cell;  
        }

        // Initialize content array with logical objects representing pieces or null
        // We'll use objects like { player: 'player-1' } or null
        this.content.fill(null);

        // Place initial pieces: fill the first row (row 0) for player-2 and last row (row 3) for player-1
        // Use full row population so pieces are visible and countable
        for (let c = 0; c < this.cols; c++) {
            // top row indices 0..cols-1 belong to player-2 by visual convention
            this.content[c] = { player: 'player-2' };
            // bottom row indices 3*cols .. 4*cols-1 belong to player-1
            const idx = 3*this.cols + c;
            this.content[idx] = { player: 'player-1' };
        }

        // Render initial state
        this.render();

        // Listen to stickRoll events from dice.js to drive turns
        document.addEventListener('stickRoll', async (e) => {
            const roll = e.detail; // { value, repeats, ... }
            // If game mode is player vs computer and it's AI's turn, trigger AI move(s)
            if (this.options.mode === 'pvc' && this.currentPlayer === 'player-2') {
                await this.handleAIMove(roll.value, roll.repeats);
            }
        });

    }

    // Render tokens based on this.content
    render() {
        // update message area with a friendly prompt when it's a player's turn
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
            // remove existing token visuals inside cell
            // keep only the square container, remove tokens
            Array.from(cell.querySelectorAll('.board-token')).forEach(t => t.remove());
            const obj = this.content[i];
            if (obj && obj.player) {
                const token = document.createElement('div');
                // ensure token classes match the known palette
                token.className = `board-token ${obj.player === 'player-1' ? 'player-1' : 'player-2'}`;
                token.dataset.index = i;
                // add an accessible label so users know which player owns the piece
                token.setAttribute('aria-label', obj.player);
                cell.appendChild(token);
            }
        }
    }

    // Apply a move given flat indices
    applyMoveIndices(fromIdx, toIdx, keepTurn = false) {
        const piece = this.content[fromIdx];
        if (!piece) return false;
        
        // determine if capture will happen
        const wasCapture = !!(this.content[toIdx] && this.content[toIdx].player && this.content[toIdx].player !== piece.player);

        // replace destination (simple capture/replace semantics)
        this.content[fromIdx] = null;
        this.content[toIdx] = { player: piece.player };
        
        // flip current player unless keepTurn requested
        if (!keepTurn) {
            this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
        }
        this.render();
        // Emit moveEnded so dice resets
        document.dispatchEvent(new CustomEvent('moveEnded'));

        // Notify about capture if applicable
        try {
            const msg = document.getElementById('gameMessage');
            if (msg && wasCapture) {
                msg.textContent = 'Line completed: opponent piece captured!';
            }
        } catch (err) { /* ignore */ }
        return true;
    }

    // Handle a user click on square index 'from'
    play(fromIndex){
        // If no pending roll available, ignore click
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
        // Only allow selecting your pieces
        if (piece.player !== this.currentPlayer) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = "This is not your piece. Wait for your turn.";
            return;
        }

        // For now, calculate a single forward move: add value to index (towards other side)
        const value = last.value;
        // movement direction: player-1 moves up (towards decreasing index) from bottom row to top -> subtract cols
        const dir = piece.player === 'player-1' ? -this.cols : this.cols;
        const target = fromIndex + dir * (value);

        if (target < 0 || target >= this.content.length) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'Invalid move: out of board bounds.';
            return;
        }

        // If destination occupied by own piece, invalid
        const dest = this.content[target];
        if (dest && dest.player === piece.player) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = 'Blocked: your piece is in the destination.';
            return;
        }

        // Apply move
        const success = this.applyMoveIndices(fromIndex, target);
        if (success) {
            const msg = document.getElementById('gameMessage');
            if (msg) msg.textContent = `Move executed: ${fromIndex} → ${target}`;
            console.log('Move applied', { fromIndex, target });
        }
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

    // Determine whether the current player has any legal move for the last roll
    canPass() {
        const last = window.stickDiceLastRoll;
        if (!last) return false; // no roll => cannot determine, don't allow pass
        const value = last.value;
        // scan all pieces of currentPlayer and see if any can legally move 'value' steps
        for (let i = 0; i < this.content.length; i++) {
            const piece = this.content[i];
            if (!piece || piece.player !== this.currentPlayer) continue;
            const dir = piece.player === 'player-1' ? -this.cols : this.cols;
            const target = i + dir * value;
            if (target < 0 || target >= this.content.length) continue;
            const dest = this.content[target];
            if (!dest || dest.player !== piece.player) {
                // found at least one legal destination
                return false; // cannot pass because a move exists
            }
        }
        // no legal moves found — passing is allowed
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

    // Check if game is over (all pieces reached opposite side)
    checkGameOver() {
        let player1Finished = true;
        let player2Finished = true;

        // Check if all player-1 pieces are in top row (indices 0 to cols-1)
        for (let i = 0; i < this.cols; i++) {
            if (!this.content[i] || this.content[i].player !== 'player-1') {
                player1Finished = false;
                break;
            }
        }

        // Check if all player-2 pieces are in bottom row (indices 3*cols to 4*cols-1)
        for (let i = 3 * this.cols; i < 4 * this.cols; i++) {
            if (!this.content[i] || this.content[i].player !== 'player-2') {
                player2Finished = false;
                break;
            }
        }

        if (player1Finished || player2Finished) {
            const winner = player1Finished ? 'Player 1' : 'Player 2';
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
    // wire UI controls (pass/resign) to the generated board
    try {
        const passBtn = document.getElementById('passBtn');
        const resignBtn = document.getElementById('resignBtn');
        if (passBtn) {
            passBtn.disabled = false;
            passBtn.onclick = () => {
                const gb = window._currentGameBoard;
                if (!gb) return;
                if (gb.canPass()) {
                    // allowed only when truly no move exists
                    document.dispatchEvent(new CustomEvent('playerPassed', { detail: { player: gb.currentPlayer } }));
                    // flip turn
                    gb.currentPlayer = gb.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
                    gb.render();
                } else {
                    // show message
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
    } catch (err) { console.warn('Could not wire action buttons', err); }
    return window._currentGameBoard;
}

// Setup form handling
document.addEventListener('DOMContentLoaded', function() {
    const setupForm = document.getElementById('setupForm');
    const setupModal = document.getElementById('setupModal');
    const setupReset = document.getElementById('setupReset');
    const gameModeSelect = document.getElementById('gameMode');
    const difficultyGroup = document.getElementById('difficultyGroup');

    if (gameModeSelect) {
        gameModeSelect.addEventListener('change', () => {
            if (gameModeSelect.value === 'pvc') {
                difficultyGroup.style.display = 'flex';
            } else {
                difficultyGroup.style.display = 'none';
            }
        });
    }

    if (setupForm) {
        setupForm.addEventListener('submit', e => {
            e.preventDefault();

            const mode = gameModeSelect.value;
            const difficulty = document.getElementById('difficulty').value;
            const columns = parseInt(document.getElementById('boardSize').value);
            const firstPlayer = document.getElementById('firstPlayerSelect').value;

            // Normalize and pass options to generateBoard so the board can be configured
            const normalizedFirst = (firstPlayer === 'player2' || firstPlayer === 'player-2') ? 'player-2' : 'player-1';
            const options = {
                mode: mode || 'pvp',
                difficulty: mode === 'pvc' ? (difficulty || 'medium') : undefined,
                // normalize to 'player-1' or 'player-2' used by GameBoard
                firstPlayer: normalizedFirst
            };

            if (typeof generateBoard === 'function') {
                const gb = generateBoard(columns, options);
                
                // If AI starts first in pvc mode, trigger a roll so AI can act
                if (options.mode === 'pvc' && options.firstPlayer === 'player-2') {
                    // trigger an actual dice roll so the AI receives a stickRoll event
                    if (typeof window.rollStickDice === 'function') {
                        window.rollStickDice();
                    } else if (window.stickDiceLastRoll && typeof document !== 'undefined') {
                        document.dispatchEvent(new CustomEvent('stickRoll', { detail: window.stickDiceLastRoll }));
                    }
                }
            } else {
                // Fallback: try creating GameBoard directly if generateBoard isn't available
                if (window.GameBoard) {
                    // remove existing board container content before creating
                    const parent = document.getElementById('board-container');
                    parent.innerHTML = '';
                    new GameBoard('board-container', columns, options);
                }
            }

            if (setupModal) {
                setupModal.classList.add('hidden');
            }

            console.log('Game settings:', { 
                mode, 
                difficulty: mode === 'pvc' ? difficulty : 'N/A', 
                columns, 
                firstPlayer 
            });
        });
    }

    if (setupReset) {
        setupReset.addEventListener('click', () => {
            if (setupForm) setupForm.reset();
        });
    }

    // Initial load with default columns (9)
    generateBoard(9, { firstPlayer: 'player1' });
});

// Expose generateBoard and GameBoard to global scope
window.generateBoard = generateBoard;
window.GameBoard = GameBoard;