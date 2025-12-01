const auth = require('./auth');
const storage = require('./storage');

class GameLogic {
    /**
     * Registra um novo utilizador
     */
    async register(nick, password) {
        if (storage.userExists(nick)) {
            throw new Error('Nick já está em uso');
        }

        const hashedPassword = auth.hashPassword(password);
        const userData = {
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            gamesPlayed: 0,
            wins: 0,
            score: 0,
            lastLogin: null
        };

        storage.setUser(nick, userData);
        return { success: true };
    }

    /**
     * Junta um jogador a um jogo
     */
    async join(nick, password, size = 2, gameId = null) {
        // Verificar credenciais
        const user = storage.getUser(nick);
        if (!user || !auth.verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        if (gameId) {
            // Juntar a jogo existente
            const game = storage.getGame(gameId);
            if (!game) {
                throw new Error('Jogo não encontrado');
            }

            if (game.status !== 'waiting') {
                throw new Error('Jogo já começou');
            }

            if (game.players.length >= game.size) {
                throw new Error('Jogo está cheio');
            }

            // Verificar se jogador já está no jogo
            if (game.players.some(p => p.nick === nick)) {
                throw new Error('Já estás neste jogo');
            }

            // Adicionar jogador
            game.players.push({
                nick,
                color: this.getAvailableColor(game),
                pieces: [0, 0, 0, 0], // Todas as peças na base
                score: 0,
                isReady: false
            });

            // Se atingiu o número máximo de jogadores, iniciar jogo
            if (game.players.length === game.size) {
                game.status = 'playing';
                game.currentPlayer = 0;
                game.startedAt = new Date().toISOString();
                game.diceValue = null;
            }

            storage.setGame(gameId, game);
            return { game: gameId };
        } else {
            // Criar novo jogo
            if (size < 2 || size > 4) {
                throw new Error('Size deve ser entre 2 e 4');
            }

            const newGameId = auth.generateGameId({ nick, size });
            const newGame = {
                id: newGameId,
                size: parseInt(size),
                players: [{
                    nick,
                    color: this.getPlayerColor(0),
                    pieces: [0, 0, 0, 0],
                    score: 0,
                    isReady: false
                }],
                status: 'waiting',
                createdAt: new Date().toISOString(),
                currentPlayer: 0,
                diceValue: null,
                boardSize: size * 16,
                moves: []
            };

            storage.setGame(newGameId, newGame);
            return { game: newGameId };
        }
    }

    /**
     * Sai de um jogo
     */
    async leave(nick, password, gameId) {
        // Verificar credenciais
        const user = storage.getUser(nick);
        if (!user || !auth.verifyPassword(password, user.password)) {
            throw new Error('Credenciais inválidas');
        }

        const game = storage.getGame(gameId);
        if (!game) {
            throw new Error('Jogo não encontrado');
        }

        // Remover jogador
        game.players = game.players.filter(p => p.nick !== nick);

        if (game.players.length === 0) {
            // Jogo vazio - apagar
            storage.deleteGame(gameId);
        } else if (game.status === 'playing') {
            // Ajustar turno se necessário
            const playerIndex = game.players.findIndex(p => p.nick === nick);
            if (playerIndex >= 0 && game.currentPlayer >= playerIndex) {
                game.currentPlayer = Math.max(0, game.currentPlayer - 1);
            }

            // Se só restar 1 jogador, terminar jogo
            if (game.players.length === 1) {
                game.status = 'finished';
                game.winner = game.players[0].nick;
                game.finishedAt = new Date().toISOString();
                
                // Atualizar estatísticas do vencedor
                const winner = storage.getUser(game.winner);
                winner.wins += 1;
                winner.score += 10;
                winner.gamesPlayed += 1;
                storage.setUser(game.winner, winner);
                storage.updateRanking(game.winner, 10);
            }
            
            storage.setGame(gameId, game);
        }

        return { success: true };
    }

    /**
     * Lança o dado
     */
    async roll(nick, password, gameId) {
        // Verificar credenciais
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

        // Verificar se é a vez do jogador
        const currentPlayer = game.players[game.currentPlayer];
        if (currentPlayer.nick !== nick) {
            throw new Error('Não é a tua vez de jogar');
        }

        // Lançar dado (1-6)
        const diceValue = Math.floor(Math.random() * 6) + 1;
        game.diceValue = diceValue;
        game.lastRoll = new Date().toISOString();

        // Verificar se há movimentos possíveis
        const possibleMoves = this.getPossibleMoves(game, currentPlayer, diceValue);
        const mustPass = possibleMoves.length === 0;

        storage.setGame(gameId, game);

        return {
            dice: diceValue,
            turn: nick,
            mustPass: mustPass,
            possibleMoves: mustPass ? [] : possibleMoves
        };
    }

    /**
     * Passa a vez
     */
    async pass(nick, password, gameId) {
        // Verificar credenciais
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

        // Verificar se é a vez do jogador
        const currentPlayer = game.players[game.currentPlayer];
        if (currentPlayer.nick !== nick) {
            throw new Error('Não é a tua vez de jogar');
        }

        // Verificar se pode passar (se não tem movimentos possíveis)
        if (game.diceValue && !game.mustPass) {
            const possibleMoves = this.getPossibleMoves(game, currentPlayer, game.diceValue);
            if (possibleMoves.length > 0) {
                throw new Error('Tens movimentos possíveis, não podes passar');
            }
        }

        // Passar para próximo jogador
        game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
        game.diceValue = null;
        game.mustPass = false;

        storage.setGame(gameId, game);

        return {
            success: true,
            turn: game.players[game.currentPlayer].nick,
            mustPass: false
        };
    }

    /**
     * Notifica um movimento
     */
    async notify(nick, password, gameId, cell) {
        // Verificar credenciais
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

        // Verificar se é a vez do jogador
        const currentPlayer = game.players[game.currentPlayer];
        if (currentPlayer.nick !== nick) {
            throw new Error('Não é a tua vez de jogar');
        }

        if (!game.diceValue) {
            throw new Error('Precisas lançar o dado primeiro');
        }

        // Validar movimento
        const validMove = this.validateMove(game, currentPlayer, cell, game.diceValue);
        if (!validMove.valid) {
            throw new Error(validMove.error);
        }

        // Executar movimento
        this.executeMove(game, currentPlayer, cell, game.diceValue);
        
        // Verificar se jogador ganhou
        const hasWon = currentPlayer.pieces.every(p => p === 100); // 100 = casa final
        if (hasWon) {
            game.status = 'finished';
            game.winner = nick;
            game.finishedAt = new Date().toISOString();
            
            // Atualizar estatísticas
            user.wins += 1;
            user.score += 20;
            user.gamesPlayed += 1;
            storage.setUser(nick, user);
            storage.updateRanking(nick, 20);
        } else {
            // Passar para próximo jogador
            game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
            game.diceValue = null;
        }

        // Registrar movimento
        game.moves.push({
            player: nick,
            from: validMove.from,
            to: cell,
            dice: game.diceValue,
            timestamp: new Date().toISOString()
        });

        storage.setGame(gameId, game);

        return {
            success: true,
            cell: cell,
            turn: game.players[game.currentPlayer]?.nick || null,
            winner: game.winner || null,
            pieces: currentPlayer.pieces
        };
    }

    /**
     * Obtém o ranking
     */
    async getRanking(filters = {}) {
        const rankings = storage.getSortedRankings(filters.limit || 50);
        return { ranking: rankings };
    }

    // Métodos auxiliares
    getPlayerColor(index) {
        const colors = ['red', 'blue', 'green', 'yellow'];
        return colors[index % colors.length];
    }

    getAvailableColor(game) {
        const usedColors = game.players.map(p => p.color);
        const colors = ['red', 'blue', 'green', 'yellow'];
        return colors.find(color => !usedColors.includes(color)) || colors[0];
    }

    getPossibleMoves(game, player, diceValue) {
        // Implementação simplificada - deve seguir as regras do Ludo
        const moves = [];
        
        for (let i = 0; i < player.pieces.length; i++) {
            const currentPos = player.pieces[i];
            
            // Peça na base só pode sair com 6
            if (currentPos === 0 && diceValue === 6) {
                moves.push({ piece: i, from: 0, to: 1 });
            }
            // Peça em jogo
            else if (currentPos > 0 && currentPos < 100) {
                const newPos = currentPos + diceValue;
                if (newPos <= 56) { // Tamanho máximo do tabuleiro
                    moves.push({ piece: i, from: currentPos, to: newPos });
                }
                // Entrar na reta final
                else if (this.canEnterFinalLane(player, currentPos, diceValue)) {
                    moves.push({ piece: i, from: currentPos, to: 100 + (newPos - 56) });
                }
            }
        }
        
        return moves;
    }

    validateMove(game, player, targetCell, diceValue) {
        const moves = this.getPossibleMoves(game, player, diceValue);
        const validMove = moves.find(move => move.to === targetCell);
        
        if (!validMove) {
            return { valid: false, error: 'Movimento inválido' };
        }
        
        // Verificar se a casa está ocupada por peça do mesmo jogador
        if (player.pieces.includes(targetCell) && targetCell < 100) {
            return { valid: false, error: 'Casa já ocupada por tua peça' };
        }
        
        return { 
            valid: true, 
            from: validMove.from,
            piece: validMove.piece 
        };
    }

    executeMove(game, player, targetCell, diceValue) {
        const moves = this.getPossibleMoves(game, player, diceValue);
        const move = moves.find(m => m.to === targetCell);
        
        if (!move) return;
        
        // Mover peça
        player.pieces[move.piece] = targetCell;
        
        // Verificar se capturou peça adversária
        if (targetCell < 100) {
            game.players.forEach(otherPlayer => {
                if (otherPlayer.nick !== player.nick) {
                    for (let i = 0; i < otherPlayer.pieces.length; i++) {
                        if (otherPlayer.pieces[i] === targetCell) {
                            // Mandar peça de volta para a base
                            otherPlayer.pieces[i] = 0;
                            break;
                        }
                    }
                }
            });
        }
    }

    canEnterFinalLane(player, currentPos, diceValue) {
        // Lógica simplificada para entrar na reta final
        // Em um Ludo real, isso depende da cor do jogador
        const finalLaneStart = 50; // Ajustar conforme as regras
        return currentPos >= finalLaneStart && (currentPos + diceValue) <= 56;
    }
}

module.exports = new GameLogic();