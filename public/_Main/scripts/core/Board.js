import { Piece } from './Piece.js';
import { Player } from './Player.js';

/**
 * Board class for Tâb game board operations. 
 * Has functions for rendering the baord, as well as for finding and manipulating player tokens.
 * @class
*/
export class Board {
    static DEFAULT_CONTAINER = 'board-container';

    constructor(id, columns) {
        /** @type {String} HTML id of parent container */
        this.parentId = id;

        /** @type {number} Number of columns in the board */
        this.cols = columns;
        this.rows = 4;

        /** @type {(Piece | null)[]} */
        this.content = new Array(this.cols * this.rows).fill(null);
    }

    getRowFromIndex(index) {
        return Math.floor(index / this.cols);
    }
    getColFromIndex(index) {
        return index % this.cols;
    }

    /**
     * Sets up the initial piece positions
     */
    setupPieces() {
        // Player 2 (top row - linha 0)
        for (let c = 0; c < this.cols; c++) {
            this.content[c] = new Piece(Player.P2, c, Piece.UNMOVED);
        }
        // Player 1 (bottom row - linha 3)
        for (let c = 0; c < this.cols; c++) {
            this.content[3 * this.cols + c] = new Piece(Player.P1, c, Piece.UNMOVED);
        }
    }

    /**
     * Initializes the board DOM structure. Calls {@link Board.setupPieces()} to setup tokens.
     * @param {string} parentId - The container element ID
     */
    initDOM(parentId = this.parentId) {
        const parent = document.getElementById(parentId);
        parent.innerHTML = '';

        const board = document.createElement('div');
        board.classList = "board";
        board.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

        this.setupPieces();

        for (let i = 0; i < this.cols * this.rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'board-square';
            cell.onclick = () => this.handleClick(i);

            // If square contains token 
            if (this.content[i]) {
                const token = this.content[i].createElement();
                cell.appendChild(token);
            }

            board.appendChild(cell);
        }
    }

    /** Get piece at given `index`
     * @param {number} index
     */
    getPieceAt(index) {
        return this.content[index];
    }

    /** Set a piece at given `index`
     * @param {number} index
     * @param {Piece | null} piece
     */
    setPieceAt(index, piece) {
        if (piece === null) {
            this.content[index] = null;
        }
        else {
            this.content[index] = new Piece(piece.player, index, piece.state);
        }
    }

    findPlayerPieces() {
        let p1 = [];
        let p2 = [];

        this.content.forEach((piece, i) => {
            if (piece) {
                if (piece.player === Player.P1) {
                    p1.push(i);
                } else if (piece.player === Player.P2) {
                    p2.push(i);
                }
            }
        });

        return { P1Pieces: p1, P2Pieces: p2 };
    }

}