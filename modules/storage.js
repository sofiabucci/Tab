const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

class Storage {
    constructor() {
        this.users = {};
        this.games = {};
        this.rankings = {};
    }

    async init() {
        try {
            // Garantir que a pasta data existe
            await fs.mkdir(DATA_DIR, { recursive: true });
            
            // Carregar ou criar ficheiros
            await this.loadData('users.json');
            await this.loadData('games.json');
            await this.loadData('rankings.json');
            
            console.log('✅ Armazenamento inicializado com sucesso');
            console.log(`📊 ${Object.keys(this.users).length} utilizadores carregados`);
            console.log(`🎮 ${Object.keys(this.games).length} jogos carregados`);
            console.log(`🏆 ${Object.keys(this.rankings).length} rankings carregados`);
        } catch (error) {
            console.error('❌ Erro ao inicializar armazenamento:', error.message);
            // Criar estruturas vazias se houver erro
            this.users = {};
            this.games = {};
            this.rankings = {};
        }
    }

    async loadData(filename) {
        const filePath = path.join(DATA_DIR, filename);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            
            // Verificar se o arquivo está vazio
            if (!data || data.trim() === '') {
                console.log(`📄 ${filename} está vazio, criando estrutura padrão`);
                await this.saveData(filename, {});
                return;
            }
            
            const parsed = JSON.parse(data);
            
            switch (filename) {
                case 'users.json':
                    this.users = parsed;
                    console.log(`📄 ${filename} carregado: ${Object.keys(parsed).length} utilizadores`);
                    break;
                case 'games.json':
                    this.games = parsed;
                    console.log(`📄 ${filename} carregado: ${Object.keys(parsed).length} jogos`);
                    break;
                case 'rankings.json':
                    this.rankings = parsed;
                    console.log(`📄 ${filename} carregado: ${Object.keys(parsed).length} rankings`);
                    break;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Se o ficheiro não existe, cria um vazio
                console.log(`📄 ${filename} não existe, criando...`);
                await this.saveData(filename, {});
            } else if (error instanceof SyntaxError) {
                // Se JSON está corrompido, cria novo
                console.log(`⚠️  ${filename} corrompido, recriando...`);
                await this.saveData(filename, {});
            } else {
                console.error(`❌ Erro ao carregar ${filename}:`, error.message);
            }
        }
    }

    async saveData(filename, data) {
        const filePath = path.join(DATA_DIR, filename);
        
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`❌ Erro ao salvar ${filename}:`, error.message);
            return false;
        }
    }

    async persistAll() {
        try {
            await Promise.all([
                this.saveData('users.json', this.users),
                this.saveData('games.json', this.games),
                this.saveData('rankings.json', this.rankings)
            ]);
            console.log('💾 Dados persistidos com sucesso');
        } catch (error) {
            console.error('❌ Erro ao persistir dados:', error.message);
        }
    }

    // Métodos para users
    getUser(nick) {
        return this.users[nick];
    }

    setUser(nick, userData) {
        this.users[nick] = userData;
        // Salvar assincronamente
        this.saveData('users.json', this.users).catch(console.error);
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
        // Salvar assincronamente
        this.saveData('games.json', this.games).catch(console.error);
        return gameData;
    }

    deleteGame(gameId) {
        delete this.games[gameId];
        this.saveData('games.json', this.games).catch(console.error);
    }

    getAllGames() {
        return this.games;
    }

    // Métodos para rankings
    updateRanking(group, size, nick, victoryPoints = 0) {
        const key = `${group}_${size}`;
        
        if (!this.rankings[key]) {
            this.rankings[key] = {};
        }
        
        if (!this.rankings[key][nick]) {
            this.rankings[key][nick] = { victories: 0, games: 0 };
        }
        
        this.rankings[key][nick].victories += victoryPoints;
        this.rankings[key][nick].games += 1;
        
        // Salvar assincronamente
        this.saveData('rankings.json', this.rankings).catch(console.error);
        return this.rankings[key][nick];
    }

    getRanking(group, size, limit = 10) {
        const key = `${group}_${size}`;
        
        if (!this.rankings[key]) {
            return [];
        }
        
        return Object.entries(this.rankings[key])
            .map(([nick, stats]) => ({
                nick,
                victories: stats.victories || 0,
                games: stats.games || 0
            }))
            .sort((a, b) => {
                // Ordenar por vitórias (decrescente), depois por nick
                if (b.victories !== a.victories) {
                    return b.victories - a.victories;
                }
                return a.nick.localeCompare(b.nick);
            })
            .slice(0, limit);
    }
}

// Exportar instância única (Singleton)
module.exports = new Storage();