
// Game board class
class GameBoard {
    constructor(id, cols) {
        // Accept either (id, cols) or (id, cols, options)
        let options = {};
        if (arguments.length >= 3) options = arguments[2] || {};

        this.content = new Array(cols*4);
        this.boardElements = new Array(cols*4);
        // Set starting player based on options.firstPlayer
        this.currentPlayer = options.firstPlayer === 'player2' ? 'O' : 'X';
        this.cols = cols;
        
    const parent = document.getElementById(id);
    // Clear existing board if present
    parent.innerHTML = '';

    const board = document.createElement('div');
    board.className = 'board';
    parent.appendChild(board);

        board.style.gridTemplateRows = `repeat(4, auto)`;
        board.style.gridTemplateColumns = `repeat(${cols}, auto)`;
        
        // Create cells
        for(let i = 0; i < cols*4; i++) {
            let cell = document.createElement('div');
            cell.className = 'board-square';
            cell.dataset.index = i;
            board.appendChild(cell);

            if(i<cols || i> 3*cols-1){
                let token = document.createElement('div');
                let token_class = (i<cols ?'board-token player-2':'board-token player-1');
                token.className = token_class;
                token.dataset.index = i;
                cell.appendChild(token);

            }
            
            // Add click event
            cell.addEventListener('click', () => this.play && this.play(i));
            
            this.boardElements[i] = cell;  
        }
        
        
        // Initialize content array
        this.content.fill(null);
    }
    
    }

    // Expose a helper to generate the board with options
    function generateBoard(columns, options = {}) {
        // Ensure columns is a number and fallback to 15
        const cols = parseInt(columns) || 15;
        // Create a GameBoard instance and store it globally if needed
        window._currentGameBoard = new GameBoard('board-container', cols, options);
        return window._currentGameBoard;
    }

    // Initial load with default columns (9)
    window.onload = function() {
        generateBoard(9, { firstPlayer: 'player1' });
    }

    // Expose generateBoard and GameBoard to global scope
    window.generateBoard = generateBoard;
    window.GameBoard = GameBoard;