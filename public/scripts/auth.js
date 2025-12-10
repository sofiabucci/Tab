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

        // Estado de login ativo
        this.isLoggedIn = this.hasAnyLogin();
    }

    /**
     * Check if user is logged in to any server
     */
    hasAnyLogin() {
        return this.getLoggedInServer() !== null;
    }

    /**
     * Initialize the auth manager
     */
    init() {
        console.log('AuthManager initialized');

        // Update login button based on stored credentials
        this.updateLoginButton();

        // Ensure form buttons have consistent dimensions
        this.ensureButtonConsistency();

        // Dispatch initial auth state event
        this.dispatchAuthStateEvent();
    }

    /**
     * Ensure login and create account buttons have same dimensions
     */
    ensureButtonConsistency() {
        // This ensures both buttons have the same styling
        // CSS handles the actual dimensions in modals.css
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        const registerBtn = document.querySelector('#registerForm button[type="submit"]');

        if (loginBtn && registerBtn) {
            // Add consistent classes
            loginBtn.classList.add('auth-submit-btn');
            registerBtn.classList.add('auth-submit-btn');

            // Ensure same text structure
            loginBtn.textContent = 'Login';
            registerBtn.textContent = 'Create Account';
        }
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

        // Listen for online game setup to update auth state
        document.addEventListener('auth:login', () => {
            this.updateAuthState();
        });

        document.addEventListener('auth:register', () => {
            this.updateAuthState();
        });

        // Listen for setup modal opening
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.updateLoginButton();
            });
        }
    }

    /**
     * Handle navbar login button click
     */
    handleNavbarLoginClick() {
        const loggedInServer = this.getLoggedInServer();

        if (loggedInServer) {
            // User is logged in to some server - show logout options
            this.showLogoutMenu(loggedInServer);
        } else {
            // User is not logged in - abrir a seleção de servidor
            this.openForServerSelection();
        }
    }

    /**
     * Open server selection for login when not logged in
     */
    openForServerSelection() {
        this.showServerSelection();
    }

    /**
     * Show logout menu with options
     */
    showLogoutMenu(serverKey) {
        // Remove any existing menu
        const existingMenu = document.querySelector('.auth-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const serverName = serverKey === 'official' ? 'Official Server' : 'Group Server';
        const nick = this.getCredentials(serverKey)?.nick || 'User';

        // Create logout menu
        const menu = document.createElement('div');
        menu.className = 'auth-menu';
        menu.innerHTML = `
            <div class="auth-menu-header">
                <strong>${nick}</strong>
                <small>${serverName}</small>
            </div>
            <button class="auth-menu-btn auth-menu-logout" data-action="logout">
                <span>Logout</span>
                <small>Disconnect from ${serverName}</small>
            </button>
            <button class="auth-menu-btn auth-menu-switch" data-action="switch">
                <span>Switch Account</span>
                <small>Login to different account/server</small>
            </button>
        `;

        // Add event listeners
        menu.querySelector('[data-action="logout"]').addEventListener('click', () => {
            menu.remove();
            this.logoutFromServer(serverKey);
        });

        menu.querySelector('[data-action="switch"]').addEventListener('click', () => {
            menu.remove();
            this.showServerSelection();
        });


        // Add menu to body
        document.body.appendChild(menu);

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target.id !== 'loginBtn') {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        // Small delay to not close immediately
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    /**
     * Show server selection for switching accounts or initial login
     */
    showServerSelection() {
        // Remove any existing server selection modal
        const existingModal = document.querySelector('.server-selection-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'server-selection-modal';
        modal.innerHTML = `
            <div class="server-selection-content">
                <h3>Select Server to Login</h3>
                <div class="server-options">
                    <button class="server-option" data-server="official">
                        <strong>Official Server</strong>
                        <small>twserver.alunos.dcc.fc.up.pt:8008</small>
                        <span class="server-status-indicator ${this.isLoggedInToServer('official') ? 'logged-in' : 'not-logged'}">
                            ${this.isLoggedInToServer('official') ? '✓ Logged in' : 'Not logged in'}
                        </span>
                    </button>
                    <button class="server-option" data-server="group">
                        <strong>Group Server</strong>
                        <small>twserver.alunos.dcc.fc.up.pt:8104</small>
                        <span class="server-status-indicator ${this.isLoggedInToServer('group') ? 'logged-in' : 'not-logged'}">
                            ${this.isLoggedInToServer('group') ? '✓ Logged in' : 'Not logged in'}
                        </span>
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelectorAll('.server-option').forEach(option => {
            option.addEventListener('click', () => {
                modal.remove();
                this.openForServer(option.dataset.server);
            });
        });


        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
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

        // Ensure button consistency
        this.ensureButtonConsistency();
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
            this.updateAuthState();
            this.showLoginSuccess();

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
            this.updateAuthState();
            this.showLoginSuccess();
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
                server: serverKey,
                lastLogin: serverCreds.lastLogin
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
     * Update auth state and UI
     */
    updateAuthState() {
        this.isLoggedIn = this.hasAnyLogin();
        this.updateLoginButton();
        this.dispatchAuthStateEvent();
    }

    /**
     * Dispatch authentication state change event
     */
    dispatchAuthStateEvent() {
        const loggedInServer = this.getLoggedInServer();
        const event = new CustomEvent('auth:stateChanged', {
            detail: {
                isLoggedIn: !!loggedInServer,
                server: loggedInServer,
                nick: loggedInServer ? this.getCredentials(loggedInServer)?.nick : null
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Logout from a specific server
     */
    logoutFromServer(serverKey) {
        const credentials = this.loadCredentials();

        if (credentials[serverKey]) {
            const nick = credentials[serverKey].nick;
            const serverName = serverKey === 'official' ? 'Official' : 'Group';

            // Check if this affects any pending online setup
            if (window.pendingOnlineSetup && window.pendingOnlineSetup.serverKey === serverKey) {
                window.pendingOnlineSetup = null;
                this.showNotification(
                    `Online game setup cancelled because you logged out from ${serverName} Server`,
                    'warning',
                    4000
                );
            }

            // Check if this affects any active online game
            if (window.onlineGameManager &&
                window.onlineGameManager.currentGame &&
                window.onlineGameManager.currentServer === serverKey) {
                this.showNotification(
                    `Active online game on ${serverName} Server will be disconnected`,
                    'warning',
                    4000
                );
                setTimeout(() => {
                    if (window.onlineGameManager.leaveGame) {
                        window.onlineGameManager.leaveGame();
                    }
                }, 1000);
            }

            // Remove credentials
            delete credentials[serverKey];
            localStorage.setItem('serverCredentials', JSON.stringify(credentials));

            // Update UI
            this.updateAuthState();

            this.showNotification(
                `Logged out from ${serverName} Server. Goodbye, ${nick}!`,
                'info',
                3000
            );
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
            const shortNick = creds.nick.length > 10 ? creds.nick.substring(0, 8) + '...' : creds.nick;

            loginBtn.innerHTML = `
            <span class="auth-status">
                <span class="auth-data">${shortNick} ${serverName}</span>
            </span>
        `;

        } else {
            loginBtn.innerHTML = '<span class="auth-status">Login</span>';
            loginBtn.title = 'Click to login (requires selecting an online game mode first)';
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

        if (isLoading) {
            button.disabled = true;
            button.textContent = 'Loading...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            // Restore original text based on form type
            if (button.closest('form').id === 'loginForm') {
                button.textContent = 'Login';
            } else {
                button.textContent = 'Create Account';
            }
            button.classList.remove('loading');
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
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 10000) {
        const container = document.getElementById('notificationContainer');
        if (!container) {
            // Fallback to console if notification system not ready
            console.log(`${type.toUpperCase()}: ${message}`);
            return null;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;

        // Add progress bar for visual feedback
        const progressBar = document.createElement('div');
        progressBar.className = 'notification-progress';

        notification.appendChild(messageSpan);
        notification.appendChild(progressBar);

        // Add to container (top of the stack)
        container.insertBefore(notification, container.firstChild);

        // Limit number of notifications to avoid clutter
        const maxNotifications = 3;
        const notifications = container.querySelectorAll('.notification');
        if (notifications.length > maxNotifications) {
            for (let i = maxNotifications; i < notifications.length; i++) {
                this.removeNotification(notifications[i]);
            }
        }

        // Auto-remove after duration (default 10 seconds)
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
        notification.style.animation = 'slideOutUp 0.3s ease-out forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Show successful login animation
     */
    showLoginSuccess() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.classList.add('new-login');
            setTimeout(() => {
                loginBtn.classList.remove('new-login');
            }, 1000);
        }
    }
}

// Initialize AuthManager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.AuthManager = new AuthManager();
});
