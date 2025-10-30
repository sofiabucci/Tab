/**
 * @file dice.js
 * @description Stick dice implementation for Tâb game
 * Handles dice rolling, visualization, and result calculation
 */

document.addEventListener('DOMContentLoaded', function() {
    /** @type {HTMLButtonElement} */
    const rollDiceBtn = document.getElementById('rollDiceBtn');
    
    /** @type {HTMLElement} */
    const diceResult = document.getElementById('diceResult');

    /**
     * Dice configuration constants
     * @type {Object}
     */
    const DICE_CONFIG = {
        FACES: {
            LIGHT: 'light',
            DARK: 'dark'
        },
        VALUES: {
            0: 6, // Sitteh
            1: 1, // Tâb
            2: 2, // Itneyn
            3: 3, // Teláteh
            4: 4  // Arba'ah
        },
        NAMES: {
            6: 'Sitteh',
            1: "Tâb",
            2: 'Itneyn',
            3: 'Teláteh',
            4: "Arba'ah"
        },
        REPEAT_VALUES: [1, 4, 6]
    };

    /** @type {boolean} */
    let isRolling = false;
    
    /** @type {Object|null} */
    window.stickDiceLastRoll = null;

    // Variáveis globais para controle de turno
    window.isPlayerTurn = false;
    window.lastRoll = null;
    window.canRollAgain = false;

    /**
     * Initialize dice display
     */
    function renderInitial() {
        if (diceResult) diceResult.innerHTML = '';
    }

    /**
     * Create visual representation of stick dice
     * @param {string[]} faces - Array of face values ('light' or 'dark')
     * @returns {HTMLElement} - Stick container element
     */
    function createStickVisual(faces) {
        const stickContainer = document.createElement('div');
        stickContainer.className = 'sticks-container';

        faces.forEach((face, index) => {
            const stick = document.createElement('div');
            stick.className = 'stick';

            // Create 4 vertical segments for each stick
            for (let i = 0; i < 4; i++) {
                const segment = document.createElement('div');
                segment.className = `stick-segment ${face === 'light' ? 'stick-light' : 'stick-dark'}`;
                stick.appendChild(segment);
            }

            stickContainer.appendChild(stick);
        });

        return stickContainer;
    }

    /**
     * Format dice roll result for display
     * @param {string[]} faces - Array of face values
     * @param {number} lightCount - Number of light faces
     * @param {number} value - Dice value
     * @param {string} name - Dice value name
     * @param {boolean} repeats - Whether roll repeats
     * @returns {HTMLElement} - Formatted result element
     */
    function formatResult(faces, lightCount, value, name, repeats) {
        const container = document.createElement('div');
        container.className = 'dice-result-container';

        // Add stick visualization
        const sticksVisual = createStickVisual(faces);
        container.appendChild(sticksVisual);

        // Add result information
        const infoDiv = document.createElement('div');
        infoDiv.className = 'dice-result-info';

        infoDiv.innerHTML = `
            <div class="dice-light-count"><strong>Light sides:</strong> ${lightCount}</div>
            <div class="dice-value"><strong>Value:</strong> ${value} — ${name}</div>
            <div class="dice-repeats ${repeats ? 'dice-repeat-yes' : 'dice-repeat-no'}">
                ${repeats ? ' <strong>Roll again!</strong>' : '⏭️ Next player'}
            </div>
        `;

        container.appendChild(infoDiv);
        return container;
    }

    /**
     * Update roll button state based on game rules
     */
    function updateRollButtonState() {
        const rollDiceBtn = document.getElementById('rollDiceBtn');
        if (rollDiceBtn) {
            const canRoll = window.isPlayerTurn || window.canRollAgain;
            rollDiceBtn.disabled = !canRoll;
            
            if (canRoll) {
                rollDiceBtn.classList.remove('disabled');
            } else {
                rollDiceBtn.classList.add('disabled');
            }
        }
    }

    /**
     * Enable dice rolling for current player
     */
    function enableStickRolling() {
        window.isPlayerTurn = true;
        window.canRollAgain = false;
        window.lastRoll = null;
        updateRollButtonState();
    }

    /**
     * Perform a single dice roll
     */
    function rollOnce() {
        if (isRolling) return;
        
        // Verifica se é a vez do jogador e se pode rolar
        if (!window.isPlayerTurn && !window.canRollAgain) {
            return;
        }
        
        isRolling = true;

        showRollingAnimation();

        const animationTime = 1000;

        setTimeout(() => {
            const rollResult = calculateRollResult();
            displayRollResult(rollResult);
            broadcastRollEvent(rollResult);
            isRolling = false;
            
            // Determina se pode rolar novamente baseado no resultado
            window.canRollAgain = rollResult.repeats;
            window.isPlayerTurn = false;
            
            updateRollButtonState();
            
        }, animationTime);
    }

    /**
     * Show rolling animation
     */
    function showRollingAnimation() {
        if (!diceResult) return;

        diceResult.innerHTML = `
            <div class="dice-rolling">
                <div class="dice-rolling-text">Rolling...</div>
                <div class="dice-rolling-animation">
                    ${Array(4).fill(0).map(() => `
                        <div class="dice-rolling-stick">
                            ${Array(4).fill(0).map(() => `
                                <div class="dice-rolling-segment"></div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Calculate random dice roll result
     * @returns {Object} - Roll result object
     */
    function calculateRollResult() {
        const faces = Array(4).fill(0).map(() => 
            Math.random() < 0.5 ? 'light' : 'dark'
        );

        const lightCount = faces.filter(f => f === 'light').length;
        const value = DICE_CONFIG.VALUES[lightCount];
        const name = DICE_CONFIG.NAMES[value] || '';
        const repeats = DICE_CONFIG.REPEAT_VALUES.includes(value);

        return { faces, lightCount, value, name, repeats };
    }

    /**
     * Display roll result in UI
     * @param {Object} result - Roll result object
     */
    function displayRollResult(result) {
        if (!diceResult) return;

        const resultElement = formatResult(
            result.faces, 
            result.lightCount, 
            result.value, 
            result.name, 
            result.repeats
        );

        diceResult.innerHTML = '';
        diceResult.appendChild(resultElement);
    }

    /**
     * Broadcast roll event to other game components
     * @param {Object} result - Roll result object
     */
    function broadcastRollEvent(result) {
        window.stickDiceLastRoll = result;
        window.lastRoll = result;
        document.dispatchEvent(new CustomEvent('stickRoll', { 
            detail: window.stickDiceLastRoll 
        }));
    }

    /**
     * Reset dice to initial state
     */
    function resetSticks() {
        window.stickDiceLastRoll = null;
        window.lastRoll = null;
        window.canRollAgain = false;
        renderInitial();
        document.dispatchEvent(new CustomEvent('stickReset'));
        updateRollButtonState();
    }

    // Expose functions globally
    window.rollStickDice = rollOnce;
    window.resetStickDice = resetSticks;
    window.enableStickRolling = enableStickRolling;
    window.updateRollButtonState = updateRollButtonState;

    // Event listeners
    if (rollDiceBtn) {
        rollDiceBtn.addEventListener('click', rollOnce);
    }

    document.addEventListener('moveEnded', resetSticks);

    // Initialize display
    renderInitial();
    updateRollButtonState();
});