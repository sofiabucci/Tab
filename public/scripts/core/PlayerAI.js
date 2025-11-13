//@ts-check
import { Player } from "./Player.js";

/** PlayerAI class extends Player class. Serves as an AI controled player.
 *  (Not yet implemented).
 */
export class PlayerAI extends Player {
    /**
     * @param {string} id - PlayerId.P1 or PlayerId.P2  
     * @param {string} difficulty - 'easy', 'medium', 'hard'
     * @param {string|null} name - Optional AI name
     */
    constructor(id, difficulty = 'medium', name = null) {
        const aiName = name || `AI (${difficulty})`;

        super(id, aiName, '', Player.TYPE.AI);

        /** @type {string} AI difficulty level */
        this.difficulty = difficulty;
    }

    static DIFFICULTY = {
        EASY: 'easy',
        MEDIUM: 'medium',
        HARD: 'hard'
    }
}