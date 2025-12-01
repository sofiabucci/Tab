const auth = require('./auth');
const storage = require('./storage');

class TabGame {
    constructor() {
        // Timeouts para jogadores
        this.timeouts = new Map();
    }

    /**
     * Registra um novo utilizador
     */
    async register(nick, password) {
        const user = storage.getUser(nick);
        
        if (user) {
            // Verificar se password é a mesma
            if (!auth.verifyPassword(password, user.password)) {
                throw new Error('User registered with a different password');
            }
            return; // Já registrado com mesma password
        }

        const hashedPassword = auth.hashPassword(password);
        const userData = {
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            gamesPlayed: 0,
            victories: 0,
            lastLogin: new Date().toISOString()
        };

        storage.setUser(nick, userData);
    }

    /**
     * Junta um jogador a um jogo
     */
    async join(group, nick, password, size) {
        // Verificar credenciais
        const user = storage.getUser(nick);
        if (!user || !auth.verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        // Validar size ímpar
        const sizeNum = parseInt(size);
        if (isNaN(sizeNum) || sizeNum % 2 === 0 || sizeNum < 3) {
            throw new Error(`Invalid size '${size}'`);
        }

        // Procurar jogo em espera com mesmo group e size
        const waitingGames = Object.values(storage.getAllGames()).filter(game => 
            game.group === parseInt(group) && 
            game.size === sizeNum && 
            game.status === 'waiting' &&
            Object.keys(game.players).length === 1
        );

        if (waitingGames.length > 0) {
            // Juntar a jogo existente
            const game = waitingGames[0];
            const existingPlayer = Object.keys(game.players)[0];
            
            // Definir cores
            game.players[nick] = 'Red'; // Segundo jogador é Red
            game.players[existingPlayer] = 'Blue'; // Primeiro jogador é Blue
            
            // Inicializar tabuleiro
            game.pieces = this.initializeBoard(sizeNum, existingPlayer, nick);
            game.status = 'playing';
            game.initial = existingPlayer;
            game.turn = existingPlayer;
            game.step = 'from';
            game.dice = null;
            game.selected = [];
            game.startedAt = new Date().toISOString();
            game.moves = [];
            
            // Limpar timeout do jogo em espera
            this.clearGameTimeout(game.id);
            // Configurar timeout para jogadas
            this.setGameTimeout(game.id);
            
            storage.setGame(game.id, game);
            return { game: game.id };
        } else {
            // Criar novo jogo
            const gameId = auth.generateGameId({ group, nick, size, timestamp: Date.now() });
            
            const newGame = {
                id: gameId,
                group: parseInt(group),
                size: sizeNum,
                players: { [nick]: null }, // Cor será definida quando houver adversário
                status: 'waiting',
                createdAt: new Date().toISOString(),
                initial: null,
                turn: null,
                step: null,
                dice: null,
                selected: [],
                pieces: null,
                winner: null,
                moves: [],
                mustPass: null
            };

            // Configurar timeout de 5 minutos para jogo em espera
            this.setWaitingTimeout(gameId, nick);
            
            storage.setGame(gameId, newGame);
            return { game: gameId };
        }
    }

    /**
     * Sai de um jogo
     */
    async leave(nick, password, gameId) {
        const user = storage.getUser(nick);
        if (!user || !auth.verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        const game = storage.getGame(gameId);
        if (!game) {
            throw new Error('Jogo não encontrado');
        }

        // Limpar timeout
        this.clearGameTimeout(gameId);

        // Se jogo está em espera, apenas remover
        if (game.status === 'waiting') {
            delete game.players[nick];
            if (Object.keys(game.players).length === 0) {
                storage.deleteGame(gameId);
            } else {
                storage.setGame(gameId, game);
            }
            return;
        }

        // Se jogo está em andamento, conceder vitória ao adversário
        if (game.status === 'playing') {
            const opponent = Object.keys(game.players).find(p => p !== nick);
            if (opponent) {
                game.status = 'finished';
                game.winner = opponent;
                game.finishedAt = new Date().toISOString();
                
                // Atualizar estatísticas
                const opponentUser = storage.getUser(opponent);
                opponentUser.victories += 1;
                opponentUser.gamesPlayed += 1;
                storage.setUser(opponent, opponentUser);
                storage.updateRanking(game.group, game.size, opponent, 1);
                
                user.gamesPlayed += 1;
                storage.setUser(nick, user);
            }
        }

        storage.setGame(gameId, game);
    }

    /**
     * Lança os paus
     */
    async roll(nick, password, gameId) {
        const user = storage.getUser(nick);
        if (!user || !auth.verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        const game = storage.getGame(gameId);
        if (!game) {
            throw new Error('Jogo não encontrado');
        }

        if (game.status !== 'playing') {
            throw new Error('Jogo não está em andamento');
        }

        if (game.turn !== nick) {
            throw new Error('Not your turn to play');
        }

        if (game.dice && game.dice.keepPlaying) {
            throw new Error('You already rolled the dice but can roll it again');
        }

        // Lançar os 4 paus
        const dice = this.rollDice();
        game.dice = dice;
        game.step = 'from';
        game.selected = [];

        // Verificar movimentos possíveis
        const possibleMoves = this.getPossibleMoves(game, nick, dice.value);
        
        if (possibleMoves.length === 0) {
            game.mustPass = nick;
            // Se não pode mover e não pode jogar novamente, forçar pass
            if (!dice.keepPlaying) {
                const players = Object.keys(game.players);
                const currentIndex = players.indexOf(nick);
                const nextIndex = (currentIndex + 1) % players.length;
                game.turn = players[nextIndex];
                game.dice = null;
                game.mustPass = null;
            }
        } else {
            game.mustPass = null;
        }

        // Reiniciar timeout
        this.clearGameTimeout(gameId);
        this.setGameTimeout(gameId);
        
        storage.setGame(gameId, game);
    }

    /**
     * Passa a vez
     */
    async pass(nick, password, gameId) {
        const user = storage.getUser(nick);
        if (!user || !auth.verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        const game = storage.getGame(gameId);
        if (!game) {
            throw new Error('Jogo não encontrado');
        }

        if (game.status !== 'playing') {
            throw new Error('Jogo não está em andamento');
        }

        if (game.turn !== nick) {
            throw new Error('Not your turn to play');
        }

        // Verificar se pode passar
        if (game.dice) {
            if (game.dice.keepPlaying) {
                throw new Error('You already rolled the dice but can roll it again');
            }
            
            if (!game.mustPass || game.mustPass !== nick) {
                const possibleMoves = this.getPossibleMoves(game, nick, game.dice.value);
                if (possibleMoves.length > 0) {
                    throw new Error('You already rolled the dice and have valid moves');
                }
            }
        }

        // Passar para próximo jogador
        const players = Object.keys(game.players);
        const currentIndex = players.indexOf(nick);
        const nextIndex = (currentIndex + 1) % players.length;
        
        game.turn = players[nextIndex];
        game.dice = null;
        game.step = 'from';
        game.selected = [];
        game.mustPass = null;

        // Reiniciar timeout
        this.clearGameTimeout(gameId);
        this.setGameTimeout(gameId);
        
        storage.setGame(gameId, game);
    }

    /**
     * Notifica um movimento
     */
    async notify(nick, password, gameId, cell) {
        const user = storage.getUser(nick);
        if (!user || !auth.verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        const game = storage.getGame(gameId);
        if (!game) {
            throw new Error('Jogo não encontrado');
        }

        if (game.status !== 'playing') {
            throw new Error('Jogo não está em andamento');
        }

        if (game.turn !== nick) {
            throw new Error('not your turn to play');
        }

        // Validar cell conforme especificação
        if (typeof cell !== 'number' || !Number.isInteger(cell)) {
            throw new Error('cell is not an integer');
        }
        
        if (cell < 0) {
            throw new Error('cell is negative');
        }
        
        if (cell >= game.size * 4) {
            throw new Error('Invalid move: cell out of bounds');
        }

        if (!game.dice) {
            throw new Error('Must roll dice first');
        }

        // Processar movimento
        const result = this.processMove(game, nick, cell);
        
        if (result.error) {
            throw new Error(result.error);
        }

        // Verificar se jogador ganhou
        if (this.hasPlayerWon(game, nick)) {
            game.status = 'finished';
            game.winner = nick;
            game.finishedAt = new Date().toISOString();
            game.dice = null;
            game.step = null;
            game.selected = [];
            
            // Atualizar estatísticas
            user.victories += 1;
            user.gamesPlayed += 1;
            storage.setUser(nick, user);
            storage.updateRanking(game.group, game.size, nick, 1);
            
            // Atualizar perdedor
            const opponent = Object.keys(game.players).find(p => p !== nick);
            if (opponent) {
                const opponentUser = storage.getUser(opponent);
                opponentUser.gamesPlayed += 1;
                storage.setUser(opponent, opponentUser);
            }
            
            // Limpar timeout
            this.clearGameTimeout(gameId);
        } else {
            // Reiniciar timeout
            this.clearGameTimeout(gameId);
            this.setGameTimeout(gameId);
        }

        storage.setGame(gameId, game);
    }

    /**
     * Obtém o ranking
     */
    async getRanking(group, size) {
        const rankings = storage.getRanking(group, size, 10);
        return rankings;
    }

    // ========== MÉTODOS AUXILIARES ==========

    /**
     * Inicializa o tabuleiro
     */
    initializeBoard(size, player1, player2) {
        const totalCells = size * 4;
        const pieces = Array(totalCells).fill(null);
        
        // Posicionar peças do jogador 1 (Blue) - posições 0 a size-1
        for (let i = 0; i < size; i++) {
            pieces[i] = {
                color: 'Blue',
                inMotion: false,
                reachedLastRow: false,
                player: player1
            };
        }
        
        // Posicionar peças do jogador 2 (Red) - posições 3*size a 4*size-1
        for (let i = 3 * size; i < 4 * size; i++) {
            pieces[i] = {
                color: 'Red',
                inMotion: false,
                reachedLastRow: false,
                player: player2
            };
        }
        
        return pieces;
    }

    /**
     * Lança os 4 paus (CORRETO para Tab)
     */
    rollDice() {
        // Gerar 4 valores booleanos (false=escuro/arredondado, true=claro/plano)
        const stickValues = Array(4).fill().map(() => Math.random() > 0.5);
        
        // Contar true (claros/planos)
        const trueCount = stickValues.filter(v => v).length;
        
        // Calcular valor conforme regras do Tab:
        // 0 true = 6 pontos, 1 true = 1 ponto, 2 true = 2 pontos, etc.
        let value;
        switch (trueCount) {
            case 0: value = 6; break;    // 0 true = 6 pontos
            case 1: value = 1; break;    // 1 true = 1 ponto (Tâb)
            case 2: value = 2; break;
            case 3: value = 3; break;
            case 4: value = 4; break;    // 4 true = 4 pontos
            // NUNCA 5!
        }
        
        // Pode jogar novamente se sair 6 (0 true)
        const keepPlaying = trueCount === 0;
        
        return { stickValues, value, keepPlaying };
    }

    /**
     * Obtém movimentos possíveis
     */
    getPossibleMoves(game, player, diceValue) {
        const moves = [];
        const playerColor = game.players[player];
        
        for (let i = 0; i < game.pieces.length; i++) {
            const piece = game.pieces[i];
            if (!piece || piece.player !== player) continue;
            
            // Calcular posição destino
            let targetPos;
            if (playerColor === 'Blue') {
                targetPos = (i + diceValue) % (game.size * 4);
            } else { // Red
                targetPos = (i - diceValue + game.size * 4) % (game.size * 4);
            }
            
            // Verificar se movimento é válido
            const validation = this.validateMove(game, i, targetPos, player, diceValue);
            if (validation.valid) {
                moves.push({
                    from: i,
                    to: targetPos,
                    captures: validation.captures || []
                });
            }
        }
        
        return moves;
    }

    /**
     * Processa um movimento
     */
    processMove(game, player, cell) {
        const playerColor = game.players[player];
        
        switch (game.step) {
            case 'from':
                return this.processFromStep(game, player, cell);
                
            case 'to':
                return this.processToStep(game, player, cell);
                
            case 'take':
                return this.processTakeStep(game, player, cell);
                
            default:
                return { error: 'Invalid game step' };
        }
    }

    /**
     * Processa step 'from'
     */
    processFromStep(game, player, cell) {
        // Verificar se cell tem uma peça do jogador
        const piece = game.pieces[cell];
        if (!piece || piece.player !== player) {
            return { error: 'No piece at this position' };
        }
        
        // Verificar se peça pode mover com o valor do dado
        const moves = this.getPossibleMoves(game, player, game.dice.value);
        const possibleMove = moves.find(m => m.from === cell);
        
        if (!possibleMove) {
            return { error: 'Cannot move this piece' };
        }
        
        // Se não houver capturas, executar movimento imediatamente
        if (possibleMove.captures.length === 0) {
            this.executeMove(game, cell, possibleMove.to, player);
            game.step = 'from';
            game.selected = [cell, possibleMove.to];
            
            // Registrar movimento
            game.moves.push({
                player,
                from: cell,
                to: possibleMove.to,
                dice: game.dice,
                timestamp: new Date().toISOString()
            });
            
            // Verificar se mantém turno
            if (!game.dice.keepPlaying) {
                this.nextTurn(game);
            }
            
            return { success: true };
        }
        
        // Se houver capturas, avançar para step 'take'
        game.step = 'take';
        game.selected = [cell];
        game.pendingMove = possibleMove;
        
        return { success: true, step: 'take', captures: possibleMove.captures };
    }

    /**
     * Processa step 'to'
     */
    processToStep(game, player, cell) {
        // Completa um movimento já iniciado
        if (!game.selected || game.selected.length !== 1) {
            return { error: 'Invalid selection state' };
        }
        
        const from = game.selected[0];
        const possibleMoves = this.getPossibleMoves(game, player, game.dice.value);
        const validMove = possibleMoves.find(m => m.from === from && m.to === cell);
        
        if (!validMove) {
            return { error: 'Invalid move: must play the dice\'s value' };
        }
        
        // Verificar se está tentando capturar própria peça
        const targetPiece = game.pieces[cell];
        if (targetPiece && targetPiece.player === player) {
            return { error: 'cannot capture to your own piece' };
        }
        
        this.executeMove(game, from, cell, player);
        game.step = 'from';
        game.selected = [from, cell];
        
        // Registrar movimento
        game.moves.push({
            player,
            from: from,
            to: cell,
            dice: game.dice,
            timestamp: new Date().toISOString()
        });
        
        if (!game.dice.keepPlaying) {
            this.nextTurn(game);
        }
        
        return { success: true };
    }

    /**
     * Processa step 'take'
     */
    processTakeStep(game, player, cell) {
        // O jogador deve escolher qual peça capturar
        if (!game.pendingMove || !game.selected || game.selected.length !== 1) {
            return { error: 'Invalid selection state' };
        }
        
        const from = game.selected[0];
        const pendingMove = game.pendingMove;
        
        if (!pendingMove.captures.includes(cell)) {
            return { error: 'Invalid capture' };
        }
        
        // Executar movimento com captura
        this.executeMove(game, from, pendingMove.to, player, cell);
        game.step = 'from';
        game.selected = [from, pendingMove.to];
        delete game.pendingMove;
        
        // Registrar movimento com captura
        game.moves.push({
            player,
            from: from,
            to: pendingMove.to,
            capture: cell,
            dice: game.dice,
            timestamp: new Date().toISOString()
        });
        
        if (!game.dice.keepPlaying) {
            this.nextTurn(game);
        }
        
        return { success: true };
    }

    /**
     * Executa um movimento
     */
    executeMove(game, from, to, player, captureCell = null) {
        // Mover peça
        const piece = game.pieces[from];
        game.pieces[from] = null;
        game.pieces[to] = piece;
        
        // Atualizar estado da peça
        piece.inMotion = true;
        
        // Verificar se chegou à última linha
        const playerColor = game.players[player];
        const lastRowStart = playerColor === 'Blue' ? 3 * game.size : 0;
        const lastRowEnd = playerColor === 'Blue' ? 4 * game.size : game.size;
        
        if (to >= lastRowStart && to < lastRowEnd) {
            piece.reachedLastRow = true;
        }
        
        // Capturar peça adversária se especificado
        if (captureCell !== null && game.pieces[captureCell]) {
            game.pieces[captureCell] = null;
        }
    }

    /**
     * Valida um movimento
     */
    validateMove(game, from, to, player, diceValue) {
        const playerColor = game.players[player];
        const fromPiece = game.pieces[from];
        
        if (!fromPiece || fromPiece.player !== player) {
            return { valid: false };
        }
        
        // Verificar se está tentando mover para casa com própria peça
        const toPiece = game.pieces[to];
        if (toPiece && toPiece.player === player) {
            return { valid: false };
        }
        
        // Verificar capturas no caminho
        const captures = this.getCapturesOnPath(game, from, to, player);
        
        return { valid: true, captures };
    }

    /**
     * Obtém peças que podem ser capturadas no caminho
     */
    getCapturesOnPath(game, from, to, player) {
        const captures = [];
        const playerColor = game.players[player];
        const direction = playerColor === 'Blue' ? 1 : -1;
        const totalCells = game.size * 4;
        
        let current = from;
        const visited = new Set();
        
        while (current !== to) {
            current = (current + direction + totalCells) % totalCells;
            
            // Evitar loops infinitos
            if (visited.has(current)) break;
            visited.add(current);
            
            const piece = game.pieces[current];
            if (piece && piece.player !== player) {
                captures.push(current);
            }
        }
        
        return captures;
    }

    /**
     * Avança para próximo turno
     */
    nextTurn(game) {
        const players = Object.keys(game.players);
        const currentIndex = players.indexOf(game.turn);
        const nextIndex = (currentIndex + 1) % players.length;
        
        game.turn = players[nextIndex];
        game.dice = null;
        game.step = 'from';
        game.selected = [];
        game.mustPass = null;
    }

    /**
     * Verifica se jogador ganhou
     */
    hasPlayerWon(game, player) {
        const playerColor = game.players[player];
        const lastRowStart = playerColor === 'Blue' ? 3 * game.size : 0;
        const lastRowEnd = playerColor === 'Blue' ? 4 * game.size : game.size;
        
        // Verificar se todas as peças do jogador estão na última linha
        for (let i = 0; i < game.pieces.length; i++) {
            const piece = game.pieces[i];
            if (piece && piece.player === player) {
                // Peça não está na última linha
                if (i < lastRowStart || i >= lastRowEnd) {
                    return false;
                }
                // Peça não marcada como reachedLastRow
                if (!piece.reachedLastRow) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Configura timeout para jogo em espera
     */
    setWaitingTimeout(gameId, nick) {
        const timeout = setTimeout(async () => {
            const game = storage.getGame(gameId);
            if (game && game.status === 'waiting') {
                console.log(`⏰ Timeout: Jogo ${gameId} em espera há muito tempo`);
                // Fechar jogo
                storage.deleteGame(gameId);
            }
        }, 5 * 60 * 1000); // 5 minutos
        
        this.timeouts.set(`waiting_${gameId}`, timeout);
    }

    /**
     * Configura timeout para jogada (2 minutos)
     */
    setGameTimeout(gameId) {
        this.clearGameTimeout(gameId);
        
        const timeout = setTimeout(async () => {
            const game = storage.getGame(gameId);
            if (game && game.status === 'playing') {
                console.log(`⏰ Timeout: Jogador ${game.turn} excedeu tempo no jogo ${gameId}`);
                // Forçar leave do jogador atual
                try {
                    await this.leave(game.turn, 'timeout', gameId);
                } catch (error) {
                    // Ignorar erros de autenticação no timeout
                }
            }
        }, 2 * 60 * 1000); // 2 minutos
        
        this.timeouts.set(`game_${gameId}`, timeout);
    }

    /**
     * Limpa timeout do jogo
     */
    clearGameTimeout(gameId) {
        const waitingKey = `waiting_${gameId}`;
        const gameKey = `game_${gameId}`;
        
        if (this.timeouts.has(waitingKey)) {
            clearTimeout(this.timeouts.get(waitingKey));
            this.timeouts.delete(waitingKey);
        }
        
        if (this.timeouts.has(gameKey)) {
            clearTimeout(this.timeouts.get(gameKey));
            this.timeouts.delete(gameKey);
        }
    }
}

module.exports = new TabGame();