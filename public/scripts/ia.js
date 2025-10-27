const WHITE = "W";
const BLACK = "B";
const ROWS = 4;

// Classe Piece simplificada
class Piece {
    constructor(player, row, col) {
        this.player = player;
        this.row = row;
        this.col = col;
        this.hasMoved = false;
        this.inFinalRow = false;
    }

    clone() {
        const p = new Piece(this.player, this.row, this.col);
        p.hasMoved = this.hasMoved;
        p.inFinalRow = this.inFinalRow;
        return p;
    }
}

// Estado do jogo
class State {
    constructor(board, toMove) {
        this.board = board;
        this.toMove = toMove;
    }

    clone() {
        const clonedBoard = this.board.map(row => 
            row.map(cell => cell ? cell.clone() : null)
        );
        return new State(clonedBoard, this.toMove);
    }

    isTerminal() {
        let whiteCount = 0, blackCount = 0;
        for (let row of this.board) {
            for (let cell of row) {
                if (cell) {
                    if (cell.player === WHITE) whiteCount++;
                    else blackCount++;
                }
            }
        }
        return whiteCount === 0 || blackCount === 0;
    }

    // Função de avaliação para Minimax
    evaluate() {
        // Verificar vitória/derrota
        let whiteCount = 0, blackCount = 0;
        for (let row of this.board) {
            for (let cell of row) {
                if (cell) {
                    if (cell.player === WHITE) whiteCount++;
                    else blackCount++;
                }
            }
        }

        if (whiteCount === 0) return -1000;
        if (blackCount === 0) return 1000;

        // Avaliação heurística
        let score = 0;
        const cols = this.board[0].length;

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < cols; c++) {
                const piece = this.board[r][c];
                if (!piece) continue;

                const value = piece.player === WHITE ? 1 : -1;
                
                // Peças na linha final valem mais
                if (piece.inFinalRow) {
                    score += value * 3;
                }
                // Peças que já se moveram
                else if (piece.hasMoved) {
                    score += value * 2;
                }
                // Peças básicas
                else {
                    score += value;
                }

                // Bonus por posição central nas linhas 1 e 2
                if (r === 1 || r === 2) {
                    const centerDist = Math.abs(c - Math.floor(cols / 2));
                    score += value * (1 - centerDist / cols);
                }
            }
        }

        return score;
    }
}

// Funções auxiliares
function getOpponent(player) {
    return player === WHITE ? BLACK : WHITE;
}

function inBounds(row, col, cols) {
    return row >= 0 && row < ROWS && col >= 0 && col < cols;
}

// CORREÇÃO: Movimento seguindo as regras do Tâb
function getMovementDirection(row) {
    return (row === 0 || row === 2) ? 1 : -1;
}

function piecesInHomeRow(state, player) {
  const row = player === WHITE ? 0 : ROWS - 1;
  return state.board[row].filter(p => p && p.player === player).length;
}

// ---------------------------------
// 🧠 Movimento das peças
// ---------------------------------

// Converte row/col -> linear index (row-major)
function rowColToIndex(row, col, cols) {
  return row * cols + col;
}
function indexToRowCol(index, cols) {
  return { row: Math.floor(index / cols), col: index % cols };
}

// Cria caminho zig-zag (serpenteante) de length ROWS*cols,
// devolve array de linear indices (ex: [0,1,2,...,cols-1, 2*cols-1, 2*cols-2,...])
function buildZigZagPath(cols) {
  const path = [];
  for (let r = 0; r < ROWS; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < cols; c++) path.push(rowColToIndex(r, c, cols));
    } else {
      for (let c = cols - 1; c >= 0; c--) path.push(rowColToIndex(r, c, cols));
    }
  }
  return path;
}

// Dado um estado e a posição (r,c) de uma peça, retorna o índice no path (procura linearmente)
function findPathIndexForPos(state, row, col) {
  const cols = state.board[0].length;
  if (!state._zigzagPath || state._zigzagCols !== cols) {
    // cache no state para não reconstruir sempre
    state._zigzagPath = buildZigZagPath(cols);
    state._zigzagCols = cols;
  }
  const linear = rowColToIndex(row, col, cols);
  return state._zigzagPath.indexOf(linear);
}

