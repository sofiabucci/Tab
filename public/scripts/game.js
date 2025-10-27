// Game session orchestrator + logger
// This script wraps generateBoard and GameBoard to report every move and scene.
(function(){
  // Simple on-page logger UI
  function createLoggerUI(){
    let panel = document.getElementById('game-log-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'game-log-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      right: '12px',
      bottom: '12px',
      width: '360px',
      maxHeight: '50vh',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '8px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 99999
    });

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '6px';

    const title = document.createElement('strong');
    title.textContent = 'Game Log';
    header.appendChild(title);

    const controls = document.createElement('div');
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.style.marginRight = '6px';
    downloadBtn.onclick = () => downloadLog();
    Object.assign(downloadBtn.style, { fontSize: '11px' });
    controls.appendChild(downloadBtn);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.onclick = () => { clearLog(); };
    Object.assign(clearBtn.style, { fontSize: '11px' });
    controls.appendChild(clearBtn);

    header.appendChild(controls);
    panel.appendChild(header);

    const list = document.createElement('div');
    list.id = 'game-log-list';
    panel.appendChild(list);

    document.body.appendChild(panel);
    return panel;
  }

  // Log storage
  const gameLog = [];
  function pushLog(entry){
    gameLog.push(entry);
    appendToUI(entry);
    console.log('[GAME LOG]', entry.type, entry.message || '', entry.data || '');
  }

  function appendToUI(entry){
    const list = document.getElementById('game-log-list') || createLoggerUI().querySelector('#game-log-list');
    if (!list) return;
    const line = document.createElement('div');
    line.style.padding = '4px 2px';
    line.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
    const t = new Date(entry.ts).toLocaleTimeString();
    line.textContent = `[${t}] ${entry.type.toUpperCase()} ${entry.message || ''}`;
    if (entry.data) {
      const small = document.createElement('div');
      small.style.opacity = '0.85';
      small.style.fontSize = '11px';
      try { small.textContent = JSON.stringify(entry.data); } catch (err) { small.textContent = String(entry.data); }
      line.appendChild(small);
    }
    list.insertBefore(line, list.firstChild);
  }

  function clearLog(){
    gameLog.length = 0;
    const list = document.getElementById('game-log-list');
    if (list) list.innerHTML = '';
  }

  function downloadLog(){
    const blob = new Blob([gameLog.map(e => JSON.stringify(e)).join('\n')], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tab-game-log-${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function makeEntry(type, message, data){
    return { ts: Date.now(), type, message, data };
  }

  // When a GameBoard is created via generateBoard, initialize session logging
  function attachToBoard(board, options){
    if (!board) return;
    createLoggerUI();
    pushLog(makeEntry('scene','game_started',{ options: options || {} }));

    // Wrap applyMoveIndices to capture move details
    if (board && typeof board.applyMoveIndices === 'function'){
      const origApply = board.applyMoveIndices.bind(board);
      board.applyMoveIndices = function(fromIdx, toIdx, keepTurn){
        const piece = this.content[fromIdx];
        const pPlayer = piece ? piece.player : null;
        const entryData = { from: fromIdx, to: toIdx, player: pPlayer, keepTurn: !!keepTurn };
        pushLog(makeEntry('move_attempt','applying_move', entryData));
        const ok = origApply(fromIdx, toIdx, keepTurn);
        if (ok) {
          pushLog(makeEntry('move','move_applied', entryData));
          // After move, log board snapshot (counts)
          const counts = { 'player-1': 0, 'player-2': 0 };
          for (let i=0;i<this.content.length;i++){ if (this.content[i] && this.content[i].player) counts[this.content[i].player]++; }
          pushLog(makeEntry('state','after_move',{ counts }));
          // check terminal
          if (counts['player-1'] === 0 || counts['player-2'] === 0){
            const winner = counts['player-1'] === 0 ? 'player-2' : 'player-1';
            pushLog(makeEntry('scene','game_over',{ winner }));
          }
        } else {
          pushLog(makeEntry('move_failed','invalid_move', entryData));
        }
        return ok;
      };
    }

    // Listen for rolls
    const rollHandler = (e) => {
      const roll = e && e.detail ? e.detail : null;
      pushLog(makeEntry('roll','stick_roll', roll));
    };
    document.addEventListener('stickRoll', rollHandler);

    // Listen for pass/resign actions
    const passHandler = (e) => { pushLog(makeEntry('action','player_passed', e && e.detail ? e.detail : {})); };
    const resignHandler = (e) => { pushLog(makeEntry('action','player_resigned', e && e.detail ? e.detail : {})); };
    document.addEventListener('playerPassed', passHandler);
    document.addEventListener('playerResigned', resignHandler);

    // Listen for moves end (UI/dice)
    const endHandler = () => {
      pushLog(makeEntry('scene','move_ended'));
    };
    document.addEventListener('moveEnded', endHandler);

    // expose a cleanup for this logger when board is replaced
    board.__gameLoggerCleanup = function(){
      document.removeEventListener('stickRoll', rollHandler);
      document.removeEventListener('moveEnded', endHandler);
      pushLog(makeEntry('scene','game_ended_cleanup'));
    };

    // Also attach to board events for AI decision start/end if available
    // If the board exposes handleAIMove, we can wrap to log start/end
    if (board && typeof board.handleAIMove === 'function'){
      const origAI = board.handleAIMove.bind(board);
      board.handleAIMove = async function(stickValue, repeats){
        pushLog(makeEntry('ai','ai_move_start',{ stickValue, repeats }));
        try{
          const res = await origAI(stickValue, repeats);
          pushLog(makeEntry('ai','ai_move_end',{}));
          return res;
        }catch(err){
          pushLog(makeEntry('ai_error','ai_move_error',{ message: err && err.message ? err.message : String(err) }));
          throw err;
        }
      };
    }
  }

  // Wrap generateBoard so we can attach the logger automatically
  function wrapGenerateBoard(){
    if (!window.generateBoard) return;
    const origGen = window.generateBoard.bind(window);
    window.generateBoard = function(columns, options){
      const board = origGen(columns, options);
      try{ attachToBoard(board, options); } catch(err){ console.error('game.js logger attach failed', err); }
      return board;
    };

    // If board already exists, attach
    if (window._currentGameBoard) attachToBoard(window._currentGameBoard, window._currentGameBoard.options);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wrapGenerateBoard);
  } else {
    wrapGenerateBoard();
  }
})();
