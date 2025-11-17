/**
 * Authentication modal functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
            switchAuthTab('login');
            clearFormErrors();
        });
    }

    // Close modal when clicking outside
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            closeAuthModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !loginModal.classList.contains('hidden')) {
            closeAuthModal();
        }
    });

    setupAuthTabs();
    setupAuthForms();
    setupInputValidation();
    
    // Initialize notification system
    initNotificationSystem();
});

/**
 * Initialize notification system
 */
function initNotificationSystem() {
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
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });
    
    notification.appendChild(messageSpan);
    notification.appendChild(closeBtn);
    container.appendChild(notification);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                removeNotification(notification);
            }
        }, duration);
    }
    
    return notification;
}

/**
 * Remove notification with animation
 */
function removeNotification(notification) {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

/**
 * Setup authentication tab switching
 */
function setupAuthTabs() {
    // Switch between login/register links
    document.querySelectorAll('.switch-to-register').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('register');
            clearFormErrors();
        });
    });

    document.querySelectorAll('.switch-to-login').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('login');
            clearFormErrors();
        });
    });
}

/**
 * Switch authentication tab
 */
function switchAuthTab(tab) {
    const authTabPanes = document.querySelectorAll('.auth-tab-pane');

    // Show target tab pane
    authTabPanes.forEach(pane => pane.classList.remove('active'));
    const targetPane = document.getElementById(`${tab}Tab`);
    if (targetPane) targetPane.classList.add('active');

    // Clear forms when switching manually (not on automatic return from registration)
    if (tab === 'register') {
        document.getElementById('registerForm')?.reset();
    }
}

/**
 * Setup authentication form submissions
 */
function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleRegister();
        });
    }
}

/**
 * Setup real-time input validation
 */
function setupInputValidation() {
    const confirmPassword = document.getElementById('confirmPassword');
    const registerPassword = document.getElementById('registerPassword');
    
    if (confirmPassword && registerPassword) {
        confirmPassword.addEventListener('input', validatePasswordMatch);
        registerPassword.addEventListener('input', validatePasswordMatch);
    }

    // Nickname validation
    const registerNick = document.getElementById('registerNick');
    if (registerNick) {
        registerNick.addEventListener('input', validateNickname);
    }
}

/**
 * Validate password match in real-time
 */
function validatePasswordMatch() {
    const password = document.getElementById('registerPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    const errorElement = document.getElementById('passwordError');
    
    if (!errorElement) return;
    
    if (confirm && password !== confirm) {
        showError(errorElement, 'Passwords do not match');
    } else {
        hideError(errorElement);
    }
}

/**
 * Validate nickname format
 */
function validateNickname() {
    const nick = document.getElementById('registerNick')?.value;
    const errorElement = document.getElementById('nickError');
    
    if (!errorElement) return;
    
    if (nick && !/^[a-zA-Z0-9_]+$/.test(nick)) {
        showError(errorElement, 'Nickname can only contain letters, numbers, and underscores');
    } else {
        hideError(errorElement);
    }
}

/**
 * Handle login form submission
 */
async function handleLogin() {
    const nick = document.getElementById('loginNick').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');

    if (!validateLoginInputs(nick, password)) return;

    try {
        setLoadingState(submitBtn, true);
        showNotification('Connecting to server...', 'info', 3000);
        
        // Test credentials using ServerAPI register (which verifies password)
        if (window.ServerAPI) {
            await window.ServerAPI.register(nick, password);
            
            // Save credentials for online play
            if (window.onlineGameManager) {
                window.onlineGameManager.savePlayerCredentials(nick, password);
            }
            
            showNotification('Login successful! You can now play online games.', 'success', 5000);
            closeAuthModal();
            
            // Update UI to show logged in state
            updateLoginUI(true, nick);
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = getErrorMessage(error);
        showNotification(`Login failed: ${errorMessage}`, 'error', 6000);
    } finally {
        setLoadingState(submitBtn, false);
    }
}

/**
 * Handle register form submission
 */
async function handleRegister() {
    const nick = document.getElementById('registerNick').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');

    if (!validateRegisterInputs(nick, password, confirmPassword)) return;

    try {
        setLoadingState(submitBtn, true);
        showNotification('Creating your account...', 'info', 3000);
        
        if (window.ServerAPI) {
            // Use ServerAPI for registration
            await window.ServerAPI.register(nick, password);
            
            // Save credentials for online play
            if (window.onlineGameManager) {
                window.onlineGameManager.savePlayerCredentials(nick, password);
            }
            
            showNotification('Registration successful! You can now login.', 'success', 5000);
            
            // Switch to login tab after successful registration
            switchAuthTab('login');
            
            // Pre-fill login form with registered credentials
            document.getElementById('loginNick').value = nick;
            document.getElementById('loginPassword').value = '';
            
            // Clear register form
            document.getElementById('registerForm').reset();
            clearFormErrors();
            
            // Update UI to show logged in state
            updateLoginUI(true, nick);
        }
    } catch (error) {
        console.error('Registration error:', error);
        const errorMessage = getErrorMessage(error);
        showNotification(`Registration failed: ${errorMessage}`, 'error', 6000);
    } finally {
        setLoadingState(submitBtn, false);
    }
}

/**
 * Extract user-friendly error message from server response
 */
function getErrorMessage(error) {
    if (!error) return 'Unknown error occurred';
    
    const message = error.message || error.toString();
    
    // Map common server errors to user-friendly messages
    if (message.includes('User registered with a different password')) {
        return 'This nickname is already registered with a different password';
    }
    if (message.includes('HTTP 400')) {
        return 'Invalid request - please check your input';
    }
    if (message.includes('HTTP 500')) {
        return 'Server error - please try again later';
    }
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return 'Network error - please check your connection';
    }
    if (message.includes('Resposta inválida JSON')) {
        return 'Invalid server response';
    }
    
    return message;
}

/**
 * Validate login inputs
 */
function validateLoginInputs(nick, password) {
    if (!nick || !password) {
        showNotification('Please fill in all fields', 'warning', 4000);
        return false;
    }
    if (nick.length > 20) {
        showNotification('Nickname must be 20 characters or less', 'warning', 4000);
        return false;
    }
    return true;
}

/**
 * Validate register inputs
 */
function validateRegisterInputs(nick, password, confirmPassword) {
    if (!nick || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'warning', 4000);
        return false;
    }
    
    if (nick.length > 20) {
        showNotification('Nickname must be 20 characters or less', 'warning', 4000);
        return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(nick)) {
        showNotification('Nickname can only contain letters, numbers, and underscores', 'warning', 4000);
        return false;
    }
    
    if (password.length < 4) {
        showNotification('Password must be at least 4 characters long', 'warning', 4000);
        return false;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'warning', 4000);
        return false;
    }
    
    return true;
}

