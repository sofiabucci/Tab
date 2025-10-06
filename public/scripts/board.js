const gameBoard = document.getElementById('gameBoard');
const diceBtn = document.getElementById('rollDiceBtn');
const diceResult = document.getElementById('diceResult');

function generateBoard(columns = 7) {
  gameBoard.innerHTML = '';
  gameBoard.style.gridTemplateColumns = `repeat(${columns}, 70px)`;
  const totalCells = columns * 4; // 4 linhas
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    gameBoard.appendChild(cell);
  }
}

// Board padrão
generateBoard(7);

// Dice roll
diceBtn.addEventListener('click', () => {
  const roll = Math.floor(Math.random() * 6) + 1;
  diceResult.textContent = `🎲 ${roll}`;
});
