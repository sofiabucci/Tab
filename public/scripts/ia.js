/**
 * @file ia.js
 * @description Artificial Intelligence system for Tâb game
 * Provides AI opponent with configurable difficulty levels
 */

/**
 * AI system for Tâb game
 * @namespace
 */
window.IA = {
    /** @constant {string} */
    WHITE: "W",
    
    /** @constant {string} */
    BLACK: "B",
    
    /**
     * Convert game board state to AI-readable format
     * @param {Array} content - Board content array
     * @param {number} cols - Number of columns
     * @param {string} toMove - Current player
     * @returns {Object} - AI game state
     */
    fromGameBoard(content, cols, toMove) {
        const board = Array(4).fill().map(() => Array(cols).fill(null));
        
        for (let i = 0; i < content.length; i++) {
            const cell = content[i];
            if (cell) {
                const r = Math.floor(i / cols);
                const c = i % cols;
                const piece = {
                    player: cell.player === 'player-1' ? this.WHITE : this.BLACK,
                    row: r,
                    col: c,
                    hasConverted: cell.hasConverted || false,
                    hasEnteredOpponentHome: cell.hasEnteredOpponentHome || false,
                    history: cell.history ? [...cell.history] : [r]
                };
                board[r][c] = piece;
            }
        }
        
        return {
            board,
            toMove: toMove === 'player-1' ? this.WHITE : this.BLACK,
            cols: cols
        };
    },

    /**
     * Choose AI move based on difficulty
     * @param {Object} state - Game state
     * @param {number} diceValue - Dice roll value
     * @param {string} difficulty - AI difficulty level
     * @returns {Promise<Object>} - Selected move
     */
    async chooseMoveAI(state, diceValue, difficulty = 'medium') {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const moves = this.generateAllMoves(state, diceValue);
        
        if (moves.length === 0) {
            return { type: "PASS" };
        }

        // Difficulty-based move selection
        switch (difficulty) {
            case 'easy':
                return this.chooseRandomMove(moves);
            case 'medium':
            case 'hard':
                return this.chooseBestMove(state, moves, diceValue, difficulty);
            default:
                return this.chooseRandomMove(moves);
        }
    },

    /**
     * Generate all possible moves for current state
     * @param {Object} state - Game state
     * @param {number} diceValue - Dice roll value
     * @returns {Array} - Array of possible moves
     */
    generateAllMoves(state, diceValue) {
        const moves = [];
        const player = state.toMove;
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (!piece || piece.player !== player) continue;
                
                // Check first move rule
                if (!piece.hasConverted && diceValue !== 1) continue;
                
                const target = this.calculateTargetPosition(state, r, c, diceValue);
                if (target && this.isValidMove(state, piece, target)) {
                    moves.push({
                        from: { r, c },
                        to: target,
                        convert: !piece.hasConverted && diceValue === 1,
                        enteringOpponentHome: this.isEnteringOpponentHome(piece, target)
                    });
                }
            }
        }
        
        return moves;
    },

    /**
     * Calculate target position for a move
     * @param {Object} state - Game state
     * @param {number} fromRow - Starting row
     * @param {number} fromCol - Starting column
     * @param {number} steps - Number of steps to move
     * @returns {Object|null} - Target position or null if invalid
     */
    calculateTargetPosition(state, fromRow, fromCol, steps) {
        let row = fromRow;
        let col = fromCol;
        let remaining = steps;

        while (remaining > 0) {
            const direction = (row === 0 || row === 2) ? -1 : 1;
            col += direction;

            if (col < 0) {
                if (row === 0) { row = 1; col = 0; }
                else if (row === 2) { row = 3; col = state.cols - 1; }
                else return null;
            } else if (col >= state.cols) {
                if (row === 1) { row = 0; col = state.cols - 1; }
                else if (row === 3) { row = 2; col = 0; }
                else return null;
            }

            remaining--;
        }

        return { r: row, c: col };
    },

    /**
     * Validate if move is legal
     * @param {Object} state - Game state
     * @param {Object} piece - Moving piece
     * @param {Object} target - Target position
     * @returns {boolean} - True if move is valid
     */
    isValidMove(state, piece, target) {
        const targetPiece = state.board[target.r][target.c];
        
        // Cannot move to square with same team piece
        if (targetPiece && targetPiece.player === piece.player) {
            return false;
        }

        // Check Tâb specific rules
        const opponentHomeRow = piece.player === this.WHITE ? 3 : 0;
        const ownHomeRow = piece.player === this.WHITE ? 0 : 3;
        
        // Cannot return to home row after leaving
        if (target.r === ownHomeRow && piece.history.length > 1) {
            return false;
        }

        return true;
    },

    /**
     * Check if piece is entering opponent's home
     * @param {Object} piece - Moving piece
     * @param {Object} target - Target position
     * @returns {boolean} - True if entering opponent home
     */
    isEnteringOpponentHome(piece, target) {
        const opponentHomeRow = piece.player === this.WHITE ? 3 : 0;
        return target.r === opponentHomeRow && !piece.hasEnteredOpponentHome;
    },

    /**
     * Choose random move (easy difficulty)
     * @param {Array} moves - Array of possible moves
     * @returns {Object} - Random move
     */
    chooseRandomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    },

    /**
     * Choose best move based on scoring (medium/hard difficulty)
     * @param {Object} state - Game state
     * @param {Array} moves - Array of possible moves
     * @param {number} diceValue - Dice roll value
     * @param {string} difficulty - AI difficulty level
     * @returns {Object} - Best move
     */
    chooseBestMove(state, moves, diceValue, difficulty) {
        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (const move of moves) {
            let score = this.evaluateMove(state, move, difficulty);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    },

    /**
     * Evaluate move score based on strategic factors
     * @param {Object} state - Game state
     * @param {Object} move - Move to evaluate
     * @param {string} difficulty - AI difficulty level
     * @returns {number} - Move score
     */
    evaluateMove(state, move, difficulty) {
        let score = 0;
        const targetPiece = state.board[move.to.r][move.to.c];
        
        // Capture is good
        if (targetPiece && targetPiece.player !== state.toMove) {
            score += 10;
        }
        
        // Progress forward is good
        const player = state.toMove;
        const direction = player === this.WHITE ? 1 : -1;
        const progress = (move.to.r - move.from.r) * direction;
        score += progress * 2;
        
        // Converting piece is good
        if (move.convert) {
            score += 5;
        }
        
        // Entering opponent home is good
        if (move.enteringOpponentHome) {
            score += 3;
        }

        // Additional strategic considerations for hard difficulty
        if (difficulty === 'hard') {
            score += this.evaluateStrategicPosition(move, state);
        }

        return score;
    },

    /**
     * Evaluate strategic position (hard difficulty only)
     * @param {Object} move - Move to evaluate
     * @param {Object} state - Game state
     * @returns {number} - Strategic score
     */
    evaluateStrategicPosition(move, state) {
        let strategicScore = 0;
        
        // Prefer central positions
        const center = Math.floor(state.cols / 2);
        const distanceFromCenter = Math.abs(move.to.c - center);
        strategicScore += (state.cols - distanceFromCenter) * 0.5;
        
        return strategicScore;
    },

    /**
     * Convert move to board indices
     * @param {Object} move - AI move object
     * @param {number} cols - Number of columns
     * @returns {Object} - Move with board indices
     */
    moveToIndices(move, cols) {
        if (move.type === 'PASS') {
            return { type: 'PASS' };
        }
        
        return {
            from: move.from.r * cols + move.from.c,
            to: move.to.r * cols + move.to.c,
            convert: move.convert,
            enteringOpponentHome: move.enteringOpponentHome
        };
    }
};