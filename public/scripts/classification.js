/**
 * @file classification.js
 * @description Local + Online ranking system (simplified)
 */

class Classification {
    constructor() {

        // ---- LOCAL STORAGE ----
        this.storageKey = "tabLocalRanking";
        this.localStats = this.loadLocalStats();

        // ---- ONLINE RANKING DATA ----
        this.serverURL = "http://twserver.alunos.dcc.fc.up.pt:8008";
        this.onlineStats = [];

        // init
        this.setup();
    }

    // --------------------------
    // INITIAL SETUP
    // --------------------------
    setup() {
        document.addEventListener("DOMContentLoaded", () => {

            // When modal opens, refresh both tables
            const classBtn = document.getElementById("classBtn");
            if (classBtn) {
                classBtn.addEventListener("click", () => {
                    this.renderLocal();
                    this.loadOnline();
                });
            }

            // Buttons
            document.getElementById("refreshClassification")
                ?.addEventListener("click", () => {
                    this.renderLocal();
                    this.loadOnline();
                });

            document.getElementById("clearClassification")
                ?.addEventListener("click", () => {
                    if (confirm("Delete local ranking?")) {
                        this.localStats = {};
                        this.saveLocalStats();
                        this.renderLocal();
                    }
                });

            // Tabs
            this.setupTabs();

            // First load
            this.renderLocal();
            this.loadOnline();
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

                if (btn.dataset.tab === "online") {
                    this.loadOnline();
                }
            });
        });
    }

    // --------------------------
    // LOCAL STORAGE
    // --------------------------
    loadLocalStats() {
        return JSON.parse(localStorage.getItem(this.storageKey) || "{}");
    }

    saveLocalStats() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.localStats));
    }

    /**
     * Called by game engine to record match results
     */
    recordResult(player, won) {
        if (!this.localStats[player]) {
            this.localStats[player] = { wins: 0, losses: 0 };
        }
        if (won) this.localStats[player].wins++;
        else this.localStats[player].losses++;

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

        const players = Object.entries(this.localStats).map(([name, s]) => {
            const total = s.wins + s.losses;
            const rate = total ? ((s.wins / total) * 100).toFixed(1) + "%" : "0%";
            return { name, wins: s.wins, losses: s.losses, rate };
        });

        players.sort((a, b) => b.wins - a.wins);

        if (players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty">No local data</td></tr>`;
            return;
        }

        players.forEach((p, i) => {
            tbody.innerHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${p.name}</td>
                    <td>${p.wins}</td>
                    <td>${p.losses}</td>
                    <td>${p.rate}</td>
                </tr>
            `;
        });
    }

    // --------------------------
    // RENDER: ONLINE RANKING
    // --------------------------
    async loadOnline() {

        const tbody = document.getElementById("onlineRankingBody");
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="5" class="loading">Loading...</td></tr>`;

        try {
            const req = await fetch(`${this.serverURL}/ranking`);
            const json = await req.json();

            if (!json.ranking) throw "Invalid response";

            this.onlineStats = json.ranking;
            this.renderOnline();

        } catch (e) {
            tbody.innerHTML =
                `<tr><td colspan="5" class="error">Server unavailable</td></tr>`;
        }
    }

    renderOnline() {
        const tbody = document.getElementById("onlineRankingBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (this.onlineStats.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty">No online data</td></tr>`;
            return;
        }

        this.onlineStats.forEach((p, i) => {
            const losses = p.games - p.victories;
            const rate = p.games ? ((p.victories / p.games) * 100).toFixed(1) + "%" : "0%";

            tbody.innerHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${p.nick}</td>
                    <td>${p.victories}</td>
                    <td>${losses}</td>
                    <td>${rate}</td>
                </tr>
            `;
        });
    }
}

window.classification = new Classification();
