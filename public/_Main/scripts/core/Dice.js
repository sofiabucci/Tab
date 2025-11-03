/**
 * Implementation of the Tâb stick dice as a DOM component.
 * Manages rendering, animation, and events.
 */
export class Dice {
  /**
   * @param {string} rollButtonId - ID of the "Roll" button.
   * @param {string} resultContainerId - ID of the container for dice display.
   */
  constructor(rollButtonId, resultContainerId) {
    this.rollButton = document.getElementById(rollButtonId);
    this.resultContainer = document.getElementById(resultContainerId);

    this.isRolling = false;
    this.lastRoll = null;

    this.SUM_TO_VALUE = { 0: 6, 1: 1, 2: 2, 3: 3, 4: 4 };
    this.VALUE_NAMES = { 6: 'Sitteh', 1: 'Tâb', 2: 'Itneyn', 3: 'Teláteh', 4: "Arba'ah" };
    this.REPEAT_VALUES = [1, 4, 6];

    this.#attachListeners();
    this.#renderInitial();
  }

  // ────────────────────────────────────────────────
  // PUBLIC METHODS
  // ────────────────────────────────────────────────

  /**
   * Rolls the dice, updates the DOM, and emits a custom `stickRoll` event.
   * @returns {Promise<Object>} A promise that resolves to the roll result.
   */
  async roll() {
    if (this.isRolling) return this.lastRoll;
    this.isRolling = true;
    this.#renderRolling();

    await new Promise(r => setTimeout(r, 800)); // Simulate rolling animation delay

    const faces = Array.from({ length: 4 }, () => (Math.random() < 0.5 ? 'light' : 'dark'));
    const lightCount = faces.filter(f => f === 'light').length;
    const value = this.SUM_TO_VALUE[lightCount];
    const name = this.VALUE_NAMES[value];
    const repeats = this.REPEAT_VALUES.includes(value);

    const result = { faces, sum: lightCount, value, name, repeats };
    this.lastRoll = result;

    this.#renderResult(result);
    this.#emitEvent('stickRoll', result);

    this.isRolling = false;
    return result;
  }

  /**
   * Resets the dice display to an empty state and emits `stickReset`.
   */
  reset() {
    this.lastRoll = null;
    this.#renderInitial();
    this.#emitEvent('stickReset');
  }

  /**
   * Allows AI or test scripts to simulate a roll deterministically.
   * @param {number} lightCount - Number of light sides (0–4).
   * @returns {Object} Simulated roll result.
   */
  simulate(lightCount) {
    const faces = Array.from({ length: 4 }, (_, i) => (i < lightCount ? 'light' : 'dark'));
    const value = this.SUM_TO_VALUE[lightCount];
    const name = this.VALUE_NAMES[value];
    const repeats = this.REPEAT_VALUES.includes(value);
    return { faces, sum: lightCount, value, name, repeats };
  }

  // ────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ────────────────────────────────────────────────

  #attachListeners() {
    if (this.rollButton) {
      this.rollButton.addEventListener('click', () => this.roll());
    }
  }

  #emitEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  #renderInitial() {
    if (this.resultContainer) this.resultContainer.innerHTML = '';
  }

  #renderRolling() {
    if (!this.resultContainer) return;
    this.resultContainer.innerHTML = `
      <div class="dice-rolling">
        <div class="dice-rolling-text">Rolling...</div>
        <div class="dice-rolling-animation">
          ${Array(4).fill(0).map(() => `
            <div class="dice-rolling-stick">
              ${Array(4).fill(0).map(() =>
                `<div class="dice-rolling-segment"></div>`
              ).join('')}
            </div>`).join('')}
        </div>
      </div>
    `;
  }

  #renderResult({ faces, sum, value, name, repeats }) {
    if (!this.resultContainer) return;

    const sticksHTML = faces.map(f => `
      <div class="stick">
        ${Array(4).fill(0).map(() =>
          `<div class="stick-segment ${f === 'light' ? 'stick-light' : 'stick-dark'}"></div>`
        ).join('')}
      </div>
    `).join('');

    this.resultContainer.innerHTML = `
      <div class="dice-result-container">
        <div class="sticks-container">${sticksHTML}</div>
        <div class="dice-result-info">
          <div><strong>Light sides:</strong> ${sum}</div>
          <div><strong>Value:</strong> ${value} — ${name}</div>
          <div class="dice-repeats ${repeats ? 'yes' : 'no'}">
            ${repeats ? '<strong>Roll again!</strong>' : '⏭️ Next player'}
          </div>
        </div>
      </div>
    `;
  }
}

// ────────────────────────────────────────────────
// GLOBAL INITIALIZATION
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Create dice component and expose it globally if needed
  window.dice = new Dice('rollDiceBtn', 'diceResult');

  // Listen for dice events from other modules
  document.addEventListener('stickRoll', e => {
    console.log('Dice rolled:', e.detail);
  });

  document.addEventListener('stickReset', () => {
    console.log('Dice reset');
  });
});
