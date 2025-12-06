/**
 * @file classification.js
 * @description Local + Online ranking system (simplified)
 */

class Classification {
    constructor() {
        // ---- LOCAL STORAGE ----
        this.storageKey = "tabLocalRanking";
        this.localStats = this.loadLocalStats();

        // ---- ONLINE SERVERS ----
        this.server8008 = "http://twserver.alunos.dcc.fc.up.pt:8008";
        this.server8104 = "http://localhost:8104";
        
        this.onlineStats8008 = [];
        this.onlineStats8104 = [];

        // init
        this.setup();
    }

    // --------------------------
    // INITIAL SETUP
    // --------------------------
    setup() {
        document.addEventListener("DOMContentLoaded", () => {
            // Quando modal abre
            const classBtn = document.getElementById("classBtn");
            if (classBtn) {
                classBtn.addEventListener("click", () => {
                    this.renderLocal();
                    this.loadOnline8008();
                    this.loadOnline8104();
                });
            }

            // Botão Refresh
            document.getElementById("refreshClassification")
                ?.addEventListener("click", () => {
                    this.renderLocal();
                    this.loadOnline8008();
                    this.loadOnline8104();
                });

            // Botão Clear Local
            document.getElementById("clearClassification")
                ?.addEventListener("click", () => {
                    if (confirm("Delete all local ranking data?")) {
                        this.localStats = {};
                        this.saveLocalStats();
                        this.renderLocal();
                    }
                });

            // Botão Close
            document.getElementById("closeClassification")
                ?.addEventListener("click", () => {
                    document.getElementById("classModal").classList.add("hidden");
                });

            // Tabs
            this.setupTabs();

            // Primeira carga
            this.renderLocal();
            this.loadOnline8008();
            this.loadOnline8104();
        });
    }

