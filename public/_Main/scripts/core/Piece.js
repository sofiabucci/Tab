//@ts-check
/** Player tokens class.
 *  Has functions for rendering, and defines constants for token state management.
 */
export class Piece {
  /**
   * @param {string} player - ID of the player to which this piece belongs.
   * @param {number} position - index showing the position of this piece.
   * @param {String} state - state of this piece: 'unmoved', 'moved' or 'promoted'
   */
    constructor(player, position, state = Piece.UNMOVED) {
        /** @type {String} PlayerId - Indicates player to which this piece belongs */
        this.player = player;
        /** @type {number} board.cells index showing the position of this piece */
        this.position = position;
        /** @type {String} one of ['unmoved', 'moved', 'promoted'] */
        this.state = state;
    }

    // Token states
    static UNMOVED = 'unmoved';
    static MOVED = 'moved';
    static PROMOTED = 'promoted';

    markMoved() {
        if (this.state === Piece.UNMOVED) this.state = Piece.MOVED;
    }

    hasConverted() {
        return !(this.state === Piece.UNMOVED);
    }
    hasEnteredOpponentHome(){
        return this.state === Piece.PROMOTED;
    }

    promote() {
        this.state = Piece.PROMOTED;
    }

    // ────────────────────────────────────────────────
    // DOM REPRESENTATION
    // ────────────────────────────────────────────────

    createElement() {
        const el = document.createElement('div');
        el.className = `board-token ${this.player} ${this.state}`;
        el.dataset.player = this.player;
        el.dataset.state = this.state;

        if(this.state === Piece.PROMOTED){
            el.innerText = "✡";
        }else if(this.state === Piece.MOVED){
            el.innerText = "●";   
        }
        
        return el;
    }
}