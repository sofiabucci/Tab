/**
 * ClientAPI.js
 * Módulo responsável por todas as comunicações com servidores remotos
 * Interface do cliente para servidores Official (8008) e Group (8104)
 */

(function(window){
  // Configuração dos servidores
  const SERVERS = {
    official: {
      name: 'Official Server',
      url: 'http://twserver.alunos.dcc.fc.up.pt:8008/',
      port: 8008
    },
    group: {
      name: 'Group Server',
      url: 'http://twserver.alunos.dcc.fc.up.pt:8104/',
      // url: 'http://localhost:8104/',
      port: 8104
    }
  };
  const group = 4;

  // Estado atual
  let currentServer = 'group'; // Default: Group Server
  let BASE = SERVERS[currentServer].url;
  let updateAbort = null;
  let updateRunning = false;

  /**
   * Mudar servidor ativo
   * @param {string} serverName - 'official' ou 'group'
   * @returns {boolean} - True se mudança bem sucedida
   */
  function setServer(serverName) {
    if (SERVERS[serverName]) {
      currentServer = serverName;
      BASE = SERVERS[serverName].url;
      console.log(`[ClientAPI] Switched to server: ${SERVERS[serverName].name} (${BASE})`);
      return true;
    }
    console.error(`[ClientAPI] Unknown server: ${serverName}`);
    return false;
  }

  /**
   * Obter informações do servidor atual
   */
  function getServerInfo() {
    return {
      current: currentServer,
      name: SERVERS[currentServer].name,
      url: BASE,
      port: SERVERS[currentServer].port,
      available: Object.keys(SERVERS)
    };
  }

  /**
   * Fazer requisição ao servidor atual
   */
  async function request(endpoint, params, options = {}){
    const url = BASE + endpoint;
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    };

    if(options.signal) fetchOptions.signal = options.signal;

    console.log(`[ClientAPI] ${endpoint} to ${SERVERS[currentServer].name}:`, params);

    try {
      const res = await fetch(url, fetchOptions);
      
      if(!res.ok){
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      
      const data = await res.json().catch(() => { 
        throw new Error('Invalid JSON response'); 
      });
      
      if(data.error) throw new Error(data.error);
      
      console.log(`[ClientAPI] ${endpoint} success:`, data);
      return data;
      
    } catch (error) {
      console.error(`[ClientAPI] ${endpoint} error:`, error);
      throw error;
    }
  }

  // Funções principais (compatíveis com ambos servidores)
  async function register(nick, password){
    return await request('register', { nick, password });
  }

  async function join(nick, password, size, game = null){
    const params = {group, nick, password, size };
    // if (game) params.game = game;
    return await request('join', params);
  }

  async function leave(nick, password, game){
    return await request('leave', { nick, password, game });
  }

  async function roll(nick, password, game, cell = 0){ // does not use cell
    return await request('roll', { nick, password, game });
  }

  async function passTurn(nick, password, game, cell = 0){ // does not use cell
    return await request('pass', { nick, password, game });
  }

  async function notify(nick, password, game, cell){
    return await request('notify', { nick, password, game, cell });
  }

  async function getRanking(size = 9){
    return await request('ranking', {group, size });
  }

  /**
   * UPDATE - Server-Sent Events para atualizações em tempo real
   */
  function startUpdateStream(game, nick, onMessage, onError){
    if(updateRunning){
      console.warn('[ClientAPI] Update stream already running');
      return;
    }
    
    updateRunning = true;
    updateAbort = { controller: null, stopped: false };

    // Usar GET para SSE com parâmetros na query string
    const sseUrl = `${BASE}update?game=${game}&nick=${nick}`;
    
    console.log(`[ClientAPI] Starting SSE to ${sseUrl}`);
    
    const eventSource = new EventSource(sseUrl);
    
    eventSource.onmessage = (event) => {
      try {
        if (event.data.trim() === ': ping') {
          return; // Ignorar pings
        }
        
        const update = JSON.parse(event.data);
        console.log('[ClientAPI] SSE update received:', update);
        onMessage && onMessage(update);
      } catch (error) {
        console.error('[ClientAPI] SSE parse error:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[ClientAPI] SSE error:', error);
      updateRunning = false;
      onError && onError(error);
    };

    updateAbort.eventSource = eventSource;
    
    // Retornar função para parar
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      updateRunning = false;
      console.log('[ClientAPI] SSE stopped');
    };
  }

  function stopUpdateStream(){
    if(updateAbort && updateAbort.eventSource){
      updateAbort.eventSource.close();
    }
    updateRunning = false;
    console.log('[ClientAPI] Update stream stopped');
  }

  /**
   * Testar conexão com servidor atual
   */
  async function testConnection(){
    try {
      const response = await getRanking(1);
      return response && !response.error;
    } catch (error) {
      console.error('[ClientAPI] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Testar ambos servidores
   */
  async function testAllServers(){
    const results = {};
    
    // Testar servidor Official
    const originalServer = currentServer;
    setServer('official');
    results.official = await testConnection();
    
    // Testar servidor Group
    setServer('group');
    results.group = await testConnection();
    
    // Restaurar servidor original
    setServer(originalServer);
    
    return results;
  }

  /**
   * Verificar se está logado em um servidor específico
   */
  function isLoggedInToServer(serverKey) {
    if (!window.AuthManager) return false;
    return window.AuthManager.isLoggedInToServer(serverKey);
  }

  /**
   * Obter credenciais para o servidor atual
   */
  function getCurrentCredentials() {
    if (!window.AuthManager) return null;
    const serverInfo = getServerInfo();
    return window.AuthManager.getCredentials(serverInfo.current);
  }

  /**
   * Obter credenciais para jogar em um servidor específico
   */
  function getServerCredentials(serverKey) {
    if (!window.AuthManager) return null;
    return window.AuthManager.getCredentials(serverKey);
  }

  // Expor API global
  window.ClientAPI = {
    // Funções principais (compatíveis com ambos servidores)
    register,
    join,
    leave,
    roll,
    passTurn,
    notify,
    getRanking,
    
    // Controle de servidores
    setServer,
    getServerInfo,
    testConnection,
    testAllServers,
    
    // Streaming de atualizações
    startUpdateStream,
    stopUpdateStream,
    
    // Autenticação e credenciais
    isLoggedInToServer,
    getCurrentCredentials,
    getServerCredentials,
    
    // Informações
    SERVERS,
    
    // Estado interno (para debugging)
    _internal: {
      currentServer,
      isUpdateRunning: () => updateRunning
    }
  };

  console.log('[ClientAPI] Loaded with multi-server support');
  console.log('[ClientAPI] Default server:', getServerInfo());

})(window);