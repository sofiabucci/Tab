// ================================
// 🏺 Egyptian Tâb (versão sem stacks)
// ================================

// Constantes básicas
const WHITE = "W";
const BLACK = "B";
const ROWS = 4;

// Valores possíveis dos sticks (varetas)
const THROWS = [
  [1, 0.25, true],  // tâb → 1
  [2, 0.38, true],
  [3, 0.25, false],
  [4, 0.06, false],
  [6, 0.06, true]
];

// ---------------------------------
// 🧱 Estrutura da peça
// ---------------------------------
class Piece {
  constructor(player, row, col) {
    this.player = player;
    this.row = row;
    this.col = col;
    this.hasConverted = false;           // se já fez o primeiro movimento "tâb"
    this.hasEnteredOpponentHome = false; // se já entrou na home row do adversário
    this.history = [];                   // rows visitadas
  }

  clone() {
    const p = new Piece(this.player, this.row, this.col);
    p.hasConverted = this.hasConverted;
    p.hasEnteredOpponentHome = this.hasEnteredOpponentHome;
    p.history = [...this.history];
    return p;
  }
}

// ---------------------------------
// 🎯 Estrutura do estado do jogo
// ---------------------------------
class State {
  constructor(board, toMove) {
    this.board = board;      // board externo (4xN)
    this.toMove = toMove;    // "W" ou "B"
    this.eliminated = { [WHITE]: 0, [BLACK]: 0 };
  }

  clone() {
    const clonedBoard = this.board.map(row => row.map(cell => cell ? cell.clone() : null));
    const st = new State(clonedBoard, this.toMove);
    st.eliminated = { ...this.eliminated };
    return st;
  }

  isTerminal() {
    const whites = this.board.flat().filter(p => p && p.player === WHITE).length;
    const blacks = this.board.flat().filter(p => p && p.player === BLACK).length;
    return whites === 0 || blacks === 0;
  }

  evaluate() {
    const whites = this.board.flat().filter(p => p && p.player === WHITE).length;
    const blacks = this.board.flat().filter(p => p && p.player === BLACK).length;
    return whites - blacks;
  }
}

// ---------------------------------
// ⚙️ Funções auxiliares
// ---------------------------------

function inBounds(row, col, cols) {
  return row >= 0 && row < ROWS && col >= 0 && col < cols;
}

function getOpponent(player) {
  return player === WHITE ? BLACK : WHITE;
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

      // Regras 4: Primeira jogada só pode ser "tâb" (1)
      if (!piece.hasConverted && throwVal !== 1) continue;

      // Calcular destino
      let newRow = r;
      let newCol = c + throwVal;

      // Movimento estilo "zig-zag" (como no Senet)
      if (newCol >= cols) {
        newRow = (r + 1) % ROWS;
        newCol = newCol - cols;
      }

      if (!inBounds(newRow, newCol, cols)) continue;

      const dest = state.board[newRow][newCol];

      // Não pode mover para casa com peça da mesma equipa
      if (dest && dest.player === player) continue;

      // Regras 1 e 2: home rows e bloqueio
      const opponentHome = player === WHITE ? 3 : 0;
      const ownHome = player === WHITE ? 0 : 3;

      // Bloquear avanço dentro da home adversária se ainda tiver peças na própria
      if (
        piece.hasEnteredOpponentHome &&
        newRow === opponentHome &&
        piecesInHomeRow(state, player) > 0
      ) continue;

      // Marcar se entra na home adversária
      const enteringOpponentHome = newRow === opponentHome && !piece.hasEnteredOpponentHome;

      // Regras 4: primeira jogada não pode ir para casa ocupada pelo mesmo jogador
      if (!piece.hasConverted && dest && dest.player === player) continue;

      moves.push({
        piece, from: { r, c },
        to: { r: newRow, c: newCol },
        enteringOpponentHome,
        convert: !piece.hasConverted && throwVal === 1
      });
    }
  }

  // Regra 3: Pode passar a vez (opcional)
  moves.push({ type: "PASS" });
  return moves;
}

