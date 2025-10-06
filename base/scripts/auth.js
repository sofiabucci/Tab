const API_URL = 'http://twserver.alunos.dcc.fc.up.pt:8008';

const authService = {
    // Local storage management
    isAuthenticated() {
        return sessionStorage.getItem('isAuthenticated') === 'true';
    },

    clearAuth() {
        sessionStorage.removeItem('isAuthenticated');
    },

    setAuth(value) {
        sessionStorage.setItem('isAuthenticated', value);
    },

    setNickname(value) {
        sessionStorage.setItem('nickname', value);
    },

    setPassword(value) {
        sessionStorage.setItem('password', value);
    },

    // API calls
    async register(nick, password) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                body: JSON.stringify({ nick, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed');
            }
            
            this.setNickname(nick);
            this.setPassword(password);
            return await response.json();
        } catch (error) {
            throw error;
        }
    }
};

export {authService}