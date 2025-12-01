const crypto = require('crypto');

const SALT = process.env.SALT || 'ludo_game_salt_2024';

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
     * Gera um ID único para um jogo usando MD5
     */
    generateGameId: function(data = {}) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2);
        const value = timestamp + random + JSON.stringify(data);
        
        return crypto
            .createHash('md5')
            .update(value)
            .digest('hex')
            .substring(0, 16); // 16 caracteres são suficientes
    },

    /**
     * Gera um token simples (opcional para futuras funcionalidades)
     */
    generateToken: function(userId) {
        return crypto
            .createHash('md5')
            .update(userId + Date.now().toString() + SALT)
            .digest('hex');
    }
};