import { navigateTo } from "./router.js";
import { authService } from "./auth.js";
import * as requests from "./serverRequests.js"
import {BoardUtils} from "./board_utils.js"

const GROUP = 24;
let NICKNAME;
let PASSWORD;

class BaseView {
    constructor() {}
    setTitle(title) { document.title = title; }
    async getHtml() { return await TemplateLoader.loadTemplate("base"); }
}



class HowToPlayView extends BaseView {
    constructor() {
        super();
        this.setTitle("How to Play");
    }
    async getHtml() { return await TemplateLoader.loadTemplate("how-to-play"); }
    async initialize() { addSPABackButton.addBackButtonListener.call(this); }
}



class RulesView extends BaseView {
    constructor() {
        super();
        this.setTitle("Rules");
    }
    async getHtml() { return await TemplateLoader.loadTemplate("rules"); }
    async initialize() { addSPABackButton.addBackButtonListener.call(this); }
}



class RankingView extends BaseView {
    constructor() {
        super();
        this.setTitle("Ranking");
    }
    async getHtml() { return await TemplateLoader.loadTemplate("ranking"); }
    loadRankings() {
        try {
            const rankings = JSON.parse(sessionStorage.getItem('gameRankings')) || [];
            const tbody = document.querySelector('.ranking-table tbody');
            
            if (!tbody) {
                console.error("Ranking table not found");
                return;
            }

            if (rankings.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center;">No games played yet</td>
                    </tr>`;
                return;
            }

            tbody.innerHTML = '';
            rankings.forEach((ranking, index) => {
                const row = `
                    <tr>
                        <td><span class="rank rank-${index + 1}">${index + 1}</span></td>
                        <td>${ranking.winner}</td>
                        <td>${ranking.piecesLeft}</td>
                        <td>${ranking.gameMode}</td>
                        <td>${ranking.aiDifficulty}</td>
                        <td>${ranking.score}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } catch (error) {
            console.error("Error loading rankings:", error);
            const tbody = document.querySelector('.ranking-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center;">Error loading rankings</td>
                    </tr>
                `;
            }
        }
    }

    initialize() {
        addSPABackButton.addBackButtonListener.call(this);
        this.loadRankings();
    }
}



class LoginView extends BaseView {
    constructor() {
        super();
        this.setTitle("Login");
    }
    async getHtml() { return await TemplateLoader.loadTemplate("login"); }

    async handleSubmit(e) {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        sessionStorage.setItem("nickname", username);
        sessionStorage.setItem("password", password);
        NICKNAME = sessionStorage.getItem("nickname");
        PASSWORD = sessionStorage.getItem("password");

        if (!username || !password) {
            alert("Please enter both username and password");
            return;
        }

        try {
            await authService.register(username, password);
            authService.setAuth(true);
            alert("Login successful!");
            navigateTo("/");
        } catch (error) {
            alert(`Login failed: ${error.message}`);
            console.error('Login error:', error);
        }
    }


    async initialize() {
        const form = document.getElementById("authForm");
        if (form) {
            form.addEventListener("submit", this.handleSubmit);
        }
    }

    // Cleans up event listeners when the view is destroyed.
    cleanup() {
        const form = document.getElementById("authForm");
        if (form) {
            form.removeEventListener("submit", this.handleSubmit);
        }
    }
}



class GameView extends BaseView {
    constructor() {
        super();
        this.setTitle("Game");
    }
    async getHtml() { return await TemplateLoader.loadTemplate("game-setup"); }
    
    // Handles game form options
    async initialize() {
        const gameModeSelect = document.getElementById("gameMode");

        if (gameModeSelect) {
            gameModeSelect.addEventListener("change", (e) => {
                const difficultyGroup = document.getElementById("difficultyGroup");
                difficultyGroup.style.display =
                    e.target.value === "pvc" ? "flex" : "none";
            });
        }

        if (gameModeSelect) {
            gameModeSelect.addEventListener("change", (e) => {
                const firstPlayer = document.getElementById("firstPlayer");
                firstPlayer.style.display =
                    e.target.value === "pvpo" ? "none" : "flex";
            });
        }

        const gameSetupForm = document.getElementById("gameSetupForm");
        if (gameSetupForm) {
            gameSetupForm.addEventListener("submit", async (e) => {
                e.preventDefault();

                const gameSettings = {
                    gameMode: document.getElementById("gameMode").value,
                    difficulty: document.getElementById("difficulty").value,
                    boardSize: document.getElementById("boardSize").value,
                    firstPlayer: document.getElementById("firstPlayer").value,
                };
                
                sessionStorage.setItem("gameSettings", JSON.stringify(gameSettings));
                if (gameMode === "pvpo"){
                    try {
                        const gameCode = await requests.requestJoin(GROUP, NICKNAME, PASSWORD, gameSettings.boardSize);
                        sessionStorage.setItem("game", gameCode.game)
                        navigateTo("/game-online");
                    }
                    catch(error) { console.log("Error in join method", error) }
                }    
                else {
                    console.log("Entrei no jogo local");
                    navigateTo("/game");}
            });
        }

        addSPABackButton.addBackButtonListener.call(this);
    }
}



class GameRunnerView extends BaseView {
    constructor() {
        super();
        this.setTitle("Nine Men's Morris");
    }
    async getHtml() { return await TemplateLoader.loadTemplate("game"); }
    async initialize() {
        try {
            const boardElement = document.getElementById("board");
            if (!boardElement) {
                console.error("Board element not found");
                return;
            }

            const gameSettings = JSON.parse(
                sessionStorage.getItem("gameSettings") || "{}"
            );

            const exitBtn = document.getElementById("exit-btn");
            if (exitBtn) {
                exitBtn.addEventListener("click", async (e) => {
                    e.preventDefault();
                    
                    navigateTo("/");
                });
            }

            if (typeof window.Board.run_game === "function") {
                
                
                if (gameSettings === null) console.log("gameSettings is null");

                console.log(gameSettings.boardSize);
                console.log(gameSettings.gameMode);
                console.log(gameSettings.difficulty);
                console.log(gameSettings.firstPlayer);

                await window.Board.run_game(gameSettings);

            } else {
                console.error("run_game function not found in board module");
            }
        } catch (error) {
            console.error("Error initializing game:", error);
        }
    }
}



class GameRunnerServerView extends BaseView {
    constructor() {
        super();
        this.setTitle("Nine Men's Morris");
    }
    async getHtml() { return await TemplateLoader.loadTemplate("game"); }
    async initialize() {
        try {
            const boardElement = document.getElementById("board");
            if (!boardElement) {
                console.error("Board element not found");
                return;
            }

            const game = sessionStorage.getItem("game")

            serverRequests.requestUpdate(
                sessionStorage.getItem("game"),
                NICKNAME, 
                serverRequests.processDataPeriodically(processCollectedData)
            )

            const exitBtn = document.getElementById("exit-btn");
            if (exitBtn) {
                exitBtn.addEventListener("click", async (e) => {
                    e.preventDefault();
                    sessionStorage.removeItem("gameSettings");
                    requests.requestLeave(NICKNAME, PASSWORD, game);
                    sessionStorage.removeItem("game");
                    navigateTo("/");
                });
            }

            if (typeof window.Board.run_game === "function") {
                // await window.Board.run_game(gameSettings);
            } else {
                console.error("run_game function not found in board module");
            }
        } catch (error) {
            console.error("Error initializing game:", error);
        }
    }
}


class NotFoundView extends BaseView {
    constructor() {
        super();
        this.setTitle("404 - Page Not Found");
    }
    async getHtml() { return await TemplateLoader.loadTemplate('404'); }
    initialize() {
        const homeBtn = document.getElementById("homeBtn");
        const backBtn = document.getElementById("backBtn");

        if (homeBtn) {
            homeBtn.addEventListener("click", () => {
                navigateTo("/");
            });
        }

        if (backBtn) {
            backBtn.addEventListener("click", () => {
                window.history.back();
            });
        }
    }

    // Cleans up event listeners when the view is destroyed.
    cleanup() {
        const homeBtn = document.getElementById("homeBtn");
        const backBtn = document.getElementById("backBtn");

        homeBtn?.removeEventListener("click", this.handleHomeClick);
        backBtn?.removeEventListener("click", this.handleBackClick);
    }
}



/**
 * Utility class for loading HTML templates.
 */
class TemplateLoader {
    /**
     * Loads a template file by name.
     */
    static async loadTemplate(name) {
        try {
            const response = await fetch(`/templates/${name}.html`);
            if (!response.ok) { 
                throw new Error(`Failed to load template: ${name}`); 
            }
            return await response.text();
        } catch (error) {
            console.error("Template loading error:", error);
            return "";
        }
    }
}



/**
 * Utility object for adding back button functionality to views.
 */
const addSPABackButton = {
    addBackButtonListener() {
        const backBtn = document.getElementById("backBtn");
        if (backBtn) {
            backBtn.addEventListener("click", (e) => {
                e.preventDefault();
                navigateTo("/");
            });
        }
    }
};




const processCollectedData = requests.processDataPeriodically((data) => {
    boardUtils.removeGlowEffect();
    data.board = boardUtils.convertBoardFormat(data.board)
    boardUtils.redrawBoard(data.board);
    if(data.turn != boardUtils.login){
        return;  
    }
    console.log("Processed data:", data.board);
    boardUtils.data = data;
    if(data.phase == "move" || data.step == "from"){
        addColorToOwnPieces(data)
    }
    else if(data.phase == "move" || data.step == "to"){
        addColorToNeighbors(data);
    }
    else if(data.phase == "move" || data.step == "take"){
        
    }
});



export {
    BaseView,
    RulesView,
    GameView,
    HowToPlayView,
    RankingView,
    GameRunnerView,
    GameRunnerServerView,
    LoginView,
    NotFoundView,
};