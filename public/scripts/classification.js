/**
 * @file classification.js
 * @description Game statistics and classification system
 * Tracks player performance, win rates, and game history
 */

/**
 * Classification system for tracking game statistics
 * @class
 */
class Classification {
    /**
     * Creates a new Classification instance
     */
    constructor() {
        /** @type {string} */
        this.storageKey = 'tabGameClassification';
        
        /** @type {Object} */
        this.stats = this.loadStats();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for classification modal
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Setting up classification event listeners');
            
            // Update classification when modal opens
            const classBtn = document.getElementById('classBtn');
            if (classBtn) {
                classBtn.addEventListener('click', () => {
                    console.log('Classification modal opened');
                    this.refreshDisplay();
                });
            }

            // Setup classification controls
            const refreshBtn = document.getElementById('refreshClassification');
            const clearBtn = document.getElementById('clearClassification');
            const filterSelect = document.getElementById('classificationFilter');

            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    console.log('Refreshing classification');
                    this.refreshDisplay();
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    console.log('Clearing classification');
                    this.clearAll();
                });
            }

            if (filterSelect) {
                filterSelect.addEventListener('change', () => {
                    console.log('Classification filter changed:', filterSelect.value);
                    this.refreshDisplay();
                });
            }

            // Initial display
            this.refreshDisplay();
        });
    }

    /**
     * Load statistics from localStorage
     * @returns {Object} - Statistics object
     */
    loadStats() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const stats = JSON.parse(saved);
                console.log('Loaded classification stats:', stats);
                return stats;
            }
            return this.getDefaultStats();
        } catch (error) {
            console.error('Error loading classification:', error);
            return this.getDefaultStats();
        }
    }

    /**
     * Get default statistics structure
     * @returns {Object} - Default stats object
     */
    getDefaultStats() {
        return {
            players: {},
            totalGames: 0,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Save statistics to localStorage
     */
    saveStats() {
        try {
            this.stats.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
            console.log('Classification stats saved:', this.stats);
        } catch (error) {
            console.error('Error saving classification:', error);
        }
    }

    /**
     * Record a completed game
     * @param {string} player1 - Player 1 name
     * @param {string} player2 - Player 2 name
     * @param {string} winner - Winning player name
     * @param {number} gameDuration - Game duration in seconds
     */
    recordGame(player1, player2, winner, gameDuration) {
        console.log('Recording game result:', { player1, player2, winner, gameDuration });
        
        this.stats.totalGames++;
        
        this.updatePlayerStats(player1, winner === player1, gameDuration);
        this.updatePlayerStats(player2, winner === player2, gameDuration);
        
        this.saveStats();
        this.refreshDisplay();
    }

    /**
     * Update individual player statistics
     * @param {string} playerName - Player name
     * @param {boolean} isWinner - Whether player won
     * @param {number} gameDuration - Game duration in seconds
     */
    updatePlayerStats(playerName, isWinner, gameDuration) {
        if (!this.stats.players[playerName]) {
            this.stats.players[playerName] = {
                wins: 0,
                losses: 0,
                bestTime: null,
                totalPlayTime: 0,
                gamesPlayed: 0,
                lastPlayed: new Date().toISOString()
            };
        }

        const player = this.stats.players[playerName];
        player.gamesPlayed++;
        
        if (isWinner) {
            player.wins++;
            // Update best time for wins
            if (!player.bestTime || gameDuration < player.bestTime) {
                player.bestTime = gameDuration;
            }
        } else {
            player.losses++;
        }

        player.totalPlayTime += gameDuration;
        player.lastPlayed = new Date().toISOString();
        
        console.log(`Updated stats for ${playerName}:`, player);
    }

    /**
     * Calculate win rate percentage
     * @param {number} wins - Number of wins
     * @param {number} losses - Number of losses
     * @returns {string} - Win rate percentage
     */
    calculateWinRate(wins, losses) {
        const total = wins + losses;
        return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
    }

    /**
     * Format time in seconds to MM:SS
     * @param {number} seconds - Time in seconds
     * @returns {string} - Formatted time string
     */
    formatTime(seconds) {
        if (!seconds || seconds === 0) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format date string to localized format
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    }

    /**
     * Get player rankings with optional filtering
     * @param {string} filter - Filter type ('all', 'player1', 'player2', 'ai')
     * @returns {Array} - Sorted player rankings
     */
    getRankings(filter = 'all') {
        let players = Object.entries(this.stats.players).map(([name, stats]) => ({
            name,
            wins: stats.wins || 0,
            losses: stats.losses || 0,
            bestTime: stats.bestTime || null,
            totalPlayTime: stats.totalPlayTime || 0,
            gamesPlayed: stats.gamesPlayed || 0,
            lastPlayed: stats.lastPlayed,
            winRate: this.calculateWinRate(stats.wins || 0, stats.losses || 0)
        }));

        // Apply filter
        if (filter !== 'all') {
            players = players.filter(player => {
                const nameLower = player.name.toLowerCase();
                switch (filter) {
                    case 'player1':
                        return nameLower.includes('player 1') || nameLower === 'player1';
                    case 'player2':
                        return nameLower.includes('player 2') || nameLower === 'player2' || nameLower.includes('ai');
                    default:
                        return nameLower.includes(filter);
                }
            });
        }

        // Sort by wins (then by win rate, then by games played)
        return players.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (parseFloat(b.winRate) !== parseFloat(a.winRate)) return parseFloat(b.winRate) - parseFloat(a.winRate);
            return b.gamesPlayed - a.gamesPlayed;
        });
    }

    /**
     * Refresh classification display
     */
    refreshDisplay() {
        console.log('Refreshing classification display');
        const tbody = document.getElementById('classificationBody');
        const filter = document.getElementById('classificationFilter')?.value || 'all';
        
        if (!tbody) {
            console.error('Classification table body not found');
            return;
        }

        const rankings = this.getRankings(filter);
        console.log('Displaying rankings:', rankings);
        
        tbody.innerHTML = '';

        if (rankings.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" style="text-align: center; padding: 20px;">No games recorded yet</td>`;
            tbody.appendChild(row);
            return;
        }

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

    /**
     * Update overall statistics display
     */
    updateOverallStats() {
        const container = document.getElementById('overallStats');
        if (!container) {
            console.error('Overall stats container not found');
            return;
        }

        const totalPlayers = Object.keys(this.stats.players).length;
        const totalWins = Object.values(this.stats.players).reduce((sum, player) => sum + (player.wins || 0), 0);
        const totalGames = this.stats.totalGames || 0;
        
        container.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Games Played:</span>
                <span class="stat-value">${totalGames}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Players:</span>
                <span class="stat-value">${totalPlayers}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Wins Recorded:</span>
                <span class="stat-value">${totalWins}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Last Updated:</span>
                <span class="stat-value">${this.formatDate(this.stats.lastUpdated)}</span>
            </div>
        `;
    }

    /**
     * Clear all classification data
     */
    clearAll() {
        if (confirm('Are you sure you want to clear all classification data? This cannot be undone.')) {
            this.stats = this.getDefaultStats();
            this.saveStats();
            this.refreshDisplay();
            console.log('Classification data cleared');
        }
    }

    /**
     * Get classification statistics for external use
     * @returns {Object} - Classification statistics
     */
    getStats() {
        return this.stats;
    }
}

// Initialize classification system
window.classification = new Classification();