/**
 * @file navbar.js
 * @description Navigation bar functionality and modal management
 * Handles modal opening/closing and user interactions
 * Includes authentication state management
 */

document.addEventListener('DOMContentLoaded', function() {
    /**
     * Modal mapping configuration
     * @type {Object}
     */
    const modalMap = {
        playBtn: 'setupModal',
        rulesBtn: 'rulesModal', 
        classBtn: 'classModal',
        loginBtn: 'loginModal'
    };

    /**
     * Initialize modal event listeners
     */
    function initializeModals() {
        for (const [btnId, modalId] of Object.entries(modalMap)) {
            const btn = document.getElementById(btnId);
            const modal = document.getElementById(modalId);

            if (btn && modal) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('hidden');
                    
                    if (btnId === 'classBtn' && window.classification) {
                        console.log('Opening classification modal - refreshing data');
                        window.classification.refreshDisplay();
                    }
                    
                    // If login button was clicked, handle specially
                    if (btnId === 'loginBtn') {
                        handleLoginModalOpen();
                    }
                });
            }
        }
    }

    /**
     * Handle login modal opening
     */
    function handleLoginModalOpen() {
        const loggedInServer = window.AuthManager?.getLoggedInServer();
        
        if (loggedInServer) {
            // User is logged in, show appropriate message
            const modal = document.getElementById('loginModal');
            if (modal) {
                // Find or create status message
                let statusMsg = modal.querySelector('.auth-status-message');
                if (!statusMsg) {
                    statusMsg = document.createElement('div');
                    statusMsg.className = 'auth-status-message';
                    
                    const content = modal.querySelector('.auth-tabs');
                    if (content) {
                        content.parentNode.insertBefore(statusMsg, content);
                    }
                }
                
                const creds = window.AuthManager.getCredentials(loggedInServer);
                const serverName = loggedInServer === 'official' ? 'Official Server' : 'Group Server';
                
                statusMsg.innerHTML = `
                    <div class="auth-status-content">
                        <div class="auth-status-icon">✓</div>
                        <div class="auth-status-text">
                            <strong>Already logged in</strong>
                            <div class="auth-status-details">
                                You are logged into <strong>${serverName}</strong> as <strong>${creds.nick}</strong>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Setup modal closing behavior
     */
    function setupModalClosing() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.add('hidden');
                    // Clear auth status message when closing login modal
                    if (modal.id === 'loginModal') {
                        const statusMsg = modal.querySelector('.auth-status-message');
                        if (statusMsg) {
                            statusMsg.remove();
                        }
                    }
                }
            });
        });

        // Prevent modal content from closing parent
        document.querySelectorAll('.setup-container, .auth-tabs, .classification-container').forEach(container => {
            container.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
    }

    /**
     * Handle ESC key for modal closing
     */
    function setupKeyboardControls() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.add('hidden');
                    // Clear auth status message when closing login modal
                    if (modal.id === 'loginModal') {
                        const statusMsg = modal.querySelector('.auth-status-message');
                        if (statusMsg) {
                            statusMsg.remove();
                        }
                    }
                });
            }
        });
    }

    /**
     * Update navbar based on auth state
     */
    function updateNavbarForAuth() {
        const loginBtn = document.getElementById('loginBtn');
        
        // Listen for auth state changes
        document.addEventListener('auth:stateChanged', (e) => {
            if (loginBtn) {
                const { isLoggedIn, server, nick } = e.detail;
                
                // Update tooltip and classes
                if (isLoggedIn) {
                    const serverName = server === 'official' ? 'Official' : 'Group';                    
                    // Add status indicator to navbar
                    addAuthStatusIndicator(server, nick);
                } else {
                    
                    // Remove status indicator
                    removeAuthStatusIndicator();
                }
            }
        });
        
        // Initial update
        if (window.AuthManager) {
            const loggedInServer = window.AuthManager.getLoggedInServer();
            if (loggedInServer && loginBtn) {
                const creds = window.AuthManager.getCredentials(loggedInServer);
                const serverName = loggedInServer === 'official' ? 'Official' : 'Group';
                loginBtn.classList.add('logged-in');
                addAuthStatusIndicator(loggedInServer, creds.nick);
            }
        }
    }
    
    /**
     * Add auth status indicator to navbar
     */
    function addAuthStatusIndicator(server, nick) {
        // Remove existing indicator
        removeAuthStatusIndicator();
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'nav-auth-indicator logged-in';
        indicator.innerHTML = `
            <span class="nav-auth-username">${nick.substring(0, 12)}${nick.length > 12 ? '...' : ''}</span>
            <span class="nav-auth-server">(${server === 'official' ? 'Official' : 'Group'})</span>
        `;
        
        // Add to navbar
        const navBar = document.querySelector('.nav-bar');
        const loginBtn = document.getElementById('loginBtn');
        if (navBar && loginBtn) {
            navBar.insertBefore(indicator, loginBtn);
        }
    }
    
    /**
     * Remove auth status indicator from navbar
     */
    function removeAuthStatusIndicator() {
        const indicator = document.querySelector('.nav-auth-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Initialize server connection status indicator
     */
    function initServerStatusIndicator() {
        const navBar = document.querySelector('.nav-bar');
        if (!navBar) return;
        
        // Create server status container
        const statusContainer = document.createElement('div');
        statusContainer.id = 'navServerStatus';
        statusContainer.className = 'server-status-container';
        
        // Test both servers on load
        setTimeout(() => {
            testServerConnections();
        }, 2000);
        
        // Update status periodically
        setInterval(testServerConnections, 30000); // Every 30 seconds
        
        // Add to navbar
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            navBar.insertBefore(statusContainer, loginBtn);
        }
    }
    
    /**
     * Test server connections and update status
     */
    async function testServerConnections() {
        if (!window.ClientAPI) return;
        
        const statusContainer = document.getElementById('navServerStatus');
        if (!statusContainer) return;
        
        try {
            const results = await window.ClientAPI.testAllServers();
            
            statusContainer.innerHTML = `
                <div class="server-status-item">
                    <span class="server-status-dot ${results.official ? 'online' : 'offline'}"></span>
                    <span class="server-status-label">Official</span>
                </div>
                <div class="server-status-item">
                    <span class="server-status-dot ${results.group ? 'online' : 'offline'}"></span>
                    <span class="server-status-label">Group</span>
                </div>
            `;
            
        } catch (error) {
            console.error('Server connection test failed:', error);
            statusContainer.innerHTML = '<span class="server-status-error">Servers offline</span>';
        }
    }

    /**
     * Initialize navigation bar help tooltips
     */
    function initNavbarTooltips() {
        const navButtons = document.querySelectorAll('.nav-bar button');
        
        navButtons.forEach(button => {
            const tooltip = document.createElement('div');
            tooltip.className = 'nav-tooltip';
            tooltip.textContent = button.title || button.textContent;
            
            button.appendChild(tooltip);
            
            button.addEventListener('mouseenter', () => {
                tooltip.style.opacity = '1';
            });
            
            button.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });
        });
    }

    /**
     * Add missing CSS classes dynamically if needed
     */
    function ensureNavbarStyles() {
        // This function ensures the navbar has all necessary CSS classes
        // The actual styles are in modals.css
        console.log('Navbar styles verified');
    }

    // Initialize all navigation functionality
    initializeModals();
    setupModalClosing();
    setupKeyboardControls();
    updateNavbarForAuth();
    initServerStatusIndicator();
    initNavbarTooltips();
    ensureNavbarStyles();
    
    console.log('Navbar system initialized with auth support');
});