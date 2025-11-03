/**
 * Utility class for Tâb game board operations. 
 * Has functions for messaging and movement logic.
 * @class
 */
export class Utils {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = 4;

        /**  @type {Map<number, number[]>} Keys are cell indexes, values are arrays of possible next cell indexes */
        this.map = Utils.movementMap(cols, rows);
    }

    /** 
     * Element ID constant for the game message display
     * @constant {string}
     */
    static MESSAGE_BOX_ID = 'gameMessage';

     /**
     * Displays a message in the game message box
     * @param {string} text - Message text to display
     */
    static showMessage(text) {
        const msgEl = document.getElementById(Messager.MESSAGE_BOX_ID);
        if (msgEl) msgEl.textContent = text;
    }

    /** Static method that returnsa map indicaintg the index of the next cell(s) on the board create board movement map 
     * @param {number} rows 
     * @param {number} cols
     * @return {Map<number, number[]>} Keys are cell indexes, values are arrays of possible next cell indexes
    */
    static movementMap(rows, cols) {
        let flow = new Map();
        for (let i = 0; i < cols * rows; i++) {
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

        flow.set(0, [cols]);
        flow.set(4 * cols - 1, [3 * cols - 1]);

        flow.set(2 * cols - 1, [3 * cols - 1, cols - 1]);
        flow.set(2 * cols, [cols, 3 * cols]);

        return flow;
    }

    /**
   * Calculates next index after moving `steps` spaces in the snake path.
   * @param {number} fromIndex - Starting index.
   * @param {number} steps - Number of moves. Between 0 and 6 inclusive.
   * @returns {number[]|null} Array of max length 2. Index 0 contains the normal snake path result. Index 1 contains the forked path.
   */
    calculateTarget(fromIndex, steps) {
        if (fromIndex == null || steps < 0 || steps > 6) return null;

        let result = new Array();
        this.#calculateTargetR(fromIndex, steps, result);
        return result;
    }

    #calculateTargetR(fromIndex, steps, result) {
        if (steps === 0) {
            result.push(fromIndex);
            return;
        } else {
            let arr = this.map.get(fromIndex);
            arr.forEach(cell => {
                this.#calculateTargetR(cell, steps - 1, result);
            });
        }
    }
}