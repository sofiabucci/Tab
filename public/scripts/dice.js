/**
 * @file dice.js
 * @description Stick dice implementation for Tâb game
 * Handles dice rolling, visualization, and result calculation
 */

/**
 * Class to handle Canvas-based Stick rendering.
 * Draws stickdice.
 */
export class StickCanvas {
    static CONTAINER = 'sticks-container';
    static CONTAINER2 = 'dice-canvas';
    /**
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {string[]} arr - faces of dice result
     */
    constructor(width , height , faces) {        
        // Create Canvas Element
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        this.faces = faces;
        this.gc = this.canvas.getContext('2d');

        // Configuration
        this.stickColor = '#8b4513'; // Dark wood
        this.stickLight = '#f0f0f0'; // Dark wood
        this.padding = 15; // Space between sticks
        
        // Initial Render
        this.draw();
    }

    drawStick(x, y, w, h, radius, color) {
        const gc = this.gc;
        
        gc.beginPath();
        gc.moveTo(x + radius, y);
        gc.lineTo(x + w - radius, y);
        gc.quadraticCurveTo(x + w, y, x + w, y + radius);
        gc.lineTo(x + w, y + h - radius);
        gc.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        gc.lineTo(x + radius, y + h);
        gc.quadraticCurveTo(x, y + h, x, y + h - radius);
        gc.lineTo(x, y + radius);
        gc.quadraticCurveTo(x, y, x + radius, y);
        gc.closePath();

        gc.fillStyle = color;
        gc.fill();
        
        gc.strokeStyle = '#654321'; // Darker wood border
        gc.lineWidth = 2;
        gc.stroke();
    }

    /**
     * Main render function
     * Clears the canvas and draws 4 sticks
     */
    draw() {
        this.gc.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const stickCount = 4;

        // Stick width is based on canvas size and padding
        const stickWidth = (this.canvas.width - (this.padding * (stickCount + 1))) / stickCount;
        const stickHeight = this.canvas.height * 0.8; // 80% of canvas height
        const startY = (this.canvas.height - stickHeight) / 2; // Center vertically

        for (let i = 0; i < stickCount; i++) {
            const x = this.padding + (i * (stickWidth + this.padding));
            
            this.drawStick(
                x, 
                startY, 
                stickWidth, 
                stickHeight, 
                10, // Corner radius
                (this.faces[i] === 'light') ? this.stickLight : this.stickColor
            );
        }
    }
}

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
     * Create div container for stick Canvas
     * @param {string[]} faces - Array of face values ('light' or 'dark')
     * @returns {HTMLElement} - Stick container element
     */
    function createStickVisual(faces) {
        const stickContainer = document.createElement('div');
        stickContainer.className = 'sticks-container';
        stickContainer.id = 'sticks-container';
        stickContainer.appendChild(new StickCanvas(150, 75, faces).canvas);  
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
        
        // Verify if it's the player's turn or they can roll again
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
            
            // Determinates if player can
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
        if (!diceResult || window.onlineGameManager) return;

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