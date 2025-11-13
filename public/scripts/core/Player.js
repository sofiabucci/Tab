//@ts-check
/** Player class
 *  Has function relevant for (soon to be implemented) User authentication and classification.
 */
export class Player {
    /**
     * @param {string} id - PlayerId.P1 or PlayerId.P2
     * @param {string} name - User chosen name
     * @param {string} password - Password value
     * @param {string} type - PlayerType value
     */
    constructor(id, name, password, type = Player.TYPE.HUMAN) {
        if (!Player.isValidId(id)) {
            console.error(`Invalid player ID: ${id}`);
        }
        if (!Player.isValidType(type)) {
            console.error(`Invalid player type: ${type}`);
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

    /** Player ID constant */
    static P1 = 'player-1';
    /** Player ID constant */
    static P2 = 'player-2';

    /**
     * Check if the given string is a valid player ID ({@link Player.P1} or {@link Player.P2})
     * @param {String} playerId
     * @returns {boolean}
     */
    static isValidId(playerId){
        return [this.P1, this.P2].includes(playerId);
    }

    /** Constant containing player types */
    static TYPE = {
        HUMAN: 'human',
        AI: 'ai'
    }

    /**
     * Checks if a given string is a valid {@link Player.TYPE}
     * @param {string} type - Type string to check
     * @returns {boolean} True if type is valid
     */
    static isValidType(type) {
        return Object.values(Player.TYPE).includes(type);
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
        return this.type !== Player.TYPE.HUMAN;
    }

}