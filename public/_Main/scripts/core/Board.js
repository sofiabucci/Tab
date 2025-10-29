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

    /** @type {number} */
    this.selectedPiece = null;

    /** @type {(Piece|null)[]} */
    this.cells = Array(this.cols * this.rows).fill(null);

    /** @type {string} */
    this.currentPlayer = 'player-1';

    /** @type {boolean} */
    this.gameActive = true;
    
    /** @type {Map.<number, number[]>} */
    this.boardFlow = movementMap();
    /** @type {number[]} */
    this.possibleMoves = [];
    

    this.initBoardDOM();
    this.setupPieces();
    this.render();
  }

  // ────────────────────────────────────────────────
  // INITIALIZATION
  // ────────────────────────────────────────────────

  initBoardDOM() {
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

  setupPieces() {
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
      this.showMessage(`${piece.player} captured an enemy piece!`);
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
   * @param {number} diceRoll Value of the last dice roll.
   */
  handleSquareClick(index, diceValue) {
    if (!this.gameActive) {return;}
    if (!diceRoll) {
      this.showMessage('Roll the dice first!');
      return;
    }

    const piece = this.cells[index];

    // No piece is selected
    if(!this.selectedPiece){
      // Clicked empty square → ignore
      if (!piece) return;

      // Clicked opponent’s piece → ignore
      if (piece.player !== this.currentPlayer) return;

      // Select piece and compute valid targets
      this.selectedIndex = index;
      this.possibleMoves = this.calculateTarget(index, roll.value);

      // Visual feedback
      this.highlightSelection(index, this.possibleMoves);
      return;
    }else { //Piece is selected
      
      // Clicked on selected piece again
      if(index === this.selectedPiece){
        this.clearSelection();
        return;
      }
      
      // Clicked valid move target
      if (this.possibleMoves.includes(index)) {
        if (this.validateMove(this.selectedIndex, index, diceValue)) {
          this.movePiece(this.selectedIndex, index);
          this.endTurnCheckRepeat(diceValue);
        }
        this.clearSelection();
        return;
      }
    }
  }//End of handleSquareClick

  /**
   * Highlight selected piece and valid target squares.
   */
  highlightSelection(from, possibleMoves) {
    let s = (possibleMoves.length == 2) ? 
      `#square${from} #square${possibleMoves[0]}`: 
      `#square${from} #square${possibleMoves[0]} #square${possibleMoves[0]}`;

    const elements = document.querySelectorAll(s);
    
    elements.forEach(element => {
    element.classList.add(" highlight");
    });
  }

  /**
   * Clear highlights and reset selection state.
   */
  clearSelection() {
    this.selectedPiece = null;
    this.possibleMoves = [];

    const elements = document.querySelectorAll(".highlight");
    
    elements.forEach(element => {
      element.classList.remove("highlight");
    });
  }

  validateMove(from, to, diceValue){
    const piece = this.cells[from];
    const options = this.calculateTarget(from, diceValue);
    const dest = this.cells[to];

    // Not a move
    if(!piece || !options || !options.includes(to)) return false;
    // Friendly piece
    if(dest != null && dest.player === piece.player) return false;

    // Unmoved piece
    if(piece.state === 'unmoved'){
      if(diceValue === 1 && options.includes(to)){
        this.cells[from].markMoved();
        return true;
      }
      return false;

    }else if(piece.state === 'promoted'){ 
      // Promoted piece
      return to === options[0];

    } else{
      // Moved piece
      const currRow = this.getRowFromIndex(from);
      const destRow = this.getRowFromIndex(to);

      // Same Row
      if(currRow === destRow) return true;
      
      // Row Change
      // Not a fork
      if(to === options[0]) return true;

      // Fork
      // Back to starting row
      if(destRow === 3 && piece.player === 'player-1') return false;
      if(destRow === 0 && piece.player === 'player-2') return false;
      
      // Promote to enemy's starting row if our starting row is empty
      if(this.startingRowIsEmpty(piece.player)){
        this.cells[from].promote();
        return true;
      }

    }

    return false;
  }

  startingRowIsEmpty(player){
    let flag = true;
    let row = (player === 'player-1') ? 3: 0;

    for (let i = 0; i < this.cols; i++) {
      let p = this.cells[row*this.cols + i] ;
      flag = flag && p != null && p !== player;
    }
    
    // False if there is a friendly piece in player's starting row.
    return flag;
  }

  endTurnCheckRepeat(value) {
    if ([1, 4, 6].includes(value)) {
      this.showMessage('Repeat roll!');
      // console.log(`Board.endTurnCheckRepeat: Repeat ${this.currentPlayer} turn.`);
      document.dispatchEvent(new CustomEvent('repeatTurn'));
    } else {
      this.switchPlayer();
    }
  }

  /**
   * Switches current player.
   */
  switchPlayer() {
    this.currentPlayer = (this.currentPlayer === 'player-1') ? 'player-2' : 'player-1';
    this.showMessage(`It's now ${this.currentPlayer}'s turn.`);
    //console.log(`Board.switchPlayer: ${this.currentPlayer}'s turn.`);
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

  showMessage(msg) {
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

  document.addEventListener('turnChanged', () => {
    window.board.clear
  });
});
