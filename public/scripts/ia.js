// IA para Tâb
window.IA = {
    WHITE: "W", 
    BLACK: "B",
    
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

    async chooseMoveAI(state, diceValue, difficulty = 'medium') {
        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const moves = this.generateAllMoves(state, diceValue);
        
        if (moves.length === 0) {
            return { type: "PASS" };
        }

        // Dificuldade fácil: movimento aleatório
        if (difficulty === 'easy') {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // Dificuldade média/hard: escolher melhor movimento
        return this.chooseBestMove(state, moves, diceValue, difficulty);
    },

    generateAllMoves(state, diceValue) {
        const moves = [];
        const player = state.toMove;
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < state.cols; c++) {
                const piece = state.board[r][c];
                if (!piece || piece.player !== player) continue;
                
                // Verificar regra do primeiro movimento
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

    calculateTargetPosition(state, fromRow, fromCol, steps) {
      let row = fromRow;
      let col = fromCol;
      let remaining = steps;

      while (remaining > 0) {
          // CORREÇÃO: Mesma lógica de direções do board principal
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

    isValidMove(state, piece, target) {
        const targetPiece = state.board[target.r][target.c];
        
        // Não pode mover para casa com peça da mesma equipe
        if (targetPiece && targetPiece.player === piece.player) {
            return false;
        }

        // Verificar outras regras específicas do Tâb
        const opponentHomeRow = piece.player === this.WHITE ? 3 : 0;
        const ownHomeRow = piece.player === this.WHITE ? 0 : 3;
        
        // Não pode retornar à home row após sair
        if (target.r === ownHomeRow && piece.history.length > 1) {
            return false;
        }

        return true;
    },

    isEnteringOpponentHome(piece, target) {
        const opponentHomeRow = piece.player === this.WHITE ? 3 : 0;
        return target.r === opponentHomeRow && !piece.hasEnteredOpponentHome;
    },

    chooseBestMove(state, moves, diceValue, difficulty) {
        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (const move of moves) {
            let score = 0;
            
            // Captura é boa
            const targetPiece = state.board[move.to.r][move.to.c];
            if (targetPiece && targetPiece.player !== state.toMove) {
                score += 10;
            }
            
            // Avançar é bom
            const player = state.toMove;
            const direction = player === this.WHITE ? 1 : -1;
            const progress = (move.to.r - move.from.r) * direction;
            score += progress * 2;
            
            // Converter peça é bom
            if (move.convert) {
                score += 5;
            }
            
            // Entrar na home do oponente é bom
            if (move.enteringOpponentHome) {
                score += 3;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    },

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