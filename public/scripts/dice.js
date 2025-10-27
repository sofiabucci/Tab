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

    function formatFaces(faces) {
        // faces is array of 'light'|'dark'
        return faces.map(f => f === 'light' ? FACE_LIGHT : FACE_DARK).join(' ');
    }

    function rollOnce() {
        if (isRolling) return;
        isRolling = true;

        if (diceResult) diceResult.textContent = 'Rolling...';

        const animationTime = 800;

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

            const resultHtml = `\n        <div><strong>Faces:</strong> ${formatFaces(faces)}</div>\n        <div><strong>Sum (light faces):</strong> ${lightCount}</div>\n        <div><strong>Value:</strong> ${value} — ${name} ${repeats ? '(replay allowed)' : ''}</div>\n      `;

            if (diceResult) diceResult.innerHTML = resultHtml;

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