export class PlayerId {
    static P1 = 'player-1';
    static P2 = 'player-2';

    static TYPE = {
        HUMAN: 'human',
        AI: 'ai'
    }
}

export class Player {
    /**
     * @param {string} id - PlayerId.P1 or PlayerId.P2
     * @param {string} name - User chosen name
     * @param {string} password - Password value
     * @param {string} type - PlayerType value
     */
    constructor(id, name, password, type = PlayerId.TYPE.HUMAN) {
        if (!PlayerId.isValid(id)) {
            throw new Error(`Invalid player ID: ${id}`);
        }
        if (!PlayerType.isValid(type)) {
            throw new Error(`Invalid player type: ${type}`);
        }

        /** @type {string} */
        this.id = id;

        /** @type {string} User chosen name */
        this.name = name;

        // FIXME: password needs to be secured
        /** @type {string} User chosen password */
        this.password = password;
        
        /** @type {string} A PlayerType value */
        this.type = type;

        /** @type {number} Player score */
        this.score = 0;

        /** @type {boolean} Whether player is ready to start */
        this.ready = false;
    }

    /**
     * Increment player score
     * @param {number} points - Points to add
     */
    addScore(points = 1) {
        this.score += points;
    }

    /**
     * Check if player is AI
     * @returns {boolean} True if player is AI
     */
    isAI() {
        return this.type !== PlayerId.TYPE.HUMAN;
    }

}

export class PlayerAI extends Player {
    /**
     * @param {string} id - PlayerId.P1 or PlayerId.P2  
     * @param {string} difficulty - 'easy', 'medium', 'hard'
     * @param {string} name - Optional AI name
     */
    constructor(id, difficulty = 'medium', name = null) {
        const aiType = `ai-${difficulty}`;
        const aiName = name || `AI (${difficulty})`;
        
        super(id, aiName, '', aiType);
        
        /** @type {string} AI difficulty level */
        this.difficulty = difficulty;
    }

    static DIFFICULTY = {
        EASY:   'easy',
        MEDIUM: 'medium',
        HARD:   'hard'
    }
}