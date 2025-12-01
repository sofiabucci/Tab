module.exports = {
    /**
     * Valida dados do registro
     */
    validateRegister: function(data) {
        const { nick, password } = data;
        
        if (!nick || !password) {
            return { valid: false, error: 'Nick e password são obrigatórios' };
        }
        
        if (typeof nick !== 'string' || nick.length < 3 || nick.length > 20) {
            return { valid: false, error: 'Nick deve ser string com 3-20 caracteres' };
        }
        
        if (typeof password !== 'string' || password.length < 6) {
            return { valid: false, error: 'Password deve ter pelo menos 6 caracteres' };
        }
        
        // Verificar caracteres válidos no nick
        if (!/^[a-zA-Z0-9_]+$/.test(nick)) {
            return { valid: false, error: 'Nick só pode conter letras, números e underscore' };
        }
        
        return { valid: true };
    },

    /**
     * Valida dados do join
     */
    validateJoin: function(data) {
        const { nick, password, size, game } = data;
        
        if (!nick || !password) {
            return { valid: false, error: 'Nick e password são obrigatórios' };
        }
        
        if (size && (typeof size !== 'number' || size < 2 || size > 4)) {
            return { valid: false, error: 'Size deve ser número entre 2 e 4' };
        }
        
        if (game && typeof game !== 'string') {
            return { valid: false, error: 'Game deve ser string' };
        }
        
        return { valid: true };
    },

    /**
     * Valida autenticação básica (nick + password)
     */
    validateAuth: function(data) {
        const { nick, password } = data;
        
        if (!nick || !password) {
            return { valid: false, error: 'Nick e password são obrigatórios' };
        }
        
        if (typeof nick !== 'string' || typeof password !== 'string') {
            return { valid: false, error: 'Nick e password devem ser strings' };
        }
        
        return { valid: true };
    },

    /**
     * Valida dados do notify
     */
    validateNotify: function(data) {
        const { nick, password, game, cell } = data;
        
        if (!nick || !password || !game || cell === undefined) {
            return { valid: false, error: 'Todos os parâmetros são obrigatórios' };
        }
        
        if (typeof cell !== 'number' || cell < 0 || cell > 63) {
            return { valid: false, error: 'Cell deve ser número entre 0 e 63' };
        }
        
        return { valid: true };
    },

    /**
     * Valida dados do roll/pass
     */
    validateGameAction: function(data) {
        const { nick, password, game } = data;
        
        if (!nick || !password || !game) {
            return { valid: false, error: 'Nick, password e game são obrigatórios' };
        }
        
        return { valid: true };
    }
};