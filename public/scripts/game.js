/**
 * @file game.js
 * @description Game session orchestrator and logging system
 * Tracks all game events, moves, and results for analysis and classification
 */

(function(){
    /**
     * Game logging and session management system
     * @namespace
     */
    
    /** @type {Array} */
    const gameLog = [];
    
    /** @type {number} */
    let gameStartTime = 0;

    /**
     * Create logging UI panel
     * @returns {HTMLElement} - Log panel element
     */
    function createLoggerUI() {
        let panel = document.getElementById('game-log-panel');
        if (panel) return panel;
        
        panel = document.createElement('div');
        panel.id = 'game-log-panel';
        Object.assign(panel.style, {
            position: 'fixed',
            right: '12px',
            bottom: '12px',
            width: '360px',
            maxHeight: '50vh',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: 99999
        });

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '6px';

        const title = document.createElement('strong');
        title.textContent = 'Game Log';
        header.appendChild(title);

        const controls = document.createElement('div');
        controls.appendChild(createControlButton('Download', downloadLog));
        controls.appendChild(createControlButton('Clear', clearLog));
        
        header.appendChild(controls);
        panel.appendChild(header);

        const list = document.createElement('div');
        list.id = 'game-log-list';
        panel.appendChild(list);

        document.body.appendChild(panel);
        return panel;
    }

    /**
     * Create control button for log panel
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement} - Button element
     */
    function createControlButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.marginRight = '6px';
        button.style.fontSize = '11px';
        button.onclick = onClick;
        return button;
    }

    /**
     * Add entry to game log
     * @param {string} type - Log entry type
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    function pushLog(type, message, data = {}) {
        const entry = {
            ts: Date.now(),
            type,
            message,
            data
        };
        
        gameLog.push(entry);
        appendToUI(entry);
        console.log('[GAME LOG]', type, message, data);
    }

    /**
     * Append log entry to UI
     * @param {Object} entry - Log entry
     */
    function appendToUI(entry) {
        const list = document.getElementById('game-log-list') || 
                    createLoggerUI().querySelector('#game-log-list');
        if (!list) return;
        
        const line = document.createElement('div');
        line.style.padding = '4px 2px';
        line.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
        
        const time = new Date(entry.ts).toLocaleTimeString();
        line.textContent = `[${time}] ${entry.type.toUpperCase()} ${entry.message || ''}`;
        
        if (entry.data) {
            const dataElement = document.createElement('div');
            dataElement.style.opacity = '0.85';
            dataElement.style.fontSize = '11px';
            dataElement.textContent = JSON.stringify(entry.data, null, 2);
            line.appendChild(dataElement);
        }
        
        list.insertBefore(line, list.firstChild);
    }

    /**
     * Clear all log entries
     */
    function clearLog() {
        gameLog.length = 0;
        const list = document.getElementById('game-log-list');
        if (list) list.innerHTML = '';
    }

    /**
     * Download log as JSON file
     */
    function downloadLog() {
        const blob = new Blob([gameLog.map(e => JSON.stringify(e)).join('\n')], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tab-game-log-${Date.now()}.jsonl`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Setup game logging for a board instance
     * @param {Object} board - Game board instance
     * @param {Object} options - Game options
     */
    function setupGameLogging(board, options) {
        if (!board) return;
        
        createLoggerUI();
        gameStartTime = Date.now();
        
        pushLog('scene', 'game_started', { options: options || {} });

        setupMoveLogging(board);
        setupEventLogging();
        setupAILogging(board);
    }

    /**
     * Setup move logging
     * @param {Object} board - Game board instance
     */
    function setupMoveLogging(board) {
        if (board && typeof board.applyMoveIndices === 'function') {
            const originalApply = board.applyMoveIndices.bind(board);
            board.applyMoveIndices = function(fromIdx, toIdx, keepTurn) {
                const piece = this.content[fromIdx];
                const moveData = { 
                    from: fromIdx, 
                    to: toIdx, 
                    player: piece ? piece.player : null, 
                    keepTurn: !!keepTurn 
                };
                
                pushLog('move_attempt', 'applying_move', moveData);
                const success = originalApply(fromIdx, toIdx, keepTurn);
                
                if (success) {
                    pushLog('move', 'move_applied', moveData);
                    logBoardState(this);
                    checkGameEnd(this, options);
                } else {
                    pushLog('move_failed', 'invalid_move', moveData);
                }
                
                return success;
            };
        }
    }

    /**
     * Setup event listeners for logging
     */
    function setupEventLogging() {
        const events = {
            'stickRoll': (e) => pushLog('roll', 'stick_roll', e.detail),
            'playerPassed': (e) => pushLog('action', 'player_passed', e.detail),
            'playerResigned': (e) => {
                pushLog('action', 'player_resigned', e.detail);
                if (e.detail && e.detail.winner) {
                    recordGameResult(e.detail.winner, gameStartTime, window.game?.options);
                }
            },
            'gameOver': (e) => {
                pushLog('scene', 'game_over', e.detail);
                if (e.detail && e.detail.winner) {
                    recordGameResult(e.detail.winner, gameStartTime, window.game?.options);
                }
            },
            'moveEnded': () => pushLog('scene', 'move_ended')
        };

        Object.entries(events).forEach(([event, handler]) => {
            document.addEventListener(event, handler);
        });
    }

    /**
     * Setup AI move logging
     * @param {Object} board - Game board instance
     */
    function setupAILogging(board) {
        if (board && typeof board.handleAIMove === 'function') {
            const originalAI = board.handleAIMove.bind(board);
            board.handleAIMove = async function(stickValue, repeats) {
                pushLog('ai', 'ai_move_start', { stickValue, repeats });
                try {
                    const result = await originalAI(stickValue, repeats);
                    pushLog('ai', 'ai_move_end', {});
                    return result;
                } catch (error) {
                    pushLog('ai_error', 'ai_move_error', { 
                        message: error?.message || String(error) 
                    });
                    throw error;
                }
            };
        }
    }

    /**
     * Log current board state
     * @param {Object} board - Game board instance
     */
    function logBoardState(board) {
        const counts = { 'player-1': 0, 'player-2': 0 };
        for (let i = 0; i < board.content.length; i++) {
            if (board.content[i] && board.content[i].player) {
                counts[board.content[i].player]++;
            }
        }
        pushLog('state', 'after_move', { counts });
    }

    /**
     * Check if game has ended
     * @param {Object} board - Game board instance
     * @param {Object} options - Game options
     */
    function checkGameEnd(board, options) {
        const counts = { 'player-1': 0, 'player-2': 0 };
        for (let i = 0; i < board.content.length; i++) {
            if (board.content[i] && board.content[i].player) {
                counts[board.content[i].player]++;
            }
        }
        
        if (counts['player-1'] === 0 || counts['player-2'] === 0) {
            const winner = counts['player-1'] === 0 ? 'player-2' : 'player-1';
            pushLog('scene', 'game_over', { winner });
            recordGameResult(winner, gameStartTime, options);
        }
    }

    /**
     * Record game result in classification system
     * @param {string} winner - Winning player
     * @param {number} startTime - Game start timestamp
     * @param {Object} options - Game options
     */
    function recordGameResult(winner, startTime, options = {}) {
        const gameDuration = Math.floor((Date.now() - startTime) / 1000);
        const player1 = 'Player 1';
        const player2 = options.mode === 'pvc' ? 'AI' : 'Player 2';
        
        if (window.classification) {
            window.classification.recordGame(player1, player2, winner, gameDuration);
            pushLog('classification', 'game_recorded', { 
                player1, 
                player2, 
                winner, 
                duration: gameDuration 
            });
        } else {
            pushLog('warning', 'classification_system_not_available');
        }
    }

    /**
     * Wrap generateBoard to automatically attach logging
     */
    function wrapGenerateBoard() {
        if (!window.generateBoard) return;
        
        const originalGenerate = window.generateBoard.bind(window);
        window.generateBoard = function(columns, options) {
            const board = originalGenerate(columns, options);
            try {
                setupGameLogging(board, options);
            } catch (error) {
                console.error('Game logging setup failed:', error);
            }
            return board;
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wrapGenerateBoard);
    } else {
        wrapGenerateBoard();
    }
})();