function applyMove(state, move) {
  if (move.type === "PASS") return state;

  const newState = state.clone();
  const p = newState.board[move.from.r][move.from.c];
  if (!p) return newState;

  // Limpar casa antiga
  newState.board[move.from.r][move.from.c] = null;

  // Captura se houver inimigo
  const target = newState.board[move.to.r][move.to.c];
  if (target && target.player !== p.player) {
    newState.eliminated[target.player]++;
  }

  // Atualizar peça
  p.row = move.to.r;
  p.col = move.to.c;
  if (move.convert) p.hasConverted = true;
  if (move.enteringOpponentHome) p.hasEnteredOpponentHome = true;
  if (!p.history.includes(move.to.r)) p.history.push(move.to.r);

  // Colocar no destino
  newState.board[move.to.r][move.to.c] = p;

  // Mudar turno
  newState.toMove = getOpponent(state.toMove);

  return newState;
}

// ---------------------------------
// 🎲 Expectimax (IA)
// ---------------------------------

async function expectimax(state, depth, maximizing) {
  if (state.isTerminal() || depth === 0) return { value: state.evaluate(), best: null };
  const player = state.toMove;

  async function chanceNode(st, d, p) {
    let expected = 0;
    for (const [val, prob] of THROWS) {
      const v = await valueAfterThrow(st, val, d, p);
      expected += prob * v;
    }
    return expected;
  }

  async function valueAfterThrow(st, val, d, p) {
    const moves = generateMovesForThrow(st, val, p);
    if (!moves.length) {
      const next = st.clone();
      next.toMove = getOpponent(p);
      return (await expectimax(next, d - 1, !maximizing)).value;
    }

    let bestVal = p === WHITE ? -Infinity : Infinity;
    for (const m of moves) {
      const next = applyMove(st, m);
      const valEval = await chanceNode(next, d - 1, getOpponent(p));
      if (p === WHITE) bestVal = Math.max(bestVal, valEval);
      else bestVal = Math.min(bestVal, valEval);
    }
    return bestVal;
  }

  const best = await chanceNode(state, depth, player);
  return { value: best, best: null };
}

// ---------------------------------
// 🧠 Escolha de jogada da IA
// ---------------------------------
const AI_DEPTHS = { EASY: 1, MEDIUM: 3, HARD: 5 };

async function chooseMoveAI(state, level = "MEDIUM") {
  const normalized = (level || "MEDIUM").toString().toUpperCase();
  const depth = AI_DEPTHS[normalized] || 3;
  const moves = generateMovesForThrow(state, 1, state.toMove)
    .concat(generateMovesForThrow(state, 2, state.toMove))
    .concat(generateMovesForThrow(state, 3, state.toMove))
    .concat(generateMovesForThrow(state, 4, state.toMove))
    .concat(generateMovesForThrow(state, 6, state.toMove));

  if (!moves.length) return { type: "PASS" };

  // Aleatoriedade no nível fácil
  if (normalized === "EASY" && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Avaliar movimentos
  let bestVal = -Infinity;
  let bestMove = moves[0];
  for (const m of moves) {
    const next = applyMove(state, m);
    const { value } = await expectimax(next, depth - 1, false);
    if (value > bestVal) {
      bestVal = value;
      bestMove = m;
    }
  }

  return bestMove;
}

// ---------------------------------
// Expose IA helpers to other scripts
// ---------------------------------
window.IA = window.IA || {};
window.IA.chooseMoveAI = chooseMoveAI;
window.IA.State = State;
window.IA.Piece = Piece;
window.IA.applyMove = applyMove;

// Convert flat GameBoard.content (length cols*4) to IA State
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

// Convert IA move to flat indices for the GameBoard
window.IA.moveToIndices = function(move, cols) {
  if (!move || move.type === 'PASS') return { type: 'PASS' };
  return {
    from: move.from.r * cols + move.from.c,
    to: move.to.r * cols + move.to.c,
    convert: move.convert,
    enteringOpponentHome: move.enteringOpponentHome
  };
};

window.IA.WHITE = WHITE;
window.IA.BLACK = BLACK;

