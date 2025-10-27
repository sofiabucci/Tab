document.addEventListener('DOMContentLoaded', function() {
    const rollDiceBtn = document.getElementById('rollDiceBtn');
    const diceResult = document.getElementById('diceResult');

    // Representation characters for faces: light (planar/clear) and dark (rounded/shell)
    const FACE_LIGHT = '◻';
    const FACE_DARK = '◼';

    // Mapping from number of light faces (sum 0..4) to game value
    const SUM_TO_VALUE = {
        0: 6, // Sitteh
        1: 1, // Tâb
        2: 2, // Itneyn
        3: 3, // Teláteh
        4: 4  // Arba'ah
    };

    // Names for values
    const VALUE_NAMES = {
        6: 'Sitteh',
        1: "Tâb",
        2: 'Itneyn',
        3: 'Teláteh',
        4: "Arba'ah"
    };

    let isRolling = false;
    // Last roll info exposed on window for other modules
    window.stickDiceLastRoll = null;

    function renderInitial() {
        if (diceResult) diceResult.innerHTML = '';
    }

    function createStickVisual(faces) {
        const stickContainer = document.createElement('div');
        stickContainer.className = 'sticks-container';

        faces.forEach((face, index) => {
            const stick = document.createElement('div');
            stick.className = 'stick';

            // Criar 4 segmentos verticais para cada pau
            for (let i = 0; i < 4; i++) {
                const segment = document.createElement('div');
                segment.className = `stick-segment ${face === 'light' ? 'stick-light' : 'stick-dark'}`;
                stick.appendChild(segment);
            }

            stickContainer.appendChild(stick);
        });

        return stickContainer;
    }

    function formatResult(faces, lightCount, value, name, repeats) {
        const container = document.createElement('div');
        container.className = 'dice-result-container';

        // Adicionar visualização dos paus
        const sticksVisual = createStickVisual(faces);
        container.appendChild(sticksVisual);

        // Adicionar informações do resultado
        const infoDiv = document.createElement('div');
        infoDiv.className = 'dice-result-info';

        const lightCountDiv = document.createElement('div');
        lightCountDiv.className = 'dice-light-count';
        lightCountDiv.innerHTML = `<strong>Light sides:</strong> ${lightCount}`;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'dice-value';
        valueDiv.innerHTML = `<strong>Value:</strong> ${value} — ${name}`;

        const repeatsDiv = document.createElement('div');
        repeatsDiv.className = `dice-repeats ${repeats ? 'dice-repeat-yes' : 'dice-repeat-no'}`;
        repeatsDiv.innerHTML = repeats ? ' <strong>Roll again!</strong>' : '⏭️ Next player';

        infoDiv.appendChild(lightCountDiv);
        infoDiv.appendChild(valueDiv);
        infoDiv.appendChild(repeatsDiv);
        container.appendChild(infoDiv);

        return container;
    }

    function rollOnce() {
        if (isRolling) return;
        isRolling = true;

        if (diceResult) {
            diceResult.innerHTML = `
                <div class="dice-rolling">
                    <div class="dice-rolling-text"> Rolling...</div>
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

        const animationTime = 1000;

        setTimeout(() => {
            // Simulate 4 independent sticks
            const faces = [];
            for (let i = 0; i < 4; i++) {
                // Each stick has two faces; assume 50/50
                faces.push(Math.random() < 0.5 ? 'light' : 'dark');
            }

            const lightCount = faces.filter(f => f === 'light').length;
            const value = SUM_TO_VALUE[lightCount];
            const name = VALUE_NAMES[value] || '';
            const repeats = (value === 1 || value === 4 || value === 6);

            // Create visual result
            const resultElement = formatResult(faces, lightCount, value, name, repeats);

            if (diceResult) {
                diceResult.innerHTML = '';
                diceResult.appendChild(resultElement);
            }

            // Store last roll globally
            window.stickDiceLastRoll = {
                faces,
                sum: lightCount,
                value,
                name,
                repeats
            };

            // Dispatch a custom event so other modules (board/IA) can react
            const event = new CustomEvent('stickRoll', { detail: window.stickDiceLastRoll });
            document.dispatchEvent(event);

            isRolling = false;
        }, animationTime);
    }

    function resetSticks() {
        window.stickDiceLastRoll = null;
        renderInitial();
        // Dispatch reset event
        document.dispatchEvent(new CustomEvent('stickReset'));
    }

    // Expose functions for other code
    window.rollStickDice = rollOnce;
    window.resetStickDice = resetSticks;

    // When a move ends, reset the stick-dice UI to initial state
    document.addEventListener('moveEnded', () => resetSticks());

    // Hook the UI button/area
    if (rollDiceBtn) {
        rollDiceBtn.addEventListener('click', () => rollOnce());
    }

    // Initialize display
    renderInitial();
});