/**
 * Update UI based on login state
 */
function updateLoginUI(isLoggedIn, nick = '') {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        if (isLoggedIn) {
            loginBtn.textContent = `Logout (${nick})`;
            loginBtn.title = `Click to logout from ${nick}`;
            // Change click handler to logout
            loginBtn.onclick = handleLogout;
            showNotification(`Welcome back, ${nick}!`, 'success', 3000);
        } else {
            loginBtn.textContent = 'Login';
            loginBtn.title = 'Click to login or register';
            // Restore original click handler
            loginBtn.onclick = () => {
                document.getElementById('loginModal').classList.remove('hidden');
                switchAuthTab('login');
                clearFormErrors();
            };
        }
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    const currentUser = getCurrentUser();
    if (window.onlineGameManager) {
        window.onlineGameManager.clearPlayerCredentials();
    }
    updateLoginUI(false);
    showNotification(`Goodbye, ${currentUser.nick}! You have been logged out.`, 'info', 4000);
}

/**
 * Utility functions
 */
function setLoadingState(button, isLoading) {
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

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideError(element) {
    if (!element) return;
    element.textContent = '';
    element.classList.add('hidden');
}

function clearFormErrors() {
    document.querySelectorAll('.validation-error').forEach(error => {
        error.textContent = '';
        error.classList.add('hidden');
    });
}

function closeAuthModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('hidden');
    clearFormErrors();
    
    // Reset forms
    document.getElementById('loginForm')?.reset();
    document.getElementById('registerForm')?.reset();
    
    // Always return to login tab when closing
    switchAuthTab('login');
}

/**
 * Check if user is logged in
 */
function isUserLoggedIn() {
    return window.onlineGameManager && 
           window.onlineGameManager.getPlayerCredentials().nick !== '';
}

/**
 * Get current user credentials
 */
function getCurrentUser() {
    if (window.onlineGameManager) {
        return window.onlineGameManager.getPlayerCredentials();
    }
    return { nick: '', password: '' };
}

/**
 * Test function to verify ServerAPI connection
 */
async function testServerConnection() {
    if (!window.ServerAPI) {
        console.error('ServerAPI not loaded');
        showNotification('Server API not available', 'error', 4000);
        return false;
    }
    
    try {
        showNotification('Testing server connection...', 'info', 2000);
        // Try to get ranking as a test (doesn't require authentication)
        await window.ServerAPI.getRanking(10);
        showNotification('Server connection successful!', 'success', 3000);
        return true;
    } catch (error) {
        console.error('Server connection test failed:', error);
        showNotification('Server connection failed', 'error', 4000);
        return false;
    }
}

// Export functions for use in other modules
window.AuthManager = {
    isUserLoggedIn,
    getCurrentUser,
    testServerConnection,
    updateLoginUI,
    handleLogout,
    showNotification,
    getErrorMessage
};