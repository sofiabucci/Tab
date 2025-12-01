const http = require('http');
const url = require('url');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

// Carregar módulos do servidor
const auth = require('./modules/auth');
const game = require('./modules/game');
const storage = require('./modules/storage');
const validators = require('./modules/validators');

// Configurações - GRUPO 4
const PORT = 8104; // PORT 81XX onde XX=4
const PUBLIC_DIR = path.join(__dirname, 'public');

console.log(`👥 Grupo 4 - Servidor na porta ${PORT}`);

// Inicializar armazenamento
storage.init();

// Helper para enviar respostas
function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// Helper para ler body da requisição
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// Handler para pedidos POST
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
        case '/ranking':
            await handleRanking(res);
            break;
        default:
            sendResponse(res, 404, { error: 'Endpoint não encontrado' });
    }
}

// Handler: Server-Sent Events para /update
function handleUpdate(req, res, query) {
    const gameId = query.game;
    
    if (!gameId) {
        return sendResponse(res, 400, { error: 'Parâmetro game é obrigatório' });
    }

    const gameData = storage.getGame(gameId);
    if (!gameData) {
        return sendResponse(res, 404, { error: 'Jogo não encontrado' });
    }

    // Configurar SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    // Enviar estado inicial do jogo
    res.write(`data: ${JSON.stringify({
        game: gameId,
        players: gameData.players,
        status: gameData.status,
        turn: gameData.players[gameData.currentPlayer]?.nick,
        pieces: gameData.players.map(p => p.pieces),
        dice: gameData.diceValue
    })}\n\n`);

    // Manter conexão aberta por 60 segundos
    const interval = setInterval(() => {
        res.write(': ping\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(interval);
        console.log(`Conexão SSE fechada para jogo ${gameId}`);
    });
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
                // Se não for ficheiro estático, tentar servir index.html para SPA
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
        sendResponse(res, 200, { success: true });
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
        const result = await game.join(data.nick, data.password, data.size, data.game);
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
        sendResponse(res, 200, { success: true });
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
        const result = await game.roll(data.nick, data.password, data.game);
        sendResponse(res, 200, result);
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
        const result = await game.pass(data.nick, data.password, data.game);
        sendResponse(res, 200, result);
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
        const result = await game.notify(data.nick, data.password, data.game, data.cell);
        sendResponse(res, 200, result);
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

async function handleRanking(res) {
    try {
        const result = await game.getRanking();
        sendResponse(res, 200, result);
    } catch (error) {
        sendResponse(res, 400, { error: error.message });
    }
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
    // CORS headers
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

    // Log da requisição
    console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

    try {
        if (method === 'POST') {
            const body = await readBody(req);
            await handlePostRequest(req, res, pathname, body);
        } else if (method === 'GET' && pathname === '/update') {
            handleUpdate(req, res, parsedUrl.query);
        } else {
            // Servir ficheiros estáticos
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
    console.log(`Servidor do Grupo 4 iniciado!`);
});

// Tratar shutdown graceful
process.on('SIGINT', () => {
    console.log('\n🔄 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🔄 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

// Exportar para testes
module.exports = server;