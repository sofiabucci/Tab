//@ts-check
/**
 * Utility class for Tâb game board operations. 
 * Handles board movement logic and path calculation for Tâb game
 * @class
 */
export class MovementCalculator {
    /**
     * @param {number} rows - number of rows in the board
     * @param {number} cols - number of columns in the board
     */
    constructor(rows, cols) {
        this.rows = 4;
        this.cols = cols;

        /**  @type {Map<number, number[]>} Keys are cell indexes, values are arrays of possible next cell indexes */
        this.map = MovementCalculator.movementMap(rows, cols);
    }

    /** Static method that returns a map indicaintg the index of the next cell(s) on the board create board movement map 
     * @param {number} rows 
     * @param {number} cols
     * @return {Map<number, number[]>} Keys are cell indexes, values are arrays of possible next cell indexes
     * 
     * @throws {Error} if there are more than 4 rows.
    */
    static movementMap(rows, cols) {
        let flow = new Map();
        for (let i = 0; i < cols * rows; i++) {
            switch (Math.floor(i / cols)) {
                case 0:
                case 2:
                    flow.set(i, [i - 1]);
                    break;
                case 1:
                case 3:
                    flow.set(i, [i + 1]);
                    break;
                default:
                    console.error("Could not build movement map " + rows + ";" + cols);
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
   * @returns {number[]} Array of max length 2. Index 0 contains the normal snake path result. Index 1 contains the forked path.
   */
    calculateTarget(fromIndex, steps) {
        if (fromIndex == null || steps < 0 || steps > 6) {
            return [];
        }

        let result = new Array();
        this.#calculateTargetR(fromIndex, steps, result);
        return result;
    }

    /** 
     * Helper method for {@link MovementCalculator.calculateTarget()}
     * @param {number} fromIndex
     * @param {number} steps 
     * @param {number[]} result - Output storage
     *  
    */
    #calculateTargetR(fromIndex, steps, result) {
        if (steps < 0) {
            return;
        } else if (steps === 0) {
            result.push(fromIndex);
            return;
        } else {
            let arr = this.map.get(fromIndex);
            if (arr) { // Check if we received the next index.
                arr.forEach(cell => {
                    this.#calculateTargetR(cell, steps - 1, result);
                });
                return;
            }else{
                console.error(`Could not find index ${fromIndex} in map ${JSON.stringify(this.map)} `);
            }
        }
    }
}