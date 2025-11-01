import { PieceState } from './Piece.js';
import { Piece } from './Piece.js';

class Player {
    constructor(id, name, type, difficulty = null) {
        /** @type {String} 'player-1' or 'player-2' */
        this.id = id;
        /** @type {String} User choosen name */
        this.name = name;
        /** @type {String} one of ['HUMAN', 'AI-EASY', 'AI-MEDIUM', 'AI-HARD'] */
        this.type = type;
        /** @type {number[]} board.cells indexes pointing to this player's pieces */
        this.pieces = [];
        this.score = 0;
    }

    // Factory method for creating player pieces
    createPieces(boardColumns) {
        this.pieces = [];
        const startPositions = this.getStartPositions(boardColumns);

        startPositions.forEach(position => {
            this.pieces.push(new GamePiece(this.id, position, false));
        });
    }

    getStartPositions(columns) {
        return this.id === 'player-1'
            ? Array.from({ length: columns }, (_, i) => 3 * columns + i)
            : Array.from({ length: columns }, (_, i) => i);
    }

    hasValidMoves(diceValue, board) {
        return this.pieces.some(piece =>
            piece.canMove(diceValue, board) &&
            (!piece.isConverted || diceValue === 1)
        );
    }
}

class PlayerId {
    static P1 = 'player-1';
    static P2 = 'player-2';
}

class GameBoard {

    constructor(id, columns) {
        /** @type {String} HTML id of parent container */
        this.parentId = id;

        /** @type {number} Number of columns in the board */
        this.cols = columns;
        this.rows = 4;

        this.movementCalculator = new MovementCalculator(columns);

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
            this.content[c] = new Piece(PlayerId.P2, c, PieceState.UNMOVED);
        }
        // Player 1 (bottom row - linha 3)
        for (let c = 0; c < this.cols; c++) {
            this.content[3 * this.cols + c] = new Piece(PlayerId.P1, c, PieceState.UNMOVED);
        }
    }

    /**
     * Initializes the board DOM structure. Must be called after setting up the board tokens.
     * @param {string} parentId - The container element ID
     */
    initBoard(parentId) {
        const parent = document.getElementById(parentId);
        parent.innerHTML = '';

        const board = document.createElement('div');
        board.classList = "board";
        board.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

        for (let i = 0; i < this.cols * this.rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'board-square';
            cell.onclick = () => this.handleClick(i);

            //token having block;
            if (this.content[i]) {
                const token = this.content[i].createElement();
                cell.appendChild(token);
            }

            board.appendChild(cell);
        }
    }
}

class MovementCalculator {
    constructor(columns) {
        this.cols = columns;
        this.rows = 4;
        this.map = this.movementMap();
    }

    movementMap() {
        let flow = new Map();
        for (let i = 0; i < this.cols*this.rows; i++) {
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

    calculate(fromIndex, steps) {
        if (fromIndex === null) return null;
        if (steps === null) return null;

        const fromPos = this.getRowCol(fromIndex);
        let currentPos = { ...fromPos };
        let remainingSteps = steps;

        while (remainingSteps > 0) {
            const direction = this.getMovementDirection(currentPos.row);
            const nextPos = this.getNextPosition(currentPos, direction);

            if (!nextPos) return null;

            currentPos = nextPos;
            remainingSteps--;
        }

        return this.getIndex(currentPos.row, currentPos.col);
    }

    getMovementDirection(row) {
        return (row === 0 || row === 2) ? -1 : 1;
    }

    getNextPosition(currentPos, direction) {
        let nextCol = currentPos.col + direction;
        let nextRow = currentPos.row;

        // Handle board edges and transitions
        if (nextCol < 0 || nextCol >= this.columns) {
            const pairedRow = this.getPairedRow(currentPos.row);
            if (pairedRow === null) return null;

            nextRow = pairedRow;
            nextCol = direction > 0 ? this.columns - 1 : 0;
        }

        return { row: nextRow, col: nextCol };
    }

    getPairedRow(row) {
        const pairs = { 0: 1, 1: 2, 2: 1, 3: 2 };
        return pairs[row] !== undefined ? pairs[row] : null;
    }

    getRowCol(index) {
        return {
            row: Math.floor(index / this.columns),
            col: index % this.columns
        };
    }

    getIndex(row, col) {
        return row * this.columns + col;
    }
}