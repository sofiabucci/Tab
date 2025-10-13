class TabAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth();
    }

    getMaxDepth() {
        switch(this.difficulty) {
            case 'easy': return 2;
            case 'medium': return 4;
            case 'hard': return 6;
            default: return 4;
        }
    }

    // Função principal para a IA fazer uma jogada
    makeMove(gameState, diceRoll) {
        console.log(`AI (${this.difficulty}) thinking with dice: ${diceRoll}`);
        
        const possibleMoves = this.generatePossibleMoves(gameState, diceRoll);
        
        if (possibleMoves.length === 0) {
            console.log("No valid moves available");
            return null;
        }

        let bestMove = null;
        let bestValue = -Infinity;

        // Avalia cada movimento possível
        for (const move of possibleMoves) {
            const newState = this.applyMove(gameState, move);
            const value = this.minimax(newState, this.maxDepth - 1, false, -Infinity, Infinity);
            
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        console.log("AI chose move:", bestMove);
        return bestMove;
    }

    // Algoritmo Minimax com Alpha-Beta Pruning
    minimax(gameState, depth, isMaximizing, alpha, beta) {
        // Condição de término: profundidade máxima ou jogo acabado
        if (depth === 0 || this.isGameOver(gameState)) {
            return this.evaluate(gameState);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            const possibleMoves = this.generatePossibleMoves(gameState, this.simulateDiceRoll());
            
            for (const move of possibleMoves) {
                const newState = this.applyMove(gameState, move);
                const eval = this.minimax(newState, depth - 1, false, alpha, beta);
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                
                if (beta <= alpha) break; // Alpha-Beta pruning
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            const possibleMoves = this.generatePossibleMoves(gameState, this.simulateDiceRoll());
            
            for (const move of possibleMoves) {
                const newState = this.applyMove(gameState, move);
                const eval = this.minimax(newState, depth - 1, true, alpha, beta);
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                
                if (beta <= alpha) break; // Alpha-Beta pruning
            }
            return minEval;
        }
    }

    // Gera todos os movimentos possíveis para um dado valor
    generatePossibleMoves(gameState, diceRoll) {
        const moves = [];
        const aiPieces = gameState.getAIPieces(); // Peças da IA
        
        for (const piece of aiPieces) {
            if (this.isValidMove(gameState, piece, diceRoll)) {
                moves.push({
                    pieceId: piece.id,
                    fromPosition: piece.position,
                    toPosition: this.calculateNewPosition(piece.position, diceRoll),
                    diceRoll: diceRoll
                });
            }
        }
        
        return moves;
    }

    // Verifica se um movimento é válido
    isValidMove(gameState, piece, diceRoll) {
        const newPosition = this.calculateNewPosition(piece.position, diceRoll);
        
        // Verifica se está dentro do tabuleiro
        if (!this.isWithinBoard(newPosition)) {
            return false;
        }
        
        // Verifica se a casa destino está vazia ou tem peça adversária (dependendo das regras)
        if (!gameState.isCellEmpty(newPosition)) {
            return false;
        }
        
        // Verifica se não há peças bloqueando o caminho
        if (this.hasBlockingPieces(gameState, piece.position, newPosition)) {
            return false;
        }
        
        return true;
    }

    // Função de avaliação - mais importante!
    evaluate(gameState) {
        let score = 0;
        
        // 1. Progresso das peças (quanto mais perto do objetivo, melhor)
        score += this.calculateProgressScore(gameState);
        
        // 2. Mobilidade (quantos movimentos possíveis)
        score += this.calculateMobilityScore(gameState);
        
        // 3. Estratégia de bloqueio
        score += this.calculateBlockingScore(gameState);
        
        // 4. Peças seguras vs vulneráveis
        score += this.calculateSafetyScore(gameState);
        
        return score;
    }

    // Calcula score baseado no progresso das peças
    calculateProgressScore(gameState) {
        let progress = 0;
        const aiPieces = gameState.getAIPieces();
        const playerPieces = gameState.getPlayerPieces();
        
        // Progresso da IA (positivo)
        for (const piece of aiPieces) {
            progress += this.getDistanceToGoal(piece.position, 'ai');
        }
        
        // Progresso do jogador (negativo)
        for (const piece of playerPieces) {
            progress -= this.getDistanceToGoal(piece.position, 'player') * 0.8;
        }
        
        return progress;
    }

    // Calcula score baseado na mobilidade
    calculateMobilityScore(gameState) {
        const aiMobility = this.generatePossibleMoves(gameState, 6).length; // Usa dado 6 para máxima mobilidade
        const playerMobility = this.generatePossibleMovesForPlayer(gameState, 6).length;
        
        return (aiMobility - playerMobility) * 2;
    }

    // Score baseado em bloqueios estratégicos
    calculateBlockingScore(gameState) {
        let blockingScore = 0;
        // Implementar lógica de bloqueio baseada nas regras do Tâb
        return blockingScore;
    }

    // Score baseado em segurança das peças
    calculateSafetyScore(gameState) {
        let safetyScore = 0;
        // Implementar lógica de segurança
        return safetyScore;
    }

    // Funções auxiliares (você precisará adaptar conforme sua implementação)
    calculateNewPosition(currentPos, diceRoll) {
        // Implementar cálculo da nova posição baseado nas regras do Tâb
        return currentPos + diceRoll;
    }

    isWithinBoard(position) {
        // Verificar se a posição está dentro do tabuleiro
        return position >= 0 && position < this.boardSize;
    }

    hasBlockingPieces(gameState, fromPos, toPos) {
        // Verificar se há peças bloqueando o caminho
        for (let pos = fromPos + 1; pos < toPos; pos++) {
            if (!gameState.isCellEmpty(pos)) {
                return true;
            }
        }
        return false;
    }

    getDistanceToGoal(position, player) {
        // Calcular distância até o objetivo
        if (player === 'ai') {
            return this.boardSize - 1 - position;
        } else {
            return position;
        }
    }

    isGameOver(gameState) {
        return gameState.isGameOver();
    }

    applyMove(gameState, move) {
        // Criar uma cópia do estado e aplicar o movimento
        const newState = gameState.clone();
        newState.movePiece(move.pieceId, move.toPosition);
        return newState;
    }

    simulateDiceRoll() {
        return Math.floor(Math.random() * 6) + 1;
    }

    generatePossibleMovesForPlayer(gameState, diceRoll) {
        // Similar ao generatePossibleMoves mas para o jogador humano
        const moves = [];
        const playerPieces = gameState.getPlayerPieces();
        
        for (const piece of playerPieces) {
            if (this.isValidMove(gameState, piece, diceRoll)) {
                moves.push({
                    pieceId: piece.id,
                    fromPosition: piece.position,
                    toPosition: this.calculateNewPosition(piece.position, diceRoll),
                    diceRoll: diceRoll
                });
            }
        }
        
        return moves;
    }
}

// Integração com seu jogo existente
class GameState {
    constructor(boardSize = 7) {
        this.boardSize = boardSize;
        this.pieces = [];
        this.currentPlayer = 'player1';
        this.initializePieces();
    }

    initializePieces() {
        // Inicializar peças do jogador e da IA
        for (let i = 0; i < 15; i++) {
            // Peças do jogador (lado inferior)
            this.pieces.push({ id: `player_${i}`, position: i, player: 'player' });
            // Peças da IA (lado superior)
            this.pieces.push({ id: `ai_${i}`, position: this.boardSize * this.boardSize - 1 - i, player: 'ai' });
        }
    }

    getAIPieces() {
        return this.pieces.filter(piece => piece.player === 'ai');
    }

    getPlayerPieces() {
        return this.pieces.filter(piece => piece.player === 'player');
    }

    isCellEmpty(position) {
        return !this.pieces.some(piece => piece.position === position);
    }

    movePiece(pieceId, newPosition) {
        const piece = this.pieces.find(p => p.id === pieceId);
        if (piece) {
            piece.position = newPosition;
        }
    }

    isGameOver() {
        const aiPieces = this.getAIPieces();
        const playerPieces = this.getPlayerPieces();
        
        // Jogo acaba quando todas as peças de um jogador chegam ao objetivo
        const aiWon = aiPieces.every(piece => this.hasReachedGoal(piece.position, 'ai'));
        const playerWon = playerPieces.every(piece => this.hasReachedGoal(piece.position, 'player'));
        
        return aiWon || playerWon;
    }

    hasReachedGoal(position, player) {
        if (player === 'ai') {
            return position === 0; // Objetivo da IA (exemplo)
        } else {
            return position === this.boardSize * this.boardSize - 1; // Objetivo do jogador (exemplo)
        }
    }

    clone() {
        const newState = new GameState(this.boardSize);
        newState.pieces = JSON.parse(JSON.stringify(this.pieces));
        newState.currentPlayer = this.currentPlayer;
        return newState;
    }
}

// Uso no seu jogo
let aiPlayer = null;
let gameState = null;

function initializeAI(difficulty = 'medium') {
    aiPlayer = new TabAI(difficulty);
    gameState = new GameState(); // Você precisará integrar com seu estado atual do jogo
}

function handleAITurn(diceRoll) {
    if (!aiPlayer || !gameState) return;
    
    const aiMove = aiPlayer.makeMove(gameState, diceRoll);
    
    if (aiMove) {
        // Executar o movimento da IA no seu jogo
        setTimeout(() => {
            executeAIMove(aiMove);
        }, 1000); // Pequeno delay para parecer mais natural
    }
}

function executeAIMove(move) {
    // Integrar com sua lógica de movimento existente
    console.log("Executing AI move:", move);
    // gameBoard.movePiece(move.pieceId, move.toPosition);
    // updateGameBoard();
    // switchTurn();
}