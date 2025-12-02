const http = require('http');
const url = require('url');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

// Carregar módulos
const auth = require('./modules/auth');
const game = require('./modules/game');
const storage = require('./modules/storage');
const validators = require('./modules/validators');

// Configurações - GRUPO 4
const PORT = 8104;
const PUBLIC_DIR = path.join(__dirname, 'public');

console.log(`👥 Grupo 4 - Servidor Tab na porta ${PORT}`);

// Inicializar armazenamento
storage.init().catch(console.error);

// Helper para respostas
function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    if (data && Object.keys(data).length === 0) {
        res.end('{}');
    } else {
        res.end(JSON.stringify(data));
    }
}

// Helper para ler body
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// Handlers POST
async function handlePostRequest(req, res, pathname, body) {
    let data;
    try {
        data = JSON.parse(body);
    } catch (e) {
        return sendResponse(res, 400, { error: 'JSON inválido' });
    }

    switch (pathname) {
        case '/register':
            await handleRegister(res, data);
            break;
        case '/join':
            await handleJoin(res, data);
            break;
        case '/leave':
            await handleLeave(res, data);
            break;
        case '/roll':
            await handleRoll(res, data);
            break;
        case '/pass':
            await handlePass(res, data);
            break;
        case '/notify':
            await handleNotify(res, data);
            break;
        default:
            sendResponse(res, 404, { error: 'Endpoint não encontrado' });
    }
}

// Handler GET /update (SSE)
function handleUpdate(req, res, query) {
    const { game: gameId, nick } = query;
    
    if (!gameId || !nick) {
        return sendResponse(res, 400, { error: 'Parâmetros game e nick são obrigatórios' });
    }

    const gameData = storage.getGame(gameId);
    if (!gameData) {
        return sendResponse(res, 404, { error: 'Invalid game reference' });
    }

    // Configurar SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    // Construir resposta conforme especificação
    const response = {};
    
    // Adicionar propriedades apenas se existirem
    if (gameData.pieces) response.pieces = gameData.pieces;
    if (gameData.initial) response.initial = gameData.initial;
    if (gameData.step) response.step = gameData.step;
    if (gameData.turn) response.turn = gameData.turn;
    if (gameData.players && Object.keys(gameData.players).length > 0) response.players = gameData.players;
    if (gameData.dice) response.dice = gameData.dice;
    if (gameData.selected && gameData.selected.length > 0) response.selected = gameData.selected;
    if (gameData.winner !== undefined) response.winner = gameData.winner;
    if (gameData.mustPass !== undefined) response.mustPass = gameData.mustPass;

    // Enviar estado inicial
    res.write(`data: ${JSON.stringify(response)}\n\n`);

    // Timer para fechar conexão após jogo terminado
    let interval;
    if (gameData.status === 'finished') {
        // Fechar após 5 segundos se jogo terminou
        setTimeout(() => {
            if (!res.finished) {
                res.end();
            }
        }, 5000);
    } else {
        // Ping para manter conexão
        interval = setInterval(() => {
            if (!res.finished) {
                res.write(': ping\n\n');
            }
        }, 30000);
    }

    req.on('close', () => {
        if (interval) clearInterval(interval);
    });
}

// Handler GET /ranking
async function handleRanking(req, res, query) {
    const { group, size } = query;
    
    // Validar parâmetros conforme especificação
    if (group === undefined) {
        return sendResponse(res, 400, { error: 'Undefined group' });
    }
    
    const groupNum = parseInt(group);
    if (isNaN(groupNum)) {
        return sendResponse(res, 400, { error: `Invalid group '${group}'` });
    }
    
    if (size === undefined) {
        return sendResponse(res, 400, { error: "Invalid size 'undefined'" });
    }
    
    const sizeNum = parseInt(size);
    if (isNaN(sizeNum) || sizeNum % 2 === 0 || sizeNum < 7 || sizeNum > 15) {
        return sendResponse(res, 400, { error: `Invalid size '${size}' - must be odd number between 7 and 15` });
    }

    try {
        const ranking = await game.getRanking(groupNum, sizeNum);
        sendResponse(res, 200, { ranking });
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

// Servir ficheiros estáticos
function serveStaticFile(req, res, filePath) {
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.json': 'application/json',
        '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, html) => {
                    if (err) {
                        sendResponse(res, 404, { error: 'Ficheiro não encontrado' });
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(html, 'utf-8');
                    }
                });
            } else {
                sendResponse(res, 500, { error: 'Erro interno do servidor' });
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// Handlers específicos
async function handleRegister(res, data) {
    const validation = validators.validateRegister(data);
    if (!validation.valid) {
        return sendResponse(res, 400, { error: validation.error });
    }

    try {
        await game.register(data.nick, data.password);
        sendResponse(res, 200, {});
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

async function handleJoin(res, data) {
    const validation = validators.validateJoin(data);
    if (!validation.valid) {
        return sendResponse(res, 400, { error: validation.error });
    }

    try {
        const result = await game.join(data.group, data.nick, data.password, data.size);
        sendResponse(res, 200, result);
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

async function handleLeave(res, data) {
    const validation = validators.validateAuth(data);
    if (!validation.valid) {
        return sendResponse(res, 400, { error: validation.error });
    }

    if (!data.game) {
        return sendResponse(res, 400, { error: 'Parâmetro game é obrigatório' });
    }

    try {
        await game.leave(data.nick, data.password, data.game);
        sendResponse(res, 200, {});
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

async function handleRoll(res, data) {
    const validation = validators.validateAuth(data);
    if (!validation.valid) {
        return sendResponse(res, 400, { error: validation.error });
    }

    if (!data.game) {
        return sendResponse(res, 400, { error: 'Parâmetro game é obrigatório' });
    }

    try {
        await game.roll(data.nick, data.password, data.game);
        sendResponse(res, 200, {});
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

async function handlePass(res, data) {
    const validation = validators.validateAuth(data);
    if (!validation.valid) {
        return sendResponse(res, 400, { error: validation.error });
    }

    if (!data.game) {
        return sendResponse(res, 400, { error: 'Parâmetro game é obrigatório' });
    }

    try {
        await game.pass(data.nick, data.password, data.game);
        sendResponse(res, 200, {});
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

async function handleNotify(res, data) {
    const validation = validators.validateNotify(data);
    if (!validation.valid) {
        return sendResponse(res, 400, { error: validation.error });
    }

    try {
        await game.notify(data.nick, data.password, data.game, data.cell);
        sendResponse(res, 200, {});
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

    try {
        if (method === 'POST') {
            const body = await readBody(req);
            await handlePostRequest(req, res, pathname, body);
        } else if (method === 'GET' && pathname === '/update') {
            handleUpdate(req, res, parsedUrl.query);
        } else if (method === 'GET' && pathname === '/ranking') {
            handleRanking(req, res, parsedUrl.query);
        } else {
            // Ficheiros estáticos
            let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
            serveStaticFile(req, res, filePath);
        }
    } catch (error) {
        console.error('Erro no servidor:', error);
        sendResponse(res, 500, { error: 'Erro interno do servidor' });
    }
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor Tab do Grupo 4 iniciado: http://localhost:${PORT}`);
    console.log(`📊 Ranking: http://localhost:${PORT}/ranking?group=4&size=5`);
});

// Shutdown graceful
process.on('SIGINT', async () => {
    console.log('\n🔄 Encerrando servidor...');
    server.close(async () => {
        await storage.persistAll();
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Encerrando servidor...');
    server.close(async () => {
        await storage.persistAll();
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

module.exports = server;