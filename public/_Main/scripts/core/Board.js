//@ts-check

import { Piece } from './Piece.js';
import { Player } from './Player.js';

/**
 * Board class for Tâb game board operations. 
 * Has functions for rendering the baord, as well as for finding and manipulating player tokens.
 * @class
*/
export class Board {
    static DEFAULT_CONTAINER = 'board-container';

    /**
     * @param {String} id - HTML id of parent container
     * @param {number} columns - Number of columns in the board 
     */
    constructor(id, columns) {
        /** @type {String} HTML id of parent container */
        this.parentId = id;

        if (document.getElementById(id) === null) {
            throw console.error(id + " HTML id of Board container was not found");
        }
        

        /** @type {number} Number of columns in the board */
        this.cols = columns;
        /** @type {number} Number of rows in the board. Default is 4 */
        this.rows = 4;

        /** @type {(Piece | null)[]} */
        this.content = new Array(this.cols * this.rows).fill(null);
    }

    /**
     * @param {number} index - board cell index
     * @returns {number} row number of the given index. (0 based)
     */
    getRowFromIndex(index) {
        return Math.floor(index / this.cols);
    }
    /**
     * @param {number} index - board cell index
     * @returns {number} column number of the given index. (0 based)
     */
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
     * @param {Function} onCellClick - Callback function for board cell clicks
     * @param {string} parentId - The container element ID
     */
    initDOM(onCellClick, parentId = this.parentId) {
        const parent = document.getElementById(parentId);
        if(!parent) {
            throw new Error(`Could not find parent HTML id=${parentId}`);
        }
        
        parent.innerHTML = '';

        const board = document.createElement('div');
        board.classList = "board";
        board.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

        this.setupPieces();

        for (let i = 0; i < this.cols * this.rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'board-square';
            cell.onclick = () => onCellClick(i);

            // If square contains token 
            if (this.content[i]) {
                // @ts-ignore
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

    /** Finds player tokens.
     * @returns { {P1Pieces: number[],P2Pieces: number[]} } List of indexes showing the locations of the tokens of each player.
     */
    findPlayerPieces() {
        /** @type { number[] } */
        let p1 = [];
        /** @type { number[] } */
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