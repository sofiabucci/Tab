
// Game board class
class GameBoard {
    constructor(id, cols) {
        this.content = new Array(cols*4);
        this.boardElements = new Array(cols*4);
        this.currentPlayer = 'X';
        this.cols = cols;
        
        const parent = document.getElementById(id);
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
            cell.addEventListener('click', () => this.play(i));
            
            this.boardElements[i] = cell;  
        }
        
        
        // Initialize content array
        this.content.fill(null);
    }
    
}

window.onload = function() {
    const game = new GameBoard("board-container", 15);
}