const crypto = require('crypto');

const SALT = process.env.SALT || 'tab_game_group_4_salt_2024';

module.exports = {
    /**
     * Hash uma password usando SHA-256
     */
    hashPassword: function(password) {
        return crypto
            .createHash('sha256')
            .update(password + SALT)
            .digest('hex');
    },

    /**
     * Verifica se uma password corresponde ao hash
     */
    verifyPassword: function(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    },

    /**
     * Gera um ID único para um jogo usando SHA-256
     */
    generateGameId: function(data = {}) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 15);
        const value = timestamp + random + JSON.stringify(data);
        
        return crypto
            .createHash('sha256')
            .update(value)
            .digest('hex')
            .substring(0, 16); // 16 caracteres
    }
};