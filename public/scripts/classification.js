/**
 * @file classification.js
 * @description Game statistics and classification system for AI matches
 * Tracks player performance, win rates, and game history against AI
 */

/**
 * Classification system for tracking game statistics against AI
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
            lastUpdated: new Date().toISOString(),
            gameHistory: []
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
     * Record a completed game against AI with piece-based scoring
     * @param {string} player1 - Player 1 name
     * @param {string} player2 - Player 2 name
     * @param {string} winner - Winning player name
     * @param {number} gameDuration - Game duration in seconds
     * @param {number} winnerPiecesRemaining - Number of pieces winner has left
     * @param {number} totalPieces - Total pieces per player at start
     * @param {string} gameMode - Game mode
     * @param {boolean} isResign - Whether the game ended by resignation
     * @param {string} resigningPlayer - Player who resigned (null if not resign)
     */
    recordGame(player1, player2, winner, gameDuration, winnerPiecesRemaining, totalPieces = 9, gameMode = 'pvc', isResign = false, resigningPlayer = null) {
        console.log('=== RECORDING GAME ===');
        console.log('Game details:', { 
            player1, 
            player2, 
            winner, 
            gameMode,
            isResign,
            resigningPlayer
        });
        
        // Calculate score based on remaining pieces
        const score = this.calculatePieceBasedScore(winnerPiecesRemaining, totalPieces, gameMode, isResign);
        
        this.stats.totalGames++;
        
        const actualPlayer1 = 'Player 1';
        const actualPlayer2 = gameMode === 'pvc' ? 'AI' : 'Player 2';
        
        console.log('Using player names:', { actualPlayer1, actualPlayer2 });
        
        // DETERMINE WINNER AND LOSER
        let winnerName, loserName;
        
        if (winner === 'Player 1') {
            winnerName = actualPlayer1;
            loserName = actualPlayer2;
        } else if (winner === 'Player 2') {
            winnerName = actualPlayer2;
            loserName = actualPlayer1;
        } else if (winner === 'AI') {
            winnerName = 'AI';
            loserName = actualPlayer1;
        } else {
            // Fallback
            winnerName = winner;
            loserName = (winner === actualPlayer1) ? actualPlayer2 : actualPlayer1;
        }
        
        console.log('Determined:', { winnerName, loserName });
        
        if (isResign) {
            console.log(`RESIGN: ${winnerName} wins, ${loserName} resigned`);
            
            // Winner gets reduced points
            this.addWin(winnerName, score);
            // Loser gets a loss
            this.addLoss(loserName);
        } else {
            console.log(`NORMAL GAME: ${winnerName} wins`);
            
            // Winner gets full points
            this.addWin(winnerName, score);
            // Loser gets a loss
            this.addLoss(loserName);
        }
        
        // Save game history
        this.saveGameHistory(actualPlayer1, actualPlayer2, winnerName, gameDuration, score, winnerPiecesRemaining, gameMode, isResign, resigningPlayer);
        
        this.saveStats();
        this.refreshDisplay();
        
        console.log('=== GAME RECORDED ===');
    }

    /**
     * Add a win with score to player
     * @param {string} playerName - Player name
     * @param {number} score - Score to add
     */
    addWin(playerName, score) {
        if (!this.stats.players[playerName]) {
            this.stats.players[playerName] = this.createPlayerStats();
        }
        
        const player = this.stats.players[playerName];
        player.wins++;
        player.totalScore += score;
        player.gamesPlayed++;
        player.lastPlayed = new Date().toISOString();
        
        console.log(`ADD WIN: ${playerName} - Wins: ${player.wins}, Score: +${score}, Total: ${player.totalScore}`);
    }

    /**
     * Add a loss to player
     * @param {string} playerName - Player name
     */
    addLoss(playerName) {
        if (!this.stats.players[playerName]) {
            this.stats.players[playerName] = this.createPlayerStats();
        }
        
        const player = this.stats.players[playerName];
        player.losses++;
        player.gamesPlayed++;
        player.lastPlayed = new Date().toISOString();
        
        console.log(`ADD LOSS: ${playerName} - Losses: ${player.losses}`);
    }

    /**
     * Create default player statistics
     * @returns {Object} - Default player stats
     */
    createPlayerStats() {
        return {
            wins: 0,
            losses: 0,
            totalScore: 0,
            gamesPlayed: 0,
            lastPlayed: new Date().toISOString()
        };
    }

    /**
     * Calculate score based on remaining pieces against AI
     * @param {number} piecesRemaining - Pieces remaining for winner
     * @param {number} totalPieces - Total pieces per player at start
     * @param {string} gameMode - Game mode
     * @param {boolean} isResign - Whether the game ended by resignation
     * @returns {number} - Calculated score
     */
    calculatePieceBasedScore(piecesRemaining, totalPieces = 9, gameMode = 'pvc', isResign = false) {
        // Base score: 100 points per victory (reduced in case of resign)
        let baseScore = isResign ? 50 : 100;
        
        // Bonus for remaining pieces: +15 points per piece
        const piecesBonus = piecesRemaining * 15;
        
        // Perfect victory bonus (all pieces remaining) - not applicable in resign
        const perfectBonus = (!isResign && piecesRemaining === totalPieces) ? 100 : 0;
        
        // Multiplier for victories against AI
        const aiMultiplier = gameMode === 'pvc' ? 1.5 : 1.0;
        
        const totalScore = Math.floor((baseScore + piecesBonus + perfectBonus) * aiMultiplier);
        
        console.log(`Score: Base=${baseScore}, Pieces=${piecesBonus}, Perfect=${perfectBonus}, Multiplier=${aiMultiplier}, Total=${totalScore}`);
        
        return totalScore;
    }

    /**
     * Save game history with detailed scoring information
     * @param {string} player1 - Player 1 name
     * @param {string} player2 - Player 2 name
     * @param {string} winner - Winning player name
     * @param {number} gameDuration - Game duration in seconds
     * @param {number} score - Game score
     * @param {number} winnerPiecesRemaining - Pieces remaining for winner
     * @param {string} gameMode - Game mode
     * @param {boolean} isResign - Whether the game ended by resignation
     * @param {string} resigningPlayer - Player who resigned
     */
    saveGameHistory(player1, player2, winner, gameDuration, score, winnerPiecesRemaining, gameMode, isResign = false, resigningPlayer = null) {
        if (!this.stats.gameHistory) {
            this.stats.gameHistory = [];
        }
        
        const gameRecord = {
            id: Date.now().toString(),
            player1,
            player2,
            winner,
            duration: gameDuration,
            score: score,
            winnerPiecesRemaining: winnerPiecesRemaining,
            mode: gameMode,
            isResign: isResign,
            resigningPlayer: resigningPlayer,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        // Keep only the last 50 games in history
        this.stats.gameHistory.unshift(gameRecord);
        if (this.stats.gameHistory.length > 50) {
            this.stats.gameHistory = this.stats.gameHistory.slice(0, 50);
        }
        
        console.log('Game history saved:', gameRecord);
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
     * Get player rankings
     * @returns {Array} - Sorted player rankings
     */
    getRankings() {
        let players = Object.entries(this.stats.players).map(([name, stats]) => ({
            name,
            wins: stats.wins || 0,
            losses: stats.losses || 0,
            totalScore: stats.totalScore || 0,
            gamesPlayed: stats.gamesPlayed || 0,
            winRate: this.calculateWinRate(stats.wins || 0, stats.losses || 0)
        }));

        // Sort by total score
        return players.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
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
        
        if (!tbody) {
            console.error('Classification table body not found');
            return;
        }

        const rankings = this.getRankings();
        console.log('Current rankings:', rankings);
        
        tbody.innerHTML = '';

        if (rankings.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" style="text-align: center; padding: 20px;">No games recorded yet</td>`;
            tbody.appendChild(row);
            console.log('No games found in classification');
        } else {
            console.log(`Found ${rankings.length} players in classification`);
            rankings.forEach((player, index) => {
                const row = document.createElement('tr');
                if (index < 3) row.className = `rank-${index + 1}`;
                
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.wins}</td>
                    <td>${player.losses}</td>
                    <td>${player.totalScore.toLocaleString()}</td>
                `;
                
                tbody.appendChild(row);
            });
        }

        this.updateOverallStats();
        console.log('Classification display refreshed successfully');
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
        const totalScore = Object.values(this.stats.players).reduce((sum, player) => sum + (player.totalScore || 0), 0);
        
        // Update only values, keeping HTML structure
        const statItems = container.querySelectorAll('.stat-value');
        if (statItems.length >= 5) {
            statItems[0].textContent = totalGames.toString();
            statItems[1].textContent = totalPlayers.toString();
            statItems[2].textContent = totalWins.toString();
            statItems[3].textContent = totalScore.toLocaleString();
            statItems[4].textContent = this.formatDate(this.stats.lastUpdated);
        }
        
        console.log('Overall stats:', {
            totalGames,
            totalPlayers,
            totalWins,
            totalScore
        });
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