function generateMovesForThrow(state, throwVal, player) {
  const moves = [];
  const cols = state.board[0].length;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < cols; c++) {
            const piece = state.board[r][c];
            if (!piece || piece.player !== player) continue;

            // Regra: primeiro movimento só com valor 1
            if (!piece.hasMoved && stickValue !== 1) continue;

            // Calcular destino
            const target = calculateNextPosition(r, c, stickValue, cols);
            if (!target) continue;

            // Verificar se destino tem peça do mesmo jogador
            const destPiece = state.board[target.row][target.col];
            if (destPiece && destPiece.player === player) continue;

            // Verificar restrição da linha final
            const finalRow = player === WHITE ? 3 : 0;
            if (piece.inFinalRow && target.row === finalRow) {
                // Verificar se ainda há peças na linha inicial
                let hasPiecesInHome = false;
                const homeRow = player === WHITE ? 0 : 3;
                for (let homeCol = 0; homeCol < cols; homeCol++) {
                    const homePiece = state.board[homeRow][homeCol];
                    if (homePiece && homePiece.player === player && !homePiece.inFinalRow) {
                        hasPiecesInHome = true;
                        break;
                    }
                }
                if (hasPiecesInHome) continue;
            }

            // Verificar retorno à linha inicial
            const homeRow = player === WHITE ? 0 : 3;
            if (target.row === homeRow && piece.hasMoved) continue;

            moves.push({
                from: { r, c },
                to: target,
                piece: piece,
                stickValue: stickValue
            });
        }
    }

    return moves;
}

// Algoritmo Minimax
function minimax(state, depth, maximizingPlayer, alpha = -Infinity, beta = Infinity) {
    // Caso base: estado terminal ou profundidade máxima
    if (depth === 0 || state.isTerminal()) {
        return { value: state.evaluate(), move: null };
    }

    const currentPlayer = maximizingPlayer ? WHITE : BLACK;
    const possibleValues = [1, 2, 3, 4, 6]; // Valores possíveis do dado

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        let bestMove = null;

        // Para Minimax, assumimos o pior caso dos dados (adversário escolhe o pior valor)
        // Ou podemos considerar a média dos valores
        for (const stickValue of possibleValues) {
            const moves = generateMovesForValue(state, stickValue, currentPlayer);
            
            if (moves.length === 0) {
                // Sem movimentos possíveis para este valor do dado
                const evalScore = minimax(
                    new State(state.board, getOpponent(currentPlayer)),
                    depth - 1,
                    false,
                    alpha,
                    beta
                ).value;
                
                if (evalScore > maxEval) {
                    maxEval = evalScore;
                    bestMove = { type: "PASS", stickValue };
                }
            } else {
                for (const move of moves) {
                    const newState = applyMoveToState(state, move);
                    const evalResult = minimax(
                        newState,
                        depth - 1,
                        false,
                        alpha,
                        beta
                    );
                    
                    if (evalResult.value > maxEval) {
                        maxEval = evalResult.value;
                        bestMove = move;
                    }
                    
                    alpha = Math.max(alpha, evalResult.value);
                    if (beta <= alpha) break;
                }
            }
            
            if (beta <= alpha) break;
        }

        return { value: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        let bestMove = null;

        for (const stickValue of possibleValues) {
            const moves = generateMovesForValue(state, stickValue, currentPlayer);
            
            if (moves.length === 0) {
                const evalScore = minimax(
                    new State(state.board, getOpponent(currentPlayer)),
                    depth - 1,
                    true,
                    alpha,
                    beta
                ).value;
                
                if (evalScore < minEval) {
                    minEval = evalScore;
                    bestMove = { type: "PASS", stickValue };
                }
            } else {
                for (const move of moves) {
                    const newState = applyMoveToState(state, move);
                    const evalResult = minimax(
                        newState,
                        depth - 1,
                        true,
                        alpha,
                        beta
                    );
                    
                    if (evalResult.value < minEval) {
                        minEval = evalResult.value;
                        bestMove = move;
                    }
                    
                    beta = Math.min(beta, evalResult.value);
                    if (beta <= alpha) break;
                }
            }
            
            if (beta <= alpha) break;
        }

        return { value: minEval, move: bestMove };
    }
}

