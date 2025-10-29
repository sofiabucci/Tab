/**
 * @file Piece.js
 * @description
 * Represents a single Tâb piece (token) on the board.
 * A piece has a player owner and a lifecycle state:
 *  - "unmoved" (only moves with value 1 / Tâb)
 *  - "moved"
 *  - "promoted" (reaches enemy base row)
 *
 * This class is purely logical but can generate a DOM element
 * to be displayed on the board.
 */

export class Piece {
  /**
   * @param {string} player - Either "player-1" or "player-2".
   */
  constructor(player) {
    /** @type {string} */
    this.player = player;

    /** @type {'unmoved'|'moved'|'promoted'} */
    this.state = 'unmoved';
  }

  // ────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ────────────────────────────────────────────────

  /**
   * Determines whether this piece can move with a given roll value.
   * @param {number} value - The current dice value (1–6).
   * @returns {boolean}
   */
  canMoveWith(value) {
    if (this.state === 'unmoved') return value === 1;
    return true;
  }

  /**
   * Marks this piece as having made its first move.
   */
  markMoved() {
    if (this.state === 'unmoved') this.state = 'moved';
  }

  /**
   * Promotes the piece (enters enemy's starting row).
   */
  promote() {
    this.state = 'promoted';
  }

  /**
   * Returns whether the piece is promoted.
   * @returns {boolean}
   */
  isPromoted() {
    return this.state === 'promoted';
  }

  // ────────────────────────────────────────────────
  // DOM REPRESENTATION
  // ────────────────────────────────────────────────

  /**
   * Creates a DOM element representing the piece.
   * @returns {HTMLElement}
   */
  createElement() {
    const el = document.createElement('div');
    el.className = `board-token ${this.player} ${this.state}`;
    el.dataset.player = this.player;
    el.dataset.state = this.state;
    return el;
  }
}
