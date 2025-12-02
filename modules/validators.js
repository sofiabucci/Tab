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
        const { group, nick, password, size } = data;
        
        if (group === undefined || !nick || !password || size === undefined) {
            return { valid: false, error: 'Todos os parâmetros são obrigatórios' };
        }
        
        if (typeof group !== 'number') {
            return { valid: false, error: 'Group deve ser número' };
        }
        
        if (typeof nick !== 'string') {
            return { valid: false, error: 'Nick deve ser string' };
        }
        
        if (typeof password !== 'string') {
            return { valid: false, error: 'Password deve ser string' };
        }
        
        if (typeof size !== 'number') {
            return { valid: false, error: 'Size deve ser número' };
        }
        
        if (size % 2 === 0 || size < 7 || size > 15) {
            return { valid: false, error: `Invalid size '${size}' - must be odd number between 7 and 15` };
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
        
        if (typeof cell !== 'number' || !Number.isInteger(cell)) {
            return { valid: false, error: 'cell is not an integer' };
        }
        
        if (cell < 0) {
            return { valid: false, error: 'cell is negative' };
        }
        
        return { valid: true };
    }
};