/**
 * ServerAPI.js
 * Módulo responsável por todas as comunicações com o servidor remoto
 * URL base: http://twserver.alunos.dcc.fc.up.pt:8008/
 * 
 * CORREÇÃO: O servidor espera POST para endpoints específicos como /register, /join, etc.
 */

(function(window){
  const BASE = 'http://twserver.alunos.dcc.fc.up.pt:8008/';
  let updateAbort = null;
  let updateRunning = false;

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

    console.log(`[ServerAPI] Making POST request to ${endpoint}:`, params);
    console.log(`[ServerAPI] Full URL: ${url}`);

    try {
      const res = await fetch(url, fetchOptions);
      
      if(!res.ok){
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      
      const data = await res.json().catch(() => { 
        throw new Error('Resposta inválida JSON'); 
      });
      
      if(data.error) throw new Error(data.error);
      
      console.log(`[ServerAPI] ${endpoint} success:`, data);
      return data;
      
    } catch (error) {
      console.error(`[ServerAPI] ${endpoint} error:`, error);
      throw error;
    }
  }

  // Funções simples
  async function register(nick, password){
    return await request('register', { nick, password });
  }

  async function join(nick, password, size, game){
    // game pode ser omitido ou ser identificador
    const params = { nick, password, size };
    if (game) params.game = game;
    return await request('join', params);
  }

  async function leave(nick, password, game){
    return await request('leave', { nick, password, game });
  }

  async function roll(nick, password, game, cell){
    return await request('roll', { nick, password, game, cell });
  }

  async function passTurn(nick, password, game, cell){
    return await request('pass', { nick, password, game, cell });
  }

  async function notify(nick, password, game, cell){
    return await request('notify', { nick, password, game, cell });
  }

  async function getRanking(size){
    return await request('ranking', { size });
  }

  // Pedido único de update (resolve ou rejeita conforme resposta)
  async function getUpdateOnce(game, nick){
    return await request('update', { game, nick });
  }

  // Long-polling contínuo: faz fetchs sequenciais a 'update' e chama callbacks
  function startUpdateStream(game, nick, onMessage, onError){
    if(updateRunning){
      console.warn('Update stream já em execução. Ignorando novo pedido.');
      return;
    }
    updateRunning = true;
    updateAbort = { controller: null, stopped: false };

    (async function loop(){
      while(!updateAbort.stopped){
        updateAbort.controller = new AbortController();
        try{
          const data = await request('update', { game, nick }, { 
            signal: updateAbort.controller.signal 
          });
          
          // Chamamos onMessage — deixar o callback decidir o que fazer
          try{ 
            onMessage && onMessage(data); 
          } catch(cbErr){ 
            console.error('onMessage callback error', cbErr); 
          }
          
          // Pequena pausa antes do próximo pedido
          await new Promise(r => setTimeout(r, 100));
          
        }catch(err){
          // Se o aborto foi intencional, sai do loop silenciosamente
          if(err.name === 'AbortError' || (err.message && err.message.includes('aborted'))){
            break;
          }
          
          // Chamamos onError e esperamos antes de tentar de novo
          try{ 
            onError && onError(err); 
          }catch(cbErr){ 
            console.error('onError callback error', cbErr); 
          }
          
          // Esperar antes de tentar de novo
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      updateRunning = false;
    })();
  }

  function stopUpdateStream(){
    if(!updateRunning) return;
    if(updateAbort && updateAbort.controller){
      try{ updateAbort.controller.abort(); }catch(e){}
    }
    if(updateAbort) updateAbort.stopped = true;
    updateRunning = false;
  }

  // Expor API global
  window.ServerAPI = {
    register,
    join,
    leave,
    roll,
    passTurn,
    notify,
    getRanking,
    getUpdateOnce,
    startUpdateStream,
    stopUpdateStream,

    // estado auxiliar
    _internal: {
      baseUrl: BASE,
      isUpdateRunning: () => updateRunning
    }
  };

  console.log('[ServerAPI] Loaded with endpoint-specific URLs');

})(window);