    setupTabs() {
        const buttons = document.querySelectorAll(".classification-tab-btn");
        const panes = document.querySelectorAll(".classification-tab-pane");

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                // button state
                buttons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                // pane state
                panes.forEach(p => p.classList.remove("active"));
                document.getElementById(btn.dataset.tab + "Tab").classList.add("active");
            });
        });
    }

    // --------------------------
    // LOCAL STORAGE
    // --------------------------
    loadLocalStats() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Error loading local stats:", e);
            return {};
        }
    }

    saveLocalStats() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.localStats));
        } catch (e) {
            console.error("Error saving local stats:", e);
        }
    }

    /**
     * Registrar resultado de jogo local
     */
    recordResult(player, won) {
        if (!player || typeof player !== 'string') return;

        if (!this.localStats[player]) {
            this.localStats[player] = { wins: 0, losses: 0 };
        }

        if (won) {
            this.localStats[player].wins++;
        } else {
            this.localStats[player].losses++;
        }

        this.saveLocalStats();
        this.renderLocal();
    }

    // --------------------------
    // RENDER: LOCAL RANKING
    // --------------------------
    renderLocal() {
        const tbody = document.getElementById("localRankingBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        const players = Object.entries(this.localStats)
            .map(([name, stats]) => {
                const wins = stats.wins || 0;
                const losses = stats.losses || 0;
                const total = wins + losses;
                const rate = total > 0 ? ((wins / total) * 100).toFixed(1) + "%" : "0%";
                
                return { name, wins, losses, rate, total };
            })
            .filter(player => player.total > 0);

        // Ordenar por vitórias (decrescente), depois por menor número de derrotas
        players.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.losses - b.losses;
        });

        if (players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty">No local data</td></tr>`;
            return;
        }

        players.forEach((player, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.name}</td>
                <td>${player.wins}</td>
                <td>${player.losses}</td>
                <td>${player.rate}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // --------------------------
    // SERVER 8008
    // --------------------------
    async loadOnline8008() {
        const tbody = document.getElementById("online8008Body");
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="5" class="loading">Loading server 8008...</td></tr>`;

        try {
            const response = await this.fetchRanking(this.server8008);
            
            if (!response || !response.ranking) {
                throw new Error("Invalid response from server 8008");
            }

            // Processar dados do ranking
            this.onlineStats8008 = response.ranking.map(item => ({
                nick: item.nick || "Unknown",
                victories: parseInt(item.victories) || 0,
                games: parseInt(item.games) || 0
            }));

            // Ordenar por número de vitórias (decrescente)
            this.onlineStats8008.sort((a, b) => b.victories - a.victories);

            this.renderOnline8008();

        } catch (error) {
            console.error("Server 8008 error:", error);
            tbody.innerHTML = `<tr><td colspan="5" class="error">Server 8008 unavailable</td></tr>`;
        }
    }

    renderOnline8008() {
        const tbody = document.getElementById("online8008Body");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (this.onlineStats8008.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty">No data from server 8008</td></tr>`;
            return;
        }

        this.onlineStats8008.forEach((player, index) => {
            // Calcular derrotas: total de jogos - vitórias
            const losses = player.games - player.victories;
            
            // Calcular win rate
            const rate = player.games > 0 
                ? ((player.victories / player.games) * 100).toFixed(1) + "%" 
                : "0%";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.nick}</td>
                <td>${player.victories}</td>
                <td>${losses}</td>
                <td>${rate}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // --------------------------
    // SERVER 8104
    // --------------------------
    async loadOnline8104() {
        const tbody = document.getElementById("online8104Body");
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="5" class="loading">Loading server 8104...</td></tr>`;

        try {
            const response = await this.fetchRanking(this.server8104);
            
            if (!response || !response.ranking) {
                throw new Error("Invalid response from server 8104");
            }

            // Processar dados do ranking
            this.onlineStats8104 = response.ranking.map(item => ({
                nick: item.nick || "Unknown",
                victories: parseInt(item.victories) || 0,
                games: parseInt(item.games) || 0
            }));

            // Ordenar por número de vitórias (decrescente)
            this.onlineStats8104.sort((a, b) => b.victories - a.victories);

            this.renderOnline8104();

        } catch (error) {
            console.error("Server 8104 error:", error);
            tbody.innerHTML = `<tr><td colspan="5" class="error">Server 8104 unavailable</td></tr>`;
        }
    }

    renderOnline8104() {
        const tbody = document.getElementById("online8104Body");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (this.onlineStats8104.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty">No data from server 8104</td></tr>`;
            return;
        }

        this.onlineStats8104.forEach((player, index) => {
            // Calcular derrotas: total de jogos - vitórias
            const losses = player.games - player.victories;
            
            // Calcular win rate
            const rate = player.games > 0 
                ? ((player.victories / player.games) * 100).toFixed(1) + "%" 
                : "0%";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.nick}</td>
                <td>${player.victories}</td>
                <td>${losses}</td>
                <td>${rate}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // --------------------------
    // HELPER: FETCH RANKING
    // --------------------------
    async fetchRanking(serverUrl) {
        try {
            // Tentar usar ClientAPI se disponível
            if (window.ClientAPI) {
                // Determinar qual servidor usar
                if (serverUrl.includes('8008')) {
                    const currentServer = window.ClientAPI._internal.currentServer;
                    window.ClientAPI.setServer('official');
                    const result = await window.ClientAPI.getRanking(9);
                    window.ClientAPI.setServer(currentServer);
                    return result;
                } else if (serverUrl.includes('8104')) {
                    const currentServer = window.ClientAPI._internal.currentServer;
                    window.ClientAPI.setServer('group');
                    const result = await window.ClientAPI.getRanking(9);
                    window.ClientAPI.setServer(currentServer);
                    return result;
                }
            }

            // Fallback: fetch direto
            const response = await fetch(`${serverUrl}/ranking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({group:4,  size: 9 })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`Fetch error for ${serverUrl}:`, error);
            throw error;
        }
    }

    // --------------------------
    // UTILITÁRIOS
    // --------------------------
    /**
     * Obter estatísticas de um jogador local
     */
    getPlayerStats(playerName) {
        return this.localStats[playerName] || { wins: 0, losses: 0 };
    }

    /**
     * Obter ranking local formatado
     */
    getLocalRanking() {
        return Object.entries(this.localStats)
            .map(([name, stats]) => ({
                name,
                wins: stats.wins || 0,
                losses: stats.losses || 0,
                total: (stats.wins || 0) + (stats.losses || 0)
            }))
            .filter(p => p.total > 0)
            .sort((a, b) => b.wins - a.wins);
    }
}

// Inicializar globalmente
window.classification = new Classification();