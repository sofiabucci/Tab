/**
 * @file setup.js
 * @description Game setup and configuration management
 * Handles game mode selection, difficulty settings, and board initialization
 * Updated to support both official server and group server
 */

document.addEventListener('DOMContentLoaded', function() {
    /** @type {HTMLFormElement} */
    const setupForm = document.getElementById('setupForm');
    
    /** @type {HTMLElement} */
    const setupModal = document.getElementById('setupModal');
    
    /** @type {HTMLButtonElement} */
    const setupReset = document.getElementById('setupReset');
    
    /** @type {HTMLSelectElement} */
    const gameModeSelect = document.getElementById('gameMode');
    
    /** @type {HTMLElement} */
    const difficultyGroup = document.getElementById('difficultyGroup');
    
    /** @type {HTMLElement} */
    const player2Label = document.getElementById('player2Label');

    /** @type {HTMLElement} */
    const serverInfoGroup = document.getElementById('serverInfoGroup');

    // Store setup data for after login
    window.pendingOnlineSetup = null;

    /**
     * Update UI based on selected game mode
     */
    function handleGameModeChange() {
        if (!gameModeSelect) return;

        const mode = gameModeSelect.value;
        
        // Show/hide difficulty for AI mode
        if (difficultyGroup) {
            difficultyGroup.style.display = (mode === 'pvc') ? 'flex' : 'none';
        }
        
        // Update player 2 label
        if (player2Label) {
            switch (mode) {
                case 'pvc':
                    player2Label.textContent = 'AI (Maroon)';
                    break;
                case 'pvpOS':
                    player2Label.textContent = 'Online Player (Official Server)';
                    break;
                case 'pvpGS':
                    player2Label.textContent = 'Online Player (Group Server)';
                    break;
                case 'pvpLocal':
                default:
                    player2Label.textContent = 'Player 2 (Maroon)';
            }
        }
        
        // Show server info for online modes
        if (serverInfoGroup) {
            if (mode === 'pvpOS' || mode === 'pvpGS') {
                serverInfoGroup.style.display = 'block';
                
                // Update server info text
                const serverInfo = document.getElementById('serverInfoText');
                if (serverInfo) {
                    const serverUrl = mode === 'pvpOS' 
                        ? 'twserver.alunos.dcc.fc.up.pt:8008'
                        : 'twserver.alunos.dcc.fc.up.pt:8104';
                    
                    serverInfo.textContent = `Server: ${serverUrl}`;
                    serverInfo.className = mode === 'pvpOS' 
                        ? 'server-info official' 
                        : 'server-info group';
                }
            } else {
                serverInfoGroup.style.display = 'none';
            }
        }
        
        // Log mode change
        console.log('Game mode changed to:', mode);
    }

    /**
     * Handle game setup form submission
     * @param {Event} e - Form submit event
     */
    async function handleSetupSubmit(e) {
        e.preventDefault();

        const mode = gameModeSelect.value;
        const difficulty = document.getElementById('difficulty').value;
        const columns = parseInt(document.getElementById('boardSize').value);
        const firstPlayer = document.getElementById('firstPlayerSelect').value;

        console.log('Starting game with settings:', {
            mode, difficulty, columns, firstPlayer
        });

        // ONLINE GAMES - Check login first
        if (mode === 'pvpOS' || mode === 'pvpGS') {
            const serverKey = mode === 'pvpOS' ? 'official' : 'group';
            const serverName = mode === 'pvpOS' ? 'Official Server' : 'Group Server';
            
            // Check if user is already logged in to this server
            if (window.AuthManager && window.AuthManager.isLoggedInToServer(serverKey)) {
                // User is logged in, start game directly
                startOnlineGame(serverKey, columns, firstPlayer);
            } else {
                // User needs to login, store setup data and show auth modal
                window.pendingOnlineSetup = {
                    serverKey: serverKey,
                    serverName: serverName,
                    columns: columns,
                    firstPlayer: firstPlayer,
                    mode: mode
                };
                
                // Close setup modal
                closeSetupModal();
                
                // Open auth modal for this specific server
                if (window.AuthManager) {
                    window.AuthManager.openForServer(serverKey);
                } else {
                    // Fallback: show login modal directly
                    document.getElementById('loginModal').classList.remove('hidden');
                    showNotification(`Please login to ${serverName} to play online`, 'info', 5000);
                }
            }
            return;
        }

        // LOCAL GAMES - pvpLocal or pvc
        startLocalGame(mode, difficulty, columns, firstPlayer);
    }

    /**
     * Start online game after successful login
     */
    async function startOnlineGame(serverKey, columns, firstPlayer) {
        try {
            // Configure online manager based on selected server
            const serverName = serverKey === 'official' ? 'Official Server' : 'Group Server';
            
            if (window.onlineGameManager) {
                // Switch to correct server using ClientAPI
                const switched = window.onlineGameManager.switchServer(serverKey);
                if (!switched) {
                    throw new Error(`Could not switch to server: ${serverKey}`);
                }
                
                console.log(`Using ${serverName} via ClientAPI`);
                
                // Start online game
                const success = await window.onlineGameManager.startOnlineGame(columns, firstPlayer);
                if (success) {
                    // Show connection status
                    showServerStatus(serverName, true);
                } else {
                    showServerStatus(serverName, false);
                }
            } else {
                throw new Error('Online game manager not available');
            }
        } catch (error) {
            console.error('Failed to start online game:', error);
            showNotification(`Failed to connect to server: ${error.message}`, 'error', 5000);
            
            // Re-open setup modal to try again
            document.getElementById('setupModal').classList.remove('hidden');
        }
    }

    /**
     * Start local game
     */
    function startLocalGame(mode, difficulty, columns, firstPlayer) {
        updatePlayerLabels(mode);

        const normalizedFirst = (firstPlayer === 'player2' || firstPlayer === 'player-2') 
            ? 'player-2' 
            : 'player-1';
        
        // Map pvpLocal to pvp for internal use
        const internalMode = mode === 'pvpLocal' ? 'pvp' : mode;
        
        const options = {
            mode: internalMode,
            difficulty: mode === 'pvc' ? (difficulty || 'medium') : undefined,
            firstPlayer: normalizedFirst
        };

        initializeGameBoard(columns, options);
        closeSetupModal();

        console.log('Local game started with options:', options);
    }

    /**
     * Resume pending online setup after successful login
     */
    function resumeOnlineSetup() {
        if (!window.pendingOnlineSetup) return;
        
        const { serverKey, columns, firstPlayer } = window.pendingOnlineSetup;
        
        // Clear pending setup
        window.pendingOnlineSetup = null;
        
        // Start the game
        startOnlineGame(serverKey, columns, firstPlayer);
    }

    /**
     * Show server connection status
     */
    function showServerStatus(serverType, connected) {
        const statusElement = document.getElementById('serverStatus');
        if (!statusElement) return;
        
        statusElement.style.display = 'block';
        statusElement.textContent = connected 
            ? `✅ Connected to ${serverType}` 
            : `❌ Failed to connect to ${serverType}`;
        statusElement.className = connected ? 'status-success' : 'status-error';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    /**
     * Update player labels based on game mode
     * @param {string} mode - Game mode
     */
    function updatePlayerLabels(mode) {
        if (!player2Label) return;

        const labels = {
            'pvc': 'AI (Maroon)',
            'pvpOS': 'Online Player (Official Server)',
            'pvpGS': 'Online Player (Group Server)',
            'pvpLocal': 'Player 2 (Maroon)'
        };

        player2Label.textContent = labels[mode] || labels.pvpLocal;
    }

    /**
     * Initialize the game board with specified options
     * @param {number} columns - Number of board columns
     * @param {Object} options - Game configuration options
     */
    function initializeGameBoard(columns, options) {
        // Clear any existing game
        if (window.game && window.game.stopGameUpdates) {
            window.game.stopGameUpdates();
        }
        
        // Reset dice state
        if (window.resetStickDice) {
            window.resetStickDice();
        }
        
        // Set game start time for classification
        const gameStartTime = Date.now();
        
        if (typeof generateBoard === 'function') {
            const gameBoard = generateBoard(columns, options);
            
            // Set game start time
            gameBoard.gameStartTime = gameStartTime;
            
            // Store reference globally
            window.game = gameBoard;
            
            // Trigger AI start if applicable
            if (options.mode === 'pvc' && options.firstPlayer === 'player-2') {
                setTimeout(() => {
                    if (gameBoard.isAITurn()) {
                        gameBoard.triggerAIRoll();
                    }
                }, 1500);
            }
            
            console.log('Local game board initialized:', gameBoard);
            
        } else if (window.GameBoard) {
            // Fallback initialization
            const parent = document.getElementById('board-container');
            if (parent) {
                parent.innerHTML = '';
                const gameBoard = new GameBoard('board-container', columns, options);
                gameBoard.gameStartTime = gameStartTime;
                window.game = gameBoard;
            }
        }
    }

    /**
     * Close setup modal
     */
    function closeSetupModal() {
        if (setupModal) {
            setupModal.classList.add('hidden');
        }
    }

    /**
     * Reset setup form to default values
     */
    function resetSetupForm() {
        if (setupForm) setupForm.reset();
        if (player2Label) player2Label.textContent = 'Player 2 (Maroon)';
        if (difficultyGroup) difficultyGroup.style.display = 'none';
        if (serverInfoGroup) serverInfoGroup.style.display = 'none';
        
        // Reset to default mode (pvpLocal)
        if (gameModeSelect) {
            gameModeSelect.value = 'pvpLocal';
            handleGameModeChange();
        }
    }

    /**
     * Initialize server connection test button
     */
    function initServerTestButton() {
        const testBtn = document.getElementById('testServerBtn');
        if (!testBtn) return;
        
        testBtn.addEventListener('click', async function() {
            const mode = gameModeSelect.value;
            if (mode !== 'pvpOS' && mode !== 'pvpGS') return;
            
            const serverKey = mode === 'pvpOS' ? 'official' : 'group';
            const serverName = mode === 'pvpOS' ? 'Official Server' : 'Group Server';
            
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
            
            try {
                // Use ClientAPI to test connection
                if (window.ClientAPI) {
                    window.ClientAPI.setServer(serverKey);
                    const connected = await window.ClientAPI.testConnection();
                    
                    if (connected) {
                        showServerStatus(`${serverName} is online`, true);
                    } else {
                        showServerStatus(`${serverName} is offline`, false);
                    }
                } else {
                    throw new Error('ClientAPI not available');
                }
            } catch (error) {
                console.error('Server test failed:', error);
                showServerStatus(`Test failed: ${error.message}`, false);
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }
        });
    }

    /**
     * Create server info section if it doesn't exist
     */
    function createServerInfoSection() {
        if (document.getElementById('serverInfoGroup')) return;
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.id = 'serverInfoGroup';
        formGroup.style.display = 'none';
        
        formGroup.innerHTML = `
            <label>Server Information:</label>
            <div class="server-info-container">
                <div id="serverInfoText" class="server-info"></div>
                <button type="button" id="testServerBtn" class="btn-test">Test Connection</button>
                <div id="serverStatus" class="server-status" style="display: none;"></div>
            </div>
        `;
        
        // Insert after game mode selector
        const gameModeGroup = document.querySelector('.form-group label[for="gameMode"]')?.parentElement;
        if (gameModeGroup) {
            gameModeGroup.insertAdjacentElement('afterend', formGroup);
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info', duration = 3000) {
        // Use AuthManager's notification system if available
        if (window.AuthManager && window.AuthManager.showNotification) {
            window.AuthManager.showNotification(message, type, duration);
            return;
        }
        
        // Fallback notification
        alert(`${type.toUpperCase()}: ${message}`);
    }

    /**
     * Initialize setup system
     */
    function initialize() {
        // Create server info section if needed
        createServerInfoSection();
        
        // Set initial state
        handleGameModeChange();
        
        // Initialize server test button
        initServerTestButton();
        
        // Listen for successful login events
        document.addEventListener('auth:login', (e) => {
            if (window.pendingOnlineSetup) {
                // Check if login is for the correct server
                if (e.detail && e.detail.server === window.pendingOnlineSetup.serverKey) {
                    // Resume online setup
                    setTimeout(resumeOnlineSetup, 500);
                }
            }
        });
        
        // Log initialization
        console.log('Setup system initialized');
        console.log('ClientAPI available:', !!window.ClientAPI);
        if (window.ClientAPI) {
            console.log('Available servers:', window.ClientAPI.getServerInfo());
        }
    }

    // Event listeners
    if (gameModeSelect) {
        gameModeSelect.addEventListener('change', handleGameModeChange);
    }

    if (setupForm) {
        setupForm.addEventListener('submit', handleSetupSubmit);
    }

    if (setupReset) {
        setupReset.addEventListener('click', resetSetupForm);
    }

    // Initialize on load
    initialize();
});