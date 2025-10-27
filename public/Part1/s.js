class GameBoard {
    constructor(containerId, rows, cols) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error("Game container not found!");
            return;
        }

        this.rows = rows;
        this.cols = cols;
        this.movementMap = this.nextSquareMap();

        // Game state
        this.selectedToken = null;
        this.highlightedSquares = [];
        this.currentPlayer = 'player1'; // --- NEW: Player 1 starts ---

        this.createBoard();
        this.updateTurnIndicator(); // --- NEW: Set initial turn class ---
    }

    /**
     * Creates the grid of squares and initial token positions
     */
    createBoard() {
        this.container.innerHTML = ''; // Clear any existing board
        // --- MODIFIED: Apply grid directly to the container ---
        this.container.style.display = 'grid'; 
        this.container.style.gridTemplateRows = `repeat(${this.rows}, 70px)`;
        this.container.style.gridTemplateColumns = `repeat(${this.cols}, 70px)`;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const square = document.createElement('div');
                square.className = 'square';
                
                const index = r * this.cols + c;
                square.dataset.index = index;
                square.id = `square-${index}`;

                square.addEventListener('click', () => this.onSquareClick(square));

                let player = null;
                if (r === 0) {
                    player = 'player2';
                } else if (r === 3) {
                    player = 'player1';
                }

                if (player) {
                    const token = document.createElement('div');
                    token.className = `token ${player}`;
                    token.dataset.player = player;
                    token.addEventListener('click', (e) => this.onTokenClick(e, token));
                    square.appendChild(token);
                }
                
                // --- MODIFIED: Append square directly to container ---
                this.container.appendChild(square);
            }
        }
    }

    /**
     * Handles clicking on a token.
     */
    onTokenClick(event, token) {
        event.stopPropagation(); // Prevents the square's click event from firing

        // --- NEW: Check if it's the player's turn ---
        if (token.dataset.player !== this.currentPlayer) {
            console.log("It's not your turn!");
            return;
        }
        // --- END NEW ---

        // If clicking the same token, deselect it
        if (this.selectedToken === token) {
            this.clearSelection();
            return;
        }

        // Clear any previous selection
        this.clearSelection();

        // Select the new token
        this.selectedToken = token;
        token.classList.add('selected'); // "Grows slightly"

        // Find and highlight possible moves
        const currentSquare = token.parentElement;
        const startIndex = parseInt(currentSquare.dataset.index);
        const targetIndexes = this.findTargetSquares(startIndex, 4);

        this.highlightSquares(targetIndexes, token.dataset.player);
    }

    /**
     * Handles clicking on a square.
     */
    onSquareClick(square) {
        // Do nothing if a non-highlighted square is clicked
        if (!square.classList.contains('highlight')) {
            if (this.selectedToken) {
                this.clearSelection();
            }
            return;
        }

        // If we are here, a valid, highlighted square was clicked
        if (this.selectedToken) {
            // Move the token
            square.innerHTML = '';
            square.appendChild(this.selectedToken);

            // Clean up the game state
            this.clearSelection();
            
            // --- NEW: Switch to the next player's turn ---
            this.switchTurn();
            // --- END NEW ---
        }
    }

    // --- NEW: Helper function to switch turns ---
    switchTurn() {
        this.currentPlayer = (this.currentPlayer === 'player1') ? 'player2' : 'player1';
        this.updateTurnIndicator();
    }

    // --- NEW: Helper function to update UI for current turn ---
    updateTurnIndicator() {
        // Remove previous turn classes
        this.container.classList.remove('player1-turn', 'player2-turn');
        
        // Add the new turn class
        const turnClass = (this.currentPlayer === 'player1') ? 'player1-turn' : 'player2-turn';
        this.container.classList.add(turnClass);
        
        console.log(`It is now ${this.currentPlayer}'s turn.`);
    }

    /**
     * Finds all squares exactly 'moves' steps away from a starting index.
     */
    findTargetSquares(startIndex, moves) {
        let results = new Array(); 
        findRecursive(startIndex, moves, results);

        return results; 
    }
    findRecursive (currentIndex, stepsLeft, results){
        if (stepsLeft === 0) {
            results.push(currentIndex);
            return;
        }

        const nextMoves = this.movementMap.get(currentIndex);
        if (nextMoves) {
            for (const nextIndex of nextMoves) {
                findRecursive(nextIndex, stepsLeft - 1);
            }
        }
    }

    /**
     * Highlights valid target squares.
     */
    highlightSquares(targetIndexes, friendlyPlayer) {
        targetIndexes.forEach(index => {
            const square = document.getElementById(`square-${index}`);
            if (!square) return; 

            const token = square.querySelector('.token');
            if (token && token.dataset.player === friendlyPlayer) {
                return;
            }

            square.classList.add('highlight');
            this.highlightedSquares.push(square);
        });
    }

    /**
     * Resets the game state by clearing any selected token and highlights.
     */
    clearSelection() {
        if (this.selectedToken) {
            this.selectedToken.classList.remove('selected');
        }
        this.selectedToken = null;

        this.highlightedSquares.forEach(sq => sq.classList.remove('highlight'));
        this.highlightedSquares = [];
    }

    /**
     * Defines the movement path logic as provided.
     */
    nextSquareMap() {
        let flow = new Map();
        let cols = this.cols; 
        
        flow.set(0, [cols]);
        flow.set(4*cols-1, [3*cols-1]);
        flow.set(2*cols-1, [3*cols-1, cols-1]);
        flow.set(2*cols, [3*cols, cols]);

        for (let i = 1; i < cols*4; i++) {
            if((0 < i && i < cols) || (2*cols < i && i < 3*cols)){
                flow.set(i, [i-1]);
            }else if((cols <= i && i < 2*cols-1) || (3*cols <= i && i < 4*cols-1)){
                flow.set(i, [i+1]);
            }
        }
        return flow;
    }
}

// Wait for the page to load, then initialize the game
window.addEventListener('DOMContentLoaded', () => {
    new GameBoard('game-container', 4, 9);
});