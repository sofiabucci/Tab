/**
 * @file dice.js
 * @description Stick dice implementation for Tâb game
 * Handles dice rolling, visualization, and result calculation
 */

/**
 * Class to handle Canvas-based Stick rendering.
 * Draws stickdice.
 * 
 * Example Usage:  
    const container = document.getElementById('test-container');  
    const sticks = new StickCanvas(150, 75, [true, true, false, false]);  
    container.appendChild(sticks.canvas);
    sticks.faces = [true, true, true, false];
    sticks.drawWithAnimation();
 */
export class StickCanvas {
    static CONTAINER = 'sticks-container';
    static CONTAINER2 = 'dice-canvas';

    /**
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {string[4] | boolean[]} faces - faces of dice result
     */
    constructor(width , height , faces) {        
        // Create Canvas Element
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        if(faces && faces[0] === 'light'){
            this.faces = faces.map((str) => (str ==='light'));
        }else{
            this.faces = faces ? faces : [false, false, false, false];
        }

        this.gc = this.canvas.getContext('2d');

        this.stickColor = '#8b4513'; // Dark wood
        this.boardColor = '#654321'; // Darker wood
        this.stickLight = '#f0f0f0'; // Light wood
        this.padding = 15;

        // Animation State
        this.animationId = null;
        this.animFrame = -1; 
        this.animTick = 0;   

        this.draw(true);
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
        
        gc.strokeStyle = this.boardColor;
        gc.lineWidth = 2;
        gc.stroke();
    }

    drawWithAnimation(){
        return this.draw(false);
    }

    /**
     * Main Draw Function
     * @param {boolean} skipAnimation 
     * - If TRUE: Stops animation and draws the final static result (faces).
     * - If FALSE: Plays the "One Wave" animation.
     */
    draw(skipAnimation = true) {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.gc.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const stickCount = 4;
        const baseHeight = this.canvas.height * 0.8;
        const stickWidth = (this.canvas.width - (this.padding * (stickCount + 1))) / stickCount;
        const startY = (this.canvas.height - baseHeight) / 2;
        const stickRadius = Math.min(10, stickWidth / 2);

        // --- BRANCH A: SHOW STATIC RESULT ---
        if (skipAnimation) {
            this.animFrame = -1; 

            for (let i = 0; i < stickCount; i++) {
                const x = this.padding + (i * (stickWidth + this.padding));
                this.drawStick(
                    x,
                    startY,
                    stickWidth,
                    baseHeight,
                    stickRadius,
                    this.faces[i] ? this.stickLight : this.stickColor
                );
            }
            return;
        }

        // --- BRANCH B: ANIMATE WAVE ---
        const WAVE_PATTERN = [1.0, 1.25, 0.85, 1.0];
        const SPEED_DIVISOR = 4;

        if (this.animFrame === -1) {
            this.animFrame = 0;
            this.animTick = 0;
        }

        this.animTick++;
        if (this.animTick > SPEED_DIVISOR) {
            this.animFrame++;
            this.animTick = 0;
        }

        // If wave passes stick count, show result
        if (this.animFrame > stickCount + WAVE_PATTERN.length + 2) {
            this.draw(true);
            return;
        }

        for (let i = 0; i < stickCount; i++) {
            const x = this.padding + (i * (stickWidth + this.padding));
            const waveIndex = this.animFrame - i;
            
            let multiplier = 1.0;
            if (waveIndex >= 0 && waveIndex < WAVE_PATTERN.length) {
                multiplier = WAVE_PATTERN[waveIndex];
            }

            const currentH = baseHeight * multiplier;
            const currentY = (this.canvas.height - currentH) / 2;

            this.drawStick(
                x,
                currentY,
                stickWidth,
                currentH,
                stickRadius,
                this.stickColor 
            );
        }

        this.animationId = requestAnimationFrame(() => this.draw(false));
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
        const sticks = new StickCanvas(150, 75, faces);
        stickContainer.appendChild(sticks.canvas);  
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