/**
 * Authentication Manager - Server-specific login system
 * Login only happens after choosing a game mode (server)
 */
class AuthManager {
    constructor() {
        this.currentServer = null;
        this.credentials = this.loadCredentials();
        this.setupEventListeners();
        this.initNotificationSystem();
        this.init();
    }

    /**
     * Initialize the auth manager
     */
    init() {
        console.log('AuthManager initialized');
        
        // Update login button based on stored credentials
        this.updateLoginButton();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Tab switching
        document.querySelectorAll('.switch-to-register').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToRegister();
            });
        });

        document.querySelectorAll('.switch-to-login').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToLogin();
            });
        });

        // Close modal when clicking outside
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) {
                    this.closeAuthModal();
                }
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            const loginModal = document.getElementById('loginModal');
            if (e.key === 'Escape' && loginModal && !loginModal.classList.contains('hidden')) {
                this.closeAuthModal();
            }
        });

        // Login button in navbar
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavbarLoginClick();
            });
        }

        // Password validation
        const confirmPassword = document.getElementById('confirmPassword');
        const registerPassword = document.getElementById('registerPassword');
        
        if (confirmPassword && registerPassword) {
            confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
            registerPassword.addEventListener('input', () => this.validatePasswordMatch());
        }

        // Nickname validation
        const registerNick = document.getElementById('registerNick');
        if (registerNick) {
            registerNick.addEventListener('input', () => this.validateNickname());
        }
    }

    /**
     * Handle navbar login button click
     */
    handleNavbarLoginClick() {
        const loggedInServer = this.getLoggedInServer();
        
        if (loggedInServer) {
            // User is logged in to some server, ask which action
            this.showLogoutConfirmation(loggedInServer);
        } else {
            // User is not logged in, show info
            this.showNotification('Please select a game mode first to login to a specific server', 'info', 4000);
        }
    }

    /**
     * Show logout confirmation dialog
     */
    showLogoutConfirmation(serverKey) {
        const serverName = serverKey === 'official' ? 'Official Server' : 'Group Server';
        const nick = this.getCredentials(serverKey)?.nick || 'User';
        
        if (confirm(`You are logged into ${serverName} as ${nick}.\n\nDo you want to logout?`)) {
            this.logoutFromServer(serverKey);
        }
    }

    /**
     * Open auth modal for a specific server
     * @param {string} serverKey - 'official' or 'group'
     */
    openForServer(serverKey) {
        this.currentServer = serverKey;
        
        // Update ClientAPI to use this server
        if (window.ClientAPI) {
            window.ClientAPI.setServer(serverKey);
        }
        
        // Update UI with server info
        this.updateServerDisplay(serverKey);
        
        // Show modal with login tab
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
        }
        
        this.switchToLogin();
        
        // Try to pre-fill saved credentials
        this.prefillCredentials(serverKey);
    }

    /**
     * Update UI with server info
     */
    updateServerDisplay(serverKey) {
        const serverInfo = window.ClientAPI?.getServerInfo();
        
        if (serverInfo) {
            const serverName = serverKey === 'official' ? 'Official Server' : 'Group Server';
            
            // Update server display in auth modal if it exists
            const loginServerName = document.getElementById('loginServerName');
            const registerServerName = document.getElementById('registerServerName');
            
            if (loginServerName) loginServerName.textContent = serverName;
            if (registerServerName) registerServerName.textContent = serverName;
            
            // Update placeholders
            const loginNick = document.getElementById('loginNick');
            const registerNick = document.getElementById('registerNick');
            
            if (loginNick) loginNick.placeholder = `Your nickname on ${serverName}`;
            if (registerNick) registerNick.placeholder = `Choose a nickname for ${serverName}`;
        }
    }

    /**
     * Pre-fill saved credentials for current server
     */
    prefillCredentials(serverKey) {
        const creds = this.getCredentials(serverKey);
        const loginNick = document.getElementById('loginNick');
        
        if (loginNick && creds && creds.nick) {
            loginNick.value = creds.nick;
            // Don't pre-fill password for security
            const loginPassword = document.getElementById('loginPassword');
            if (loginPassword) loginPassword.focus();
        } else if (loginNick) {
            loginNick.value = '';
            loginNick.focus();
        }
    }

    /**
     * Handle login submission
     */
    async handleLogin() {
        const nick = document.getElementById('loginNick')?.value.trim() || '';
        const password = document.getElementById('loginPassword')?.value || '';
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');

        if (!this.validateLoginInputs(nick, password)) return;

        try {
            this.setLoading(submitBtn, true);
            
            if (!window.ClientAPI) {
                throw new Error('Client API not available');
            }

            // Use register endpoint for login (as per specification)
            await window.ClientAPI.register(nick, password);
            
            // Save credentials for this server
            this.saveCredentials(this.currentServer, nick, password);
            
            // Update UI
            this.updateLoginButton();
            
            // Show success and close modal
            this.showNotification(`Successfully logged into ${this.getServerName()}`, 'success', 3000);
            this.closeAuthModal();
            
            // Trigger event for other components
            this.triggerAuthEvent('login', { 
                server: this.currentServer, 
                nick: nick 
            });
            
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = this.getErrorMessage(error);
            this.showNotification(`Login failed: ${errorMessage}`, 'error', 5000);
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    /**
     * Handle register submission
     */
    async handleRegister() {
        const nick = document.getElementById('registerNick')?.value.trim() || '';
        const password = document.getElementById('registerPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');

        if (!this.validateRegisterInputs(nick, password, confirmPassword)) return;

        try {
            this.setLoading(submitBtn, true);
            
            if (!window.ClientAPI) {
                throw new Error('Client API not available');
            }

            // Register on current server
            await window.ClientAPI.register(nick, password);
            
            // Save credentials
            this.saveCredentials(this.currentServer, nick, password);
            
            // Update UI and show success
            this.updateLoginButton();
            this.showNotification(`Account created on ${this.getServerName()}! Welcome, ${nick}!`, 'success', 4000);
            
            // Switch back to login tab with pre-filled nick
            this.switchToLogin();
            const loginNick = document.getElementById('loginNick');
            const loginPassword = document.getElementById('loginPassword');
            
            if (loginNick) loginNick.value = nick;
            if (loginPassword) {
                loginPassword.value = '';
                loginPassword.focus();
            }
            
            // Trigger event
            this.triggerAuthEvent('register', { 
                server: this.currentServer, 
                nick: nick 
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = this.getErrorMessage(error);
            this.showNotification(`Registration failed: ${errorMessage}`, 'error', 5000);
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    /**
     * Validate login inputs
     */
    validateLoginInputs(nick, password) {
        if (!nick || !password) {
            this.showNotification('Please fill in all fields', 'warning', 3000);
            return false;
        }
        
        if (nick.length < 3 || nick.length > 20) {
            this.showNotification('Nickname must be 3-20 characters', 'warning', 3000);
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(nick)) {
            this.showNotification('Nickname can only contain letters, numbers, and underscore', 'warning', 3000);
            return false;
        }
        
        return true;
    }

    /**
     * Validate register inputs
     */
    validateRegisterInputs(nick, password, confirmPassword) {
        if (!nick || !password || !confirmPassword) {
            this.showNotification('Please fill in all fields', 'warning', 3000);
            return false;
        }
        
        if (nick.length < 3 || nick.length > 20) {
            this.showNotification('Nickname must be 3-20 characters', 'warning', 3000);
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(nick)) {
            this.showNotification('Nickname can only contain letters, numbers, and underscore', 'warning', 3000);
            return false;
        }
        
        if (password.length < 4) {
            this.showNotification('Password must be at least 4 characters', 'warning', 3000);
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'warning', 3000);
            return false;
        }
        
        return true;
    }

    /**
     * Validate password match in real-time
     */
    validatePasswordMatch() {
        const password = document.getElementById('registerPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;
        const errorElement = document.getElementById('passwordError');
        
        if (!errorElement) return;
        
        if (confirm && password !== confirm) {
            this.showError(errorElement, 'Passwords do not match');
        } else {
            this.hideError(errorElement);
        }
    }

    /**
     * Validate nickname format
     */
    validateNickname() {
        const nick = document.getElementById('registerNick')?.value;
        const errorElement = document.getElementById('nickError');
        
        if (!errorElement) return;
        
        if (nick && !/^[a-zA-Z0-9_]+$/.test(nick)) {
            this.showError(errorElement, 'Only letters, numbers, and underscore allowed');
        } else {
            this.hideError(errorElement);
        }
    }

    /**
     * Switch to login tab
     */
    switchToLogin() {
        const authTabPanes = document.querySelectorAll('.auth-tab-pane');
        authTabPanes.forEach(pane => pane.classList.remove('active'));
        
        const loginTab = document.getElementById('loginTab');
        if (loginTab) loginTab.classList.add('active');
        
        // Clear register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) registerForm.reset();
        
        this.clearFormErrors();
    }

    /**
     * Switch to register tab
     */
    switchToRegister() {
        const authTabPanes = document.querySelectorAll('.auth-tab-pane');
        authTabPanes.forEach(pane => pane.classList.remove('active'));
        
        const registerTab = document.getElementById('registerTab');
        if (registerTab) registerTab.classList.add('active');
        
        // Clear login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        
        this.clearFormErrors();
    }

    /**
     * Close auth modal
     */
    closeAuthModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        this.clearFormErrors();
        
        // Reset forms
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        
        // Always return to login tab when closing
        this.switchToLogin();
    }

    /**
     * Save credentials for a specific server
     */
    saveCredentials(server, nick, password) {
        if (!server || !nick || !password) return;
        
        const credentials = this.loadCredentials();
        
        // Store hash of password (not plain text) for security
        const passwordHash = btoa(password); // Simple base64 encoding
        
        credentials[server] = {
            nick: nick,
            passwordHash: passwordHash,
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem('serverCredentials', JSON.stringify(credentials));
        console.log(`Credentials saved for ${server} server`);
    }

    /**
     * Load all stored credentials
     */
    loadCredentials() {
        try {
            return JSON.parse(localStorage.getItem('serverCredentials') || '{}');
        } catch (e) {
            console.error('Error loading credentials:', e);
            return {};
        }
    }

    /**
     * Get credentials for a specific server
     */
    getCredentials(serverKey) {
        const credentials = this.loadCredentials();
        const serverCreds = credentials[serverKey];
        
        if (!serverCreds) return null;
        
        try {
            const password = atob(serverCreds.passwordHash);
            return {
                nick: serverCreds.nick,
                password: password,
                server: serverKey
            };
        } catch (e) {
            console.error('Error decoding password:', e);
            return null;
        }
    }

    /**
     * Check if user is logged in to a specific server
     */
    isLoggedInToServer(serverKey) {
        return !!this.getCredentials(serverKey);
    }

    /**
     * Get which server user is logged in to (if any)
     */
    getLoggedInServer() {
        const credentials = this.loadCredentials();
        for (const server in credentials) {
            if (credentials[server]) {
                return server;
            }
        }
        return null;
    }

    /**
     * Logout from a specific server
     */
    logoutFromServer(serverKey) {
        const credentials = this.loadCredentials();
        
        if (credentials[serverKey]) {
            const nick = credentials[serverKey].nick;
            delete credentials[serverKey];
            localStorage.setItem('serverCredentials', JSON.stringify(credentials));
            
            this.updateLoginButton();
            this.showNotification(`Logged out from ${serverKey === 'official' ? 'Official' : 'Group'} Server. Goodbye, ${nick}!`, 'info', 3000);
        }
    }

    /**
     * Update login button in navbar
     */
    updateLoginButton() {
        const loginBtn = document.getElementById('loginBtn');
        if (!loginBtn) return;
        
        const loggedInServer = this.getLoggedInServer();
        
        if (loggedInServer) {
            const creds = this.getCredentials(loggedInServer);
            const serverName = loggedInServer === 'official' ? 'Official' : 'Group';
            
            loginBtn.textContent = `Logout (${creds.nick} - ${serverName})`;
            loginBtn.title = `Logged into ${serverName} Server as ${creds.nick}. Click to logout.`;
        } else {
            loginBtn.textContent = 'Login';
            loginBtn.title = 'Select a game mode first to login to a specific server';
        }
    }

    /**
     * Get credentials for game play on current server
     */
    getGameCredentials(serverKey) {
        return this.getCredentials(serverKey);
    }

    /**
     * Get server display name
     */
    getServerName() {
        if (!this.currentServer) return 'Server';
        return this.currentServer === 'official' ? 'Official Server' : 'Group Server';
    }

    /**
     * Show error message
     */
    showError(element, message) {
        if (!element) return;
        element.textContent = message;
        element.classList.remove('hidden');
    }

    /**
     * Hide error message
     */
    hideError(element) {
        if (!element) return;
        element.textContent = '';
        element.classList.add('hidden');
    }

    /**
     * Clear all form errors
     */
    clearFormErrors() {
        document.querySelectorAll('.validation-error').forEach(error => {
            error.textContent = '';
            error.classList.add('hidden');
        });
    }

    /**
     * Set loading state for button
     */
    setLoading(button, isLoading) {
        if (!button) return;
        
        const originalText = button.textContent;
        
        if (isLoading) {
            button.disabled = true;
            button.textContent = 'Loading...';
            button.style.opacity = '0.7';
        } else {
            button.disabled = false;
            button.textContent = originalText.replace('Loading...', 
                button.closest('form').id === 'loginForm' ? 'Login' : 'Create Account');
            button.style.opacity = '1';
        }
    }

    /**
     * Extract user-friendly error message
     */
    getErrorMessage(error) {
        if (!error) return 'Unknown error occurred';
        
        const message = error.message || error.toString();
        
        // Map common server errors to user-friendly messages
        if (message.includes('User registered with a different password')) {
            return 'This nickname is already registered with a different password on this server';
        }
        if (message.includes('Resposta inválida JSON')) {
            return 'Invalid server response - server may be down';
        }
        if (message.includes('HTTP 400')) {
            return 'Invalid request format';
        }
        if (message.includes('HTTP 500')) {
            return 'Server error - please try again later';
        }
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return 'Network error - cannot connect to server';
        }
        if (message.includes('timed out') || message.includes('timeout')) {
            return 'Connection timeout - server may be busy';
        }
        
        return message;
    }

    /**
     * Trigger authentication event
     */
    triggerAuthEvent(type, detail) {
        const event = new CustomEvent(`auth:${type}`, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Initialize notification system
     */
    initNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
            
            // Add CSS for notifications
            const style = document.createElement('style');
            style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 300px;
                }
                
                .notification {
                    padding: 12px 16px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease-out;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 250px;
                }
                
                .notification.success {
                    background-color: #4CAF50;
                    border-left: 4px solid #2E7D32;
                }
                
                .notification.error {
                    background-color: #f44336;
                    border-left: 4px solid #c62828;
                }
                
                .notification.info {
                    background-color: #2196F3;
                    border-left: 4px solid #1565C0;
                }
                
                .notification.warning {
                    background-color: #FF9800;
                    border-left: 4px solid #EF6C00;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        if (!container) {
            // Fallback to alert if notification system not ready
            alert(`${type.toUpperCase()}: ${message}`);
            return null;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        notification.appendChild(messageSpan);
        notification.appendChild(closeBtn);
        container.appendChild(notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    this.removeNotification(notification);
                }
            }, duration);
        }
        
        return notification;
    }

    /**
     * Remove notification with animation
     */
    removeNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Initialize AuthManager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.AuthManager = new AuthManager();
});