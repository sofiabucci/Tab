const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

class Storage {
    constructor() {
        this.users = {};
        this.games = {};
        this.rankings = {};
    }

    /**
     * Inicializa o armazenamento
     */
    async init() {
        try {
            // Garantir que a pasta data existe
            await fs.mkdir(DATA_DIR, { recursive: true });
            
            // Carregar ou criar ficheiros
            await this.loadData('users.json');
            await this.loadData('games.json');
            await this.loadData('rankings.json');
            
            console.log(' Armazenamento inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar armazenamento:', error);
            // Criar estruturas vazias se houver erro
            this.users = {};
            this.games = {};
            this.rankings = {};
        }
    }

    /**
     * Carrega dados de um ficheiro JSON
     */
    async loadData(filename) {
        const filePath = path.join(DATA_DIR, filename);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(data);
            
            switch (filename) {
                case 'users.json':
                    this.users = parsed;
                    break;
                case 'games.json':
                    this.games = parsed;
                    break;
                case 'rankings.json':
                    this.rankings = parsed;
                    break;
            }
            
            console.log(`📄 ${filename} carregado: ${Object.keys(parsed).length} registros`);
        } catch (error) {
            // Se o ficheiro não existe, cria um vazio
            if (error.code === 'ENOENT') {
                await this.saveData(filename, {});
                console.log(`📄 ${filename} criado vazio`);
            } else {
                console.error(`❌ Erro ao carregar ${filename}:`, error);
            }
        }
    }

    /**
     * Salva dados em um ficheiro JSON
     */
    async saveData(filename, data) {
        const filePath = path.join(DATA_DIR, filename);
        
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`❌ Erro ao salvar ${filename}:`, error);
            return false;
        }
    }

    /**
     * Persiste todos os dados
     */
    async persistAll() {
        await Promise.all([
            this.saveData('users.json', this.users),
            this.saveData('games.json', this.games),
            this.saveData('rankings.json', this.rankings)
        ]);
    }

    // Métodos para users
    getUser(nick) {
        return this.users[nick];
    }

    setUser(nick, userData) {
        this.users[nick] = userData;
        this.saveData('users.json', this.users);
        return userData;
    }

    userExists(nick) {
        return !!this.users[nick];
    }

    // Métodos para games
    getGame(gameId) {
        return this.games[gameId];
    }

    setGame(gameId, gameData) {
        this.games[gameId] = gameData;
        this.saveData('games.json', this.games);
        return gameData;
    }

    deleteGame(gameId) {
        delete this.games[gameId];
        this.saveData('games.json', this.games);
    }

    getAllGames() {
        return this.games;
    }

    // Métodos para rankings
    getRankings() {
        return this.rankings;
    }

    updateRanking(nick, points) {
        if (!this.rankings[nick]) {
            this.rankings[nick] = 0;
        }
        this.rankings[nick] += points;
        this.saveData('rankings.json', this.rankings);
        return this.rankings[nick];
    }

    getSortedRankings(limit = 10) {
        return Object.entries(this.rankings)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([nick, score]) => ({ nick, score }));
    }
}

// Exportar instância única (Singleton)
module.exports = new Storage();