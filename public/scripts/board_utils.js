export class BoardUtils{
    constructor(serverRequests, login, senha, game_info, data) {
        this.selectTile = this.selectTile.bind(this);
        this.serverRequests = serverRequests;
        this.login = login;
        this.senha = senha;
        this.game_info = game_info;
        this.data = data
    
    }
    /* Converte o formato de um unico botao dado pelo servidor para o formato 
       do board usado na logica do jogo no board*/
    convertSingleButton(id){
       switch(id){
        case(3): return 7
        case(4): return 3
        case(5): return 6
        case(6): return 5
        case(7): return 4
       }
       return id
    }
    /* Converte o formato do board dado pelo servidor para o formato 
       do board usado na logica do jogo no board*/
    convertBoardFormat(serverboard){
        const newboard = serverboard
        let temp = null
        for(let i = 0;i < serverboard.length; i++){
            newboard[i][0] = serverboard[i][0]
            newboard[i][1] = serverboard[i][1]
            newboard[i][2] = serverboard[i][2]
            newboard[i][3] = serverboard[i][7]
            newboard[i][4] = serverboard[i][3]
            newboard[i][5] = serverboard[i][6]
            newboard[i][6] = serverboard[i][5]
            newboard[i][7] = serverboard[i][4]
        }
        return newboard
    }
    /* Atualiza o board de acordo com a resposta do servidor*/
    redrawBoard(nserverboard){
        if(nserverboard == null){
            return null
        }
        const buttons = document.querySelectorAll('.button');
        buttons.forEach(button => {
            const id= button.id.split('').map(Number);
            if(nserverboard[id[0]-1][id[1]-1] == `empty`){
                button.style.backgroundImage = 'none'
            }
            else if(nserverboard[id[0]-1][id[1]-1] == `blue`){
                button.style.backgroundImage = 'url("./assets/black_piece.png")';
                /**
                * @param {caminho para a peça preta}
                */
            }
            else if(nserverboard[id[0]-1][id[1]-1] == `red`){
                button.style.backgroundImage = 'url("./assets/red_piece.png")';
                /**
                * @param {caminho para a peça vermeleha}
                */
            }
        });
    }
    createSquares(n) {
        console.log("Estou no createSquares");
        const board = document.getElementById('board');
        if (board !== null) console.log("board n é nulo");
        // const board = document.getElementsByClassName('board');

        const initialSize = 125;
        const sizeIncrement = 125;
    
        for (let i = n; i > 0; i--) {
            const size = initialSize + i * sizeIncrement;
            const square = document.createElement('div');
            square.classList.add('square');
            square.style.width = `${size}px`;
            square.style.height = `${size}px`;
            square.style.left = `calc(50% - ${size / 2}px)`;
            square.style.top = `calc(50% - ${size / 2}px)`;
    
            // Usar arrow function
            const createButton = (i, x, y, n) => {
                const button = document.createElement('div');
                button.id = i.toString().concat(n);
                button.classList.add('button');
                button.style.left = `${x}px`;
                button.style.top = `${y}px`;
                square.appendChild(button);
    
                // `this` funciona porque createButton é uma arrow function
                button.addEventListener('click', this.selectTile);
            };
    
            const halfSize = size / 2;
    
            createButton(i, 0, 0, '1'); // Top-left corner
            createButton(i, halfSize, 0, '2'); // Top-center
            createButton(i, size, 0, '3'); // Top-right corner
            createButton(i, 0, halfSize, '4'); // Left-center
            createButton(i, size, halfSize, '5'); // Right-center
            createButton(i, 0, size, '6'); // Bottom-left corner
            createButton(i, halfSize, size, '7'); // Bottom-center
            createButton(i, size, size, '8'); // Bottom-right corner
    
            if (square !== null) console.log("html square n é nulo");
            board.appendChild(square);
            //game_list.push(Array(8).fill('empty'));
        }
    }
    
    selectTile(event) {
        if(this.data.phase == "drop"){
            console.log("Tile clicked:", event.target.id);
            const id= event.target.id.split('').map(Number);
            console.log(this.game_info)
            id[1] = this.convertSingleButton(id[1])
            this.serverRequests.requestNotify(this.login, this.senha, String(this.game_info), id[0]-1, id[1]-1)
        }
        else if(this.data.phase == "move"){
            console.log("Tile clicked:", event.target.id);
            const id= event.target.id.split('').map(Number);
            console.log(this.game_info)
            id[1] = this.convertSingleButton(id[1])
            this.serverRequests.requestNotify(this.login, this.senha, String(this.game_info), id[0]-1, id[1]-1)
        }
        else if(this.data.phase == "remove"){
            console.log("Tile clicked:", event.target.id);
            const id= event.target.id.split('').map(Number);
            console.log(this.game_info)
            id[1] = this.convertSingleButton(id[1])
            this.serverRequests.requestNotify(this.login, this.senha, String(this.game_info), id[0]-1, id[1]-1)
        }
    }

    addGlowEffect(color, id) { //
        if(color == "green"){
            const button = document.getElementById(id)
            button.classList.add(`glow_green`)
        }
        if(color == "red"){
            const buttons = document.querySelectorAll('.button');
            buttons.forEach(button => {
                button.classList.add('glow_red');              
            });
        }
      }
      
    removeGlowEffect() { //
        const buttons = document.querySelectorAll('.button');
        buttons.forEach(button => {
          button.classList.remove('glow_green');
          button.classList.remove('glow_red');
        });
      }
    isneighbor(id, idOB){ //checa se um piece eh vizinho de um outro
        //checando para baixo
        if(((id[0] == idOB[0]) && 
        ((id[1] == 1 && idOB[1] == 4) || (id[1] == 3 && idOB[1] == 5) || (id[1] == 4 && idOB[1] == 6) || (id[1] == 5 && idOB[1] == 8))
        ) || (id[0] == idOB[0]-1 && id[1] == 7 && idOB[1] == 7) || (id[0]-1 == idOB[0] && id[1] == 2 && idOB[1] == 2)){
            return true;
        }
        //checa para cima
        if(((idOB[0] == id[0]) && 
        ((idOB[1] == 1 && id[1] == 4) || (idOB[1] == 3 && id[1] == 5) || (idOB[1] == 4 && id[1] == 6) || (idOB[1] == 5 && id[1] == 8))
        ) || (idOB[0] == id[0]-1 && idOB[1] == 7 && id[1] == 7) || (id[0] == idOB[0]-1 && id[1] == 2 && idOB[1] == 2)){
            return true;
        }
        //checa para direita
        if(((id[0] == idOB[0]) && (id[1] + 1 == idOB[1] && (id[1] != 4 && idOB[1] != 4) && (id[1] != 5 && idOB[1] != 5))) || (id[0] == idOB[0]-1 && id[1] == 5 && idOB[1] == 5) || (id[0]-1 == idOB[0] && id[1] == 4 && idOB[1] == 4)){
            return true
        }
        //checa para esquerda
        if(((idOB[0] == id[0]) && (idOB[1] + 1 == id[1] && (id[1] != 4 && idOB[1] != 4) && (id[1] != 5 && idOB[1] != 5))) || (idOB[0] == id[0]-1 && idOB[1] == 5 && id[1] == 5) || (idOB[0]-1 == id[0] && idOB[1] == 4 && id[1] == 4)){
            return true
        }
        return false;
    }
}