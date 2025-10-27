class Classification {
  constructor() {
    this.storageKey = 'tabGameClassification';
    this.stats = this.loadStats();
  }

  // Carregar estatísticas do localStorage
  loadStats() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : this.getDefaultStats();
    } catch (error) {
      console.error('Error loading classification:', error);
      return this.getDefaultStats();
    }
  }

  // Estatísticas padrão
  getDefaultStats() {
    return {
      players: {},
      totalGames: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  // Salvar estatísticas
  saveStats() {
    try {
      this.stats.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    } catch (error) {
      console.error('Error saving classification:', error);
    }
  }

  // Registrar resultado de um jogo
  recordGame(player1, player2, winner, gameDuration) {
    this.stats.totalGames++;
    
    // Atualizar estatísticas do jogador 1
    this.updatePlayerStats(player1, winner === player1, gameDuration);
    
    // Atualizar estatísticas do jogador 2
    this.updatePlayerStats(player2, winner === player2, gameDuration);
    
    this.saveStats();
    this.refreshDisplay();
  }

  // Atualizar estatísticas de um jogador
  updatePlayerStats(playerName, isWinner, gameDuration) {
    if (!this.stats.players[playerName]) {
      this.stats.players[playerName] = {
        wins: 0,
        losses: 0,
        bestTime: null,
        totalPlayTime: 0,
        lastPlayed: new Date().toISOString()
      };
    }

    const player = this.stats.players[playerName];
    
    if (isWinner) {
      player.wins++;
      // Atualizar melhor tempo se for vitória
      if (!player.bestTime || gameDuration < player.bestTime) {
        player.bestTime = gameDuration;
      }
    } else {
      player.losses++;
    }

    player.totalPlayTime += gameDuration;
    player.lastPlayed = new Date().toISOString();
  }

  // Calcular taxa de vitórias
  calculateWinRate(wins, losses) {
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  }

  // Formatar tempo
  formatTime(seconds) {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Formatar data
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  // Obter classificações ordenadas
  getRankings(filter = 'all') {
    let players = Object.entries(this.stats.players).map(([name, stats]) => ({
      name,
      ...stats,
      winRate: this.calculateWinRate(stats.wins, stats.losses)
    }));

    // Aplicar filtro
    if (filter !== 'all') {
      players = players.filter(player => player.name.toLowerCase().includes(filter));
    }

    // Ordenar por vitórias (e depois por taxa de vitórias)
    return players.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return parseFloat(b.winRate) - parseFloat(a.winRate);
    });
  }

  // Atualizar display da tabela
  refreshDisplay() {
    const tbody = document.getElementById('classificationBody');
    const filter = document.getElementById('classificationFilter')?.value || 'all';
    
    if (!tbody) return;

    const rankings = this.getRankings(filter);
    
    tbody.innerHTML = '';

    rankings.forEach((player, index) => {
      const row = document.createElement('tr');
      if (index < 3) row.className = `rank-${index + 1}`;
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${player.name}</td>
        <td>${player.wins}</td>
        <td>${player.losses}</td>
        <td>${player.winRate}%</td>
        <td>${this.formatTime(player.bestTime)}</td>
        <td>${this.formatDate(player.lastPlayed)}</td>
      `;
      
      tbody.appendChild(row);
    });

    this.updateOverallStats();
  }

  // Atualizar estatísticas gerais
  updateOverallStats() {
    const container = document.getElementById('overallStats');
    if (!container) return;

    const totalPlayers = Object.keys(this.stats.players).length;
    const totalWins = Object.values(this.stats.players).reduce((sum, player) => sum + player.wins, 0);
    
    container.innerHTML = `
      <div class="stat-item">
        <span>Total Games Played:</span>
        <span class="stat-value">${this.stats.totalGames}</span>
      </div>
      <div class="stat-item">
        <span>Total Players:</span>
        <span class="stat-value">${totalPlayers}</span>
      </div>
      <div class="stat-item">
        <span>Total Wins Recorded:</span>
        <span class="stat-value">${totalWins}</span>
      </div>
      <div class="stat-item">
        <span>Last Updated:</span>
        <span class="stat-value">${this.formatDate(this.stats.lastUpdated)}</span>
      </div>
    `;
  }

  // Limpar todas as estatísticas
  clearAll() {
    if (confirm('Are you sure you want to clear all classification data? This cannot be undone.')) {
      this.stats = this.getDefaultStats();
      this.saveStats();
      this.refreshDisplay();
    }
  }
}

// Inicializar classification
window.classification = new Classification();

// Event listeners quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
  // Atualizar classification quando a modal abrir
  const classBtn = document.getElementById('classBtn');
  if (classBtn) {
    classBtn.addEventListener('click', () => {
      window.classification.refreshDisplay();
    });
  }

  // Configurar controles do classification
  const refreshBtn = document.getElementById('refreshClassification');
  const clearBtn = document.getElementById('clearClassification');
  const filterSelect = document.getElementById('classificationFilter');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => window.classification.refreshDisplay());
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => window.classification.clearAll());
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', () => window.classification.refreshDisplay());
  }
});