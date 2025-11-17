/**
 * @file ia.js
 * @description Advanced Artificial Intelligence system for Tâb game
 * Implements minimax with alpha-beta pruning and advanced heuristics
 */

window.IA = {
    /** @constant {string} */
    WHITE: "player-1",
    
    /** @constant {string} */
    BLACK: "player-2",
    
    // Configurações por dificuldade
    DIFFICULTY_SETTINGS: {
        easy: { depth: 1, enablePruning: false, randomFactor: 0.8 },
        medium: { depth: 2, enablePruning: true, randomFactor: 0.3 },
        hard: { depth: 3, enablePruning: true, randomFactor: 0.1 } // Reduzido para performance
    },

    /**
     * Convert game board state to AI-readable format
     */
    fromGameBoard(content, cols, toMove) {
        const board = Array(4).fill().map(() => Array(cols).fill(null));
        
        for (let i = 0; i < content.length; i++) {
            const cell = content[i];
            if (cell) {
                const r = Math.floor(i / cols);
                const c = i % cols;
                const piece = {
                    player: cell.player,
                    row: r,
                    col: c,
                    state: cell.state,
                    hasConverted: cell.state !== 'unmoved',
                    hasEnteredOpponentHome: cell.state === 'promoted',
                    index: i
                };
                board[r][c] = piece;
            }
        }
        
        return {
            board,
            toMove: toMove,
            cols: cols,
            content: content
        };
    },

    /**
     * Calculate target position using movement rules
     */
    calculateTargetPosition(state, fromRow, fromCol, steps) {
        if (steps === 0) return { r: fromRow, c: fromCol };
        
        let currentRow = fromRow;
        let currentCol = fromCol;
        let remainingSteps = steps;

        while (remainingSteps > 0) {
            let nextRow = currentRow;
            let nextCol = currentCol;
            
            if (currentRow === 0 || currentRow === 2) {
                // Mover para esquerda nas linhas 0 e 2
                nextCol = currentCol - 1;
                if (nextCol < 0) {
                    if (currentRow === 0) {
                        nextRow = 1;
                        nextCol = 0;
                    } else { // row 2
                        // Ponto de decisão - pode ir para linha 1 ou 3
                        if (remainingSteps === 1) {
                            return [
                                { r: 1, c: state.cols - 1 },
                                { r: 3, c: 0 }
                            ];
                        } else {
                            nextRow = 1;
                            nextCol = state.cols - 1;
                        }
                    }
                }
            } else { // row 1 or 3
                // Mover para direita nas linhas 1 e 3
                nextCol = currentCol + 1;
                if (nextCol >= state.cols) {
                    if (currentRow === 1) {
                        nextRow = 2;
                        nextCol = state.cols - 1;
                    } else { // row 3
                        nextRow = 2;
                        nextCol = 0;
                    }
                }
            }

            currentRow = nextRow;
            currentCol = nextCol;
            remainingSteps--;
        }

        return { r: currentRow, c: currentCol };
    },

    /**
     * Generate all possible moves for current state
     */
    generateAllMoves(state, diceValue) {
        const moves = [];
        const player = state.toMove;
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (!piece || piece.player !== player) continue;
                
                // Check first move rule
                if (piece.state === 'unmoved' && diceValue !== 1) {
                    continue;
                }
                
                const target = this.calculateTargetPosition(state, r, c, diceValue);
                
                if (Array.isArray(target)) {
                    target.forEach(singleTarget => {
                        if (this.isValidMove(state, piece, singleTarget)) {
                            moves.push({
                                from: { r, c },
                                to: singleTarget,
                                piece: piece,
                                isPromotion: singleTarget.r === 3
                            });
                        }
                    });
                } else if (target && this.isValidMove(state, piece, target)) {
                    moves.push({
                        from: { r, c },
                        to: target,
                        piece: piece,
                        isPromotion: target.r === (player === this.WHITE ? 3 : 0)
                    });
                }
            }
        }
        
        return moves;
    },

    /**
     * Validate move according to game rules
     */
    isValidMove(state, piece, target) {
        const targetPiece = state.board[target.r][target.c];
        
        if (targetPiece && targetPiece.player === piece.player) {
            return false;
        }

        const fromRow = piece.row;
        const toRow = target.r;
        const opponentHomeRow = piece.player === this.WHITE ? 3 : 0;
        const playerHomeRow = piece.player === this.WHITE ? 0 : 3;

        if (piece.state === 'unmoved') {
            if (toRow === opponentHomeRow) return false;
        }
        
        if (piece.state === 'moved') {
            if (toRow === opponentHomeRow) {
                if (!this.startingRowIsEmpty(state, piece.player)) {
                    return false;
                }
            }
        }
        
        if (piece.state === 'promoted') {
            if (toRow === opponentHomeRow) return false;
            if (toRow === playerHomeRow) return false;
        }

        return true;
    },

    /**
     * Check if starting row is empty
     */
    startingRowIsEmpty(state, player) {
        const startingRow = player === this.WHITE ? 3 : 0;
        for (let c = 0; c < state.cols; c++) {
            const piece = state.board[startingRow][c];
            if (piece && piece.player === player) return false;
        }
        return true;
    },

    /**
     * Main AI move selection with advanced algorithms
     */
    async chooseMoveAI(state, diceValue, difficulty = 'medium') {
        const settings = this.DIFFICULTY_SETTINGS[difficulty] || this.DIFFICULTY_SETTINGS.medium;
        const delay = difficulty === 'easy' ? 400 : difficulty === 'medium' ? 700 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const moves = this.generateAllMoves(state, diceValue);
        
        if (moves.length === 0) {
            return { type: "PASS" };
        }

        if (Math.random() < settings.randomFactor) {
            return this.chooseRandomMove(moves);
        }

        if (difficulty === 'hard') {
            return this.minimaxMove(state, moves, diceValue, settings);
        } else {
            return this.heuristicMove(state, moves, diceValue, difficulty);
        }
    },

    /**
     * Minimax algorithm with alpha-beta pruning
     */
    minimaxMove(state, moves, diceValue, settings) {
        let bestMove = moves[0];
        let bestValue = -Infinity;
        
        for (const move of moves) {
            const newState = this.simulateMove(state, move);
            
            const moveValue = this.minimax(
                newState, 
                settings.depth - 1, 
                -Infinity, 
                Infinity, 
                false, 
                settings.enablePruning
            );
            
            if (moveValue > bestValue) {
                bestValue = moveValue;
                bestMove = move;
            }
        }
        
        return bestMove;
    },

    /**
     * Minimax recursive function with alpha-beta pruning (CORRIGIDO)
     */
    minimax(state, depth, alpha, beta, maximizingPlayer, enablePruning) {
        if (depth === 0 || this.isTerminalState(state)) {
            return this.evaluateState(state);
        }
        
        const allPossibleMoves = [];
        const possibleDice = [1, 2, 3, 4, 6];
        
        for (const dice of possibleDice) {
            const moves = this.generateAllMoves(state, dice);
            allPossibleMoves.push(...moves.map(move => ({ move, dice })));
        }
        
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const { move, dice } of allPossibleMoves) {
                const newState = this.simulateMove(state, move);
                const evaluation = this.minimax(newState, depth - 1, alpha, beta, false, enablePruning); // CORRIGIDO: trocado 'eval' por 'evaluation'
                maxEval = Math.max(maxEval, evaluation);
                
                if (enablePruning) {
                    alpha = Math.max(alpha, evaluation);
                    if (beta <= alpha) break;
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const { move, dice } of allPossibleMoves) {
                const newState = this.simulateMove(state, move);
                const evaluation = this.minimax(newState, depth - 1, alpha, beta, true, enablePruning); // CORRIGIDO: trocado 'eval' por 'evaluation'
                minEval = Math.min(minEval, evaluation);
                
                if (enablePruning) {
                    beta = Math.min(beta, evaluation);
                    if (beta <= alpha) break;
                }
            }
            return minEval;
        }
    },

    /**
     * Heuristic-based move selection for medium difficulty
     */
    heuristicMove(state, moves, diceValue, difficulty) {
        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (const move of moves) {
            const newState = this.simulateMove(state, move);
            let score = this.evaluateStateAdvanced(newState, move, diceValue, difficulty);
            
            score += this.calculatePositionBonus(move, state);
            score -= this.calculateRiskPenalty(move, state);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    },

    /**
     * Advanced state evaluation function
     */
    evaluateStateAdvanced(state, move, diceValue, difficulty) {
        let score = 0;
        const player = state.toMove;
        const opponent = player === this.WHITE ? this.BLACK : this.WHITE;

        // 1. MATERIAL BALANCE (30%)
        const materialScore = this.evaluateMaterial(state, player);
        score += materialScore * 0.3;

        // 2. POSITIONAL ADVANTAGE (25%)
        const positionalScore = this.evaluatePositional(state, player);
        score += positionalScore * 0.25;

        // 3. MOBILITY (20%)
        const mobilityScore = this.evaluateMobility(state, player);
        score += mobilityScore * 0.2;

        // 4. THREATS (15%)
        const threatScore = this.evaluateThreats(state, player, opponent);
        score += threatScore * 0.15;

        // 5. STRATEGIC GOALS (10%)
        const strategicScore = this.evaluateStrategic(state, player);
        score += strategicScore * 0.1;

        // 6. MOVE-SPECIFIC BONUSES
        score += this.evaluateMoveSpecific(move, diceValue, difficulty);

        return score;
    },

    /**
     * Evaluate material advantage
     */
    evaluateMaterial(state, player) {
        let playerPieces = { unmoved: 0, moved: 0, promoted: 0 };
        let opponentPieces = { unmoved: 0, moved: 0, promoted: 0 };
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (piece) {
                    if (piece.player === player) {
                        playerPieces[piece.state]++;
                    } else {
                        opponentPieces[piece.state]++;
                    }
                }
            }
        }

        const pieceValues = { unmoved: 1, moved: 2, promoted: 4 };
        let playerScore = 0;
        let opponentScore = 0;
        
        for (const [type, count] of Object.entries(playerPieces)) {
            playerScore += count * pieceValues[type];
        }
        for (const [type, count] of Object.entries(opponentPieces)) {
            opponentScore += count * pieceValues[type];
        }

        return playerScore - opponentScore;
    },

    /**
     * Evaluate positional advantage
     */
    evaluatePositional(state, player) {
        let score = 0;
        const forwardDirection = player === this.WHITE ? 1 : -1;

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (piece && piece.player === player) {
                    // Progresso em direção ao objetivo
                    const progress = player === this.WHITE ? r : (3 - r);
                    score += progress * 2;

                    // Controlar o centro
                    const centerDistance = Math.abs(c - Math.floor(state.cols / 2));
                    score += (state.cols - centerDistance) * 0.5;

                    // Peças nas laterais são mais seguras
                    if (c === 0 || c === state.cols - 1) {
                        score += 1;
                    }

                    // Posições de ataque
                    const opponentHomeRow = player === this.WHITE ? 3 : 0;
                    const attackDistance = Math.abs(r - opponentHomeRow);
                    if (attackDistance <= 1) {
                        score += 3;
                    }
                }
            }
        }

        return score;
    },

    /**
     * Evaluate mobility (number of possible moves)
     */
    evaluateMobility(state, player) {
        let mobility = 0;
        const possibleDice = [1, 2, 3, 4, 6];
        
        for (const dice of possibleDice) {
            const moves = this.generateAllMoves(state, dice);
            mobility += moves.length;
        }
        
        return mobility;
    },

    /**
     * Evaluate threats and captures
     */
    evaluateThreats(state, player, opponent) {
        let threatScore = 0;
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (piece && piece.player === opponent) {
                    if (this.isPieceThreatened(state, piece, player)) {
                        threatScore += piece.state === 'promoted' ? 8 : 4;
                    }
                }
            }
        }
        
        return threatScore;
    },

    /**
     * Check if a piece is threatened by opponent
     */
    isPieceThreatened(state, piece, opponent) {
        const possibleDice = [1, 2, 3, 4, 6];
        
        for (const dice of possibleDice) {
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < state.cols; c++) {
                    const opponentPiece = state.board[r][c];
                    if (opponentPiece && opponentPiece.player === opponent) {
                        const target = this.calculateTargetPosition(state, r, c, dice);
                        if (target && !Array.isArray(target) && 
                            target.r === piece.row && target.c === piece.col) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    },

    /**
     * Evaluate strategic goals
     */
    evaluateStrategic(state, player) {
        let strategicScore = 0;
        
        const developedPieces = this.countDevelopedPieces(state, player);
        strategicScore += developedPieces * 3;
        
        const promotedPieces = this.countPromotedPieces(state, player);
        strategicScore += promotedPieces * 5;
        
        const opponentHomeControl = this.evaluateHomeControl(state, player);
        strategicScore += opponentHomeControl * 4;
        
        return strategicScore;
    },

    /**
     * Count developed pieces
     */
    countDevelopedPieces(state, player) {
        let count = 0;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (piece && piece.player === player && piece.state !== 'unmoved') {
                    count++;
                }
            }
        }
        return count;
    },

    /**
     * Count promoted pieces
     */
    countPromotedPieces(state, player) {
        let count = 0;
        const opponentHomeRow = player === this.WHITE ? 3 : 0;
        
        for (let c = 0; c < state.cols; c++) {
            const piece = state.board[opponentHomeRow][c];
            if (piece && piece.player === player && piece.state === 'promoted') {
                count++;
            }
        }
        return count;
    },

    /**
     * Evaluate control of opponent's home row
     */
    evaluateHomeControl(state, player) {
        const opponent = player === this.WHITE ? this.BLACK : this.WHITE;
        const opponentHomeRow = player === this.WHITE ? 0 : 3;
        let control = 0;
        
        for (let c = 0; c < state.cols; c++) {
            const piece = state.board[opponentHomeRow][c];
            if (piece && piece.player === player) {
                control++;
            }
        }
        
        return control;
    },

    /**
     * Evaluate move-specific bonuses
     */
    evaluateMoveSpecific(move, diceValue, difficulty) {
        let bonus = 0;
        
        if (move.piece.state === 'unmoved' && diceValue === 1) {
            bonus += 10;
        }
        
        if (move.isPromotion) {
            bonus += 15;
        }
        
        // Verificar se há captura
        if (this.willCapture(move, diceValue)) {
            bonus += 12;
        }
        
        return bonus;
    },

    /**
     * Check if move will capture opponent piece
     */
    willCapture(move, diceValue) {
        // Esta informação precisa ser passada durante a geração do movimento
        // Por enquanto, retornar false - será implementada na simulação
        return false;
    },

    /**
     * Calculate position bonus
     */
    calculatePositionBonus(move, state) {
        let bonus = 0;
        
        const center = Math.floor(state.cols / 2);
        const distanceFromCenter = Math.abs(move.to.c - center);
        bonus += (state.cols - distanceFromCenter) * 0.3;
        
        const progress = move.piece.player === this.WHITE ? 
            (move.to.r - move.from.r) : (move.from.r - move.to.r);
        bonus += progress * 2;
        
        return bonus;
    },

    /**
     * Calculate risk penalty
     */
    calculateRiskPenalty(move, state) {
        let penalty = 0;
        const opponent = move.piece.player === this.WHITE ? this.BLACK : this.WHITE;
        
        if (this.isPositionThreatened(state, move.to, opponent)) {
            penalty += 8;
        }
        
        if (move.piece.state === 'promoted') {
            penalty += 5;
        }
        
        return penalty;
    },

    /**
     * Check if position is threatened
     */
    isPositionThreatened(state, position, opponent) {
        const possibleDice = [1, 2, 3, 4, 6];
        
        for (const dice of possibleDice) {
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < state.cols; c++) {
                    const opponentPiece = state.board[r][c];
                    if (opponentPiece && opponentPiece.player === opponent) {
                        const target = this.calculateTargetPosition(state, r, c, dice);
                        if (target && !Array.isArray(target) && 
                            target.r === position.r && target.c === position.c) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    },

    /**
     * Simulate a move on the board state
     */
    simulateMove(state, move) {
        const newState = {
            board: JSON.parse(JSON.stringify(state.board)),
            toMove: state.toMove === this.WHITE ? this.BLACK : this.WHITE,
            cols: state.cols
        };
        
        const piece = newState.board[move.from.r][move.from.c];
        
        // Verificar se há captura
        const targetPiece = newState.board[move.to.r][move.to.c];
        if (targetPiece && targetPiece.player !== piece.player) {
            move.capturedPiece = targetPiece;
        }
        
        newState.board[move.to.r][move.to.c] = { ...piece, row: move.to.r, col: move.to.c };
        newState.board[move.from.r][move.from.c] = null;
        
        if (move.isPromotion) {
            newState.board[move.to.r][move.to.c].state = 'promoted';
        } else if (piece.state === 'unmoved') {
            newState.board[move.to.r][move.to.c].state = 'moved';
        }
        
        return newState;
    },

    /**
     * Check if state is terminal (game over)
     */
    isTerminalState(state) {
        let whitePieces = 0;
        let blackPieces = 0;
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (piece) {
                    if (piece.player === this.WHITE) whitePieces++;
                    else blackPieces++;
                }
            }
        }
        
        return whitePieces === 0 || blackPieces === 0;
    },

    /**
     * Simple state evaluation for minimax
     */
    evaluateState(state) {
        if (this.isTerminalState(state)) {
            const whitePieces = this.countPieces(state, this.WHITE);
            const blackPieces = this.countPieces(state, this.BLACK);
            
            if (whitePieces === 0) return -1000;
            if (blackPieces === 0) return 1000;
        }
        
        return this.evaluateStateAdvanced(state, null, 0, 'medium');
    },

    /**
     * Count pieces for a player
     */
    countPieces(state, player) {
        let count = 0;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                if (state.board[r][c] && state.board[r][c].player === player) {
                    count++;
                }
            }
        }
        return count;
    },

    /**
     * Choose random move
     */
    chooseRandomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    },

    /**
     * Convert move to board indices
     */
    moveToIndices(move, cols) {
        if (move.type === 'PASS') {
            return { type: 'PASS' };
        }
        
        const fromIndex = move.from.r * cols + move.from.c;
        const toIndex = move.to.r * cols + move.to.c;
        
        return {
            from: fromIndex,
            to: toIndex
        };
    }
};