// Aplicar movimento ao estado
function applyMoveToState(state, move) {
    if (move.type === "PASS") {
        return new State(state.board, getOpponent(state.toMove));
    }

    const newState = state.clone();
    const { r: fromR, c: fromC } = move.from;
    const { row: toR, col: toC } = move.to;

    const piece = newState.board[fromR][fromC];
    if (!piece) return newState;

    // Atualizar estado da peça
    piece.hasMoved = true;
    const finalRow = piece.player === WHITE ? 3 : 0;
    if (toR === finalRow) {
        piece.inFinalRow = true;
    }

    // Mover peça
    newState.board[fromR][fromC] = null;
    
    // Capturar peça adversária se houver
    const targetPiece = newState.board[toR][toC];
    if (targetPiece && targetPiece.player !== piece.player) {
        // Peça capturada - simplesmente sobrescrever
    }
    
    newState.board[toR][toC] = piece;
    newState.toMove = getOpponent(state.toMove);

    return newState;
}

// Escolha de movimento da IA
const AI_DEPTHS = { EASY: 1, MEDIUM: 2, HARD: 3 };

async function chooseMoveAI(state, level = "MEDIUM") {
    const normalized = (level || "MEDIUM").toString().toUpperCase();
    const depth = AI_DEPTHS[normalized] || 2;

    // Para nível fácil, adicionar aleatoriedade
    if (normalized === "EASY" && Math.random() < 0.3) {
        const allMoves = [];
        for (const value of [1, 2, 3, 4, 6]) {
            allMoves.push(...generateMovesForValue(state, value, state.toMove));
        }
        if (allMoves.length > 0) {
            return allMoves[Math.floor(Math.random() * allMoves.length)];
        }
        return { type: "PASS" };
    }

    // Usar Minimax para níveis médio e difícil
    const result = minimax(state, depth, state.toMove === WHITE);
    
    if (result.move) {
        return result.move;
    }

    // Fallback: encontrar qualquer movimento válido
    for (const value of [1, 2, 3, 4, 6]) {
        const moves = generateMovesForValue(state, value, state.toMove);
        if (moves.length > 0) {
            return moves[0];
        }
    }

    return { type: "PASS" };
}

// Interface com o board.js
window.IA = window.IA || {};

window.IA.chooseMoveAI = chooseMoveAI;
window.IA.State = State;
window.IA.Piece = Piece;

window.IA.fromGameBoard = function(content, cols, toMove) {
  const board = Array.from({ length: ROWS }, () => Array(cols).fill(null));
  for (let i = 0; i < content.length; i++) {
    const cell = content[i];
    const r = Math.floor(i / cols);
    const c = i % cols;
    if (cell && cell.player) {
      // map 'player-1' / 'player-2' to WHITE / BLACK
      const p = cell.player === 'player-1' ? WHITE : BLACK;
      const piece = new Piece(p, r, c);
      // Restore IA-specific flags if present on the board content
      if (cell.hasConverted) piece.hasConverted = !!cell.hasConverted;
      if (cell.hasEnteredOpponentHome) piece.hasEnteredOpponentHome = !!cell.hasEnteredOpponentHome;
      if (Array.isArray(cell.history)) piece.history = [...cell.history];
      board[r][c] = piece;
    }
  }
  const mover = toMove === 'player-1' ? WHITE : BLACK;
  return new State(board, mover);
};

window.IA.moveToIndices = function(move, cols) {
    if (!move || move.type === 'PASS') return { type: 'PASS' };
    
    return {
        from: move.from.r * cols + move.from.c,
        to: move.to.row * cols + move.to.col
    };
};

window.IA.WHITE = WHITE;
window.IA.BLACK = BLACK;