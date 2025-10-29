/**
 * @file Board.js
 * @description
 * Implements the DOM-based game board for Tâb.
 * Manages piece placement, movement logic, turn validation,
 * and rendering of a 4×N grid.
 *
 * This class interacts with the DOM but encapsulates its logic cleanly.
 */

import { Piece } from './Piece.js';

export class Board {
  /**
   * @param {string} containerId - ID of the board container in the DOM.
   * @param {number} [cols=9] - Number of columns (must be odd between 7–15).
   */
  constructor(containerId, cols = 9) {
    /** @type {HTMLElement} */
    this.container = document.getElementById(containerId);
    /** @type {number} */
    this.cols = cols;
    /** @type {number} */
    this.rows = 4;
    /** @type {(Piece|null)[]} */
    this.cells = Array(this.cols * this.rows).fill(null);

    /** @type {string} */
    this.currentPlayer = 'player-1';
    /** @type {boolean} */
    this.gameActive = true;
    this.boardFlow = movementMap();

    this.#initBoardDOM();
    this.#setupPieces();
    this.render();
  }

  // ────────────────────────────────────────────────
  // INITIALIZATION
  // ────────────────────────────────────────────────

  #initBoardDOM() {
    if (!this.container) throw new Error('Board container not found');
    this.container.innerHTML = '';

    this.boardEl = document.createElement('div');
    this.boardEl.className = 'board';
    this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

    for (let i = 0; i < this.rows * this.cols; i++) {
      const cell = document.createElement('div');
      cell.className = 'board-square';
      cell.dataset.index = i;
      cell.addEventListener('click', () => this.handleSquareClick(i));
      this.boardEl.appendChild(cell);
    }

    this.container.appendChild(this.boardEl);
  }

  #setupPieces() {
    // Player 2 (top)
    for (let c = 0; c < this.cols; c++) {
      this.cells[c] = new Piece('player-2');
    }
    // Player 1 (bottom)
    for (let c = 0; c < this.cols; c++) {
      this.cells[3 * this.cols + c] = new Piece('player-1');
    }
  }

  // ────────────────────────────────────────────────
  // MOVEMENT LOGIC
  // ────────────────────────────────────────────────
  getRowFromIndex(index) {
    return Math.floor(index / this.cols);
  }
  getColFromIndex(index) {
    return index % this.cols;
  }

  movementMap() {
    let flow = new Map();
    for (let i = 0; i < this.cells.length; i++) {
      switch (this.getRowFromIndex(i)) {
        case 0:
        case 2:
          flow.set(i, [i - 1]);
          break;
        case 1:
        case 3:
          flow.set(i, [i + 1]);
          break;
        default:
          return null;
      }
    }

    flow.set(0, [this.cols]);
    flow.set(4 * this.cols - 1, [3 * this.cols - 1]);

    flow.set(2 * this.cols - 1, [3 * this.cols - 1, this.cols - 1]);
    flow.set(2 * this.cols, [this.cols, 3 * this.cols]);

    return flow;
  }
  /**
   * Calculates next index after moving `steps` spaces in the snake path.
   * @param {number} fromIndex - Starting index.
   * @param {number} steps - Number of moves. Between 0 and 6 inclusive.
   * @returns {number[]|null} Array of length 2. Index 0 contains the normal snake path result. Index 1 contains the forked path.
   */
  calculateTarget(fromIndex, steps) {
    if(fromIndex == null || steps < 0 || steps > 6) return null;

    let result = new Array();
    this.calculateTargetR(fromIndex , steps, result);
    return result;
  }

  calculateTargetR(fromIndex, steps, result) {
    if (steps === 0) {
      result.push(fromIndex);
      return;
    } else {
      let arr = this.boardFlow.get(fromIndex);
      arr.forEach(tile => {
        this.calculateTargetR(tile, steps - 1, result);
      });
    }
  }

  /**
   * Moves a piece from index A to B. Does not validate.
   * @param {number} from
   * @param {number} to
   */
  movePiece(from, to) {
    const piece = this.cells[from];
    const target = this.cells[to];

    if (!piece) return;

    // Capture
    if (target && target.player !== piece.player) {
      this.cells[to] = null;
      this.#showMessage(`${piece.player} captured an enemy piece!`);
    }

    // Move
    this.cells[to] = piece;
    this.cells[from] = null;

    // Re-render board
    this.render();

    // Dispatch event for move completion
    document.dispatchEvent(new CustomEvent('moveEnded', { detail: { from, to, piece } }));
  }

  /**
   * Called when a player clicks a square on the board.
   * @param {number} index
   */
  handleSquareClick(index) {
    if (!this.gameActive) return;

    const selected = this.cells[index];
    if (selected && selected.player === this.currentPlayer) {
      if (!window.lastRoll) {
        this.#showMessage('Roll the dice first!');
        return;
      }

      const value = window.lastRoll.value;
      if (!selected.canMoveWith(value)) {
        this.#showMessage('You can only move unmoved pieces with Tâb (1).');
        return;
      }

      const target = this.calculateTarget(index, value);
      
      if (target == null) {
        this.#showMessage('Invalid move.');
        return;
      }

      const destPiece = this.cells[target];
      if (destPiece && destPiece.player === this.currentPlayer) {
        this.#showMessage('You already have a piece there.');
        return;
      }

      this.movePiece(index, target);
      this.#endTurnCheckRepeat(value);
    }
  }

  #endTurnCheckRepeat(value) {
    if ([1, 4, 6].includes(value)) {
      this.#showMessage('Repeat roll!');
      document.dispatchEvent(new CustomEvent('repeatTurn'));
    } else {
      this.switchPlayer();
    }
  }

  /**
   * Switches current player.
   */
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'player-1' ? 'player-2' : 'player-1';
    this.#showMessage(`It's now ${this.currentPlayer}'s turn.`);
    document.dispatchEvent(new CustomEvent('turnChanged', { detail: { current: this.currentPlayer } }));
  }

  // ────────────────────────────────────────────────
  // RENDERING
  // ────────────────────────────────────────────────

  render() {
    const squares = this.boardEl.querySelectorAll('.board-square');
    squares.forEach((sq, i) => {
      sq.innerHTML = '';
      const piece = this.cells[i];
      if (piece) sq.appendChild(piece.createElement());
    });
  }

  #showMessage(msg) {
    const msgBox = document.getElementById('gameMessage');
    if (msgBox) msgBox.textContent = msg;
  }
}

// ────────────────────────────────────────────────
// Global initialization
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Example: create board for 9 columns
  window.board = new Board('board-container', 9);
});
