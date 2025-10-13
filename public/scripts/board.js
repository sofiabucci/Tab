const gameBoard = document.getElementById('gameBoard');

function generateBoard(columns = 9) { // padrão = 9 colunas
  gameBoard.innerHTML = '';

  const rows = 4; 
  gameBoard.style.gridTemplateColumns = `repeat(${columns}, 70px)`; // ajusta grid

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= columns; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');

      const token = document.createElement('div');
      token.classList.add('boardToken');

      // Tokens iniciais
      if (row === 1) {
        token.classList.add('player2');
        token.textContent = '-?-';
        token.id = `p2-token-${col}`;
      } else if (row === rows) {
        token.classList.add('player1');
        token.textContent = '-?-';
        token.id = `p1-token-${col}`;
      }

      cell.appendChild(token);
      gameBoard.appendChild(cell);
    }
  }
}

generateBoard();
