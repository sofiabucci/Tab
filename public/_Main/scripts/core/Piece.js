
// Enum for piece State
export class PieceState {
    static UNMOVED = 'unmoved';
    static MOVED = 'moved';
    static PROMOTED = 'promoted';
}

/** Player tokens */
export class Piece {
  /**
   * @param {string} player - ID of the player to which this piece belongs.
   * @param {number} position - index showing the position of this piece.
   * @param {String} state - state of this piece: 'unmoved', 'moved' or 'promoted'
   */
    constructor(playerId, position, state = PieceState.UNMOVED) {
        /** @type {String} PlayerId - Indicates player to which this piece belongs */
        this.player = playerId;
        /** @type {number} board.cells index showing the position of this piece */
        this.position = position;
        /** @type {String} one of ['unmoved', 'moved', 'promoted'] */
        this.state = state
    }

    markMoved() {
        if (this.state === PieceState.UNMOVED) this.state = PieceState.MOVED;
    }

    promote() {
        this.state = PieceState.PROMOTED;
    }

    // ────────────────────────────────────────────────
    // DOM REPRESENTATION
    // ────────────────────────────────────────────────

    //TODO: Move to rederer
    createElement() {
        const el = document.createElement('div');
        el.className = `board-token ${this.playerId} ${this.state}`;
        el.dataset.player = this.player;
        el.dataset.state = this.state;

        if(this.state === PieceState.PROMOTED){
            el.innerText = "✡";
        }else if(this.state === PieceState.MOVED){
            el.innerText = "●";   
        }
        
        return el;
    }

    //TODO: Move to Movement logic controler
    canMove(diceValue, board) {
        if (this.state === PieceState.UNMOVED && diceValue !== 1) return false;

        const targetPosition = board.calculateMove(this.position, diceValue);
        if (targetPosition === null) return false;

        const targetPiece = board.getPieceAt(targetPosition);
        return !targetPiece || targetPiece.playerId !== this.playerId;
    }

    moveTo(newPosition, board) {
        const capturedPiece = board.getPieceAt(newPosition);
        board.movePiece(this.position, newPosition);
        this.position = newPosition;

        if (!this.isConverted) {
            this.isConverted = true;
        }

        return capturedPiece;
    }
}