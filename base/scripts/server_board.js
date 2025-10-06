import * as serverRequests from "./serverRequests.js" 
import {BoardUtils} from "./board_utils.js"

/**
 * -----------------------------------------------------------------------------
 * Essas variaveis tem que ser integradas com as opçoes do jogo na pagina anterior
 */ 
const game_size = 3
const login = "Roxy!"
const senha = "mizumajutsushi"
/**
 * -----------------------------------------------------------------------------
 */

function addColorToOwnPieces(data) {
    let cor_player = data.players[boardUtils.login];
    if (cor_player === "blue") {
        cor_player = "black";
    }
    const buttons = document.querySelectorAll(`.button`);
    buttons.forEach(button => {
        const backgroundImage = window.getComputedStyle(button).backgroundImage;
        if (backgroundImage.includes(`${cor_player}_piece.jpg`)) {
            boardUtils.addGlowEffect("green", button.id);
        }
    });
}


function addColorToNeighbors(data){
    const new_pos = boardUtils.convertSingleButton(data.cell.position + 1);
        const id = `${data.cell.square + 1}${new_pos}`;
        boardUtils.addGlowEffect("green", id);
        const buttons = document.querySelectorAll(`.button`)
        buttons.forEach(button => {
            var id1 = [parseInt(data.cell.square), parseInt(new_pos - 1)]
            var id2 = [parseInt(button.id[0]) - 1, parseInt(button.id[1]) - 1]
            if(boardUtils.isneighbor(id1, id2)){
                addGlowEffect("green", id2)
            }            
        });
}
const boardUtils = new BoardUtils(serverRequests, login, senha, null, null);
// boardUtils.createSquares(game_size)

const processCollectedData = serverRequests.processDataPeriodically((data) => {
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

async function teste_singleplayer() {
    try {
        await serverRequests.requestRegister("Roxy!", "mizumajutsushi"); 
        const game_info = await serverRequests.requestJoin(24,"Roxy!", "mizumajutsushi", 3); 
        console.log('Response from requestJoin:', game_info);
        boardUtils.game_info = game_info.game
        serverRequests.requestUpdate(game_info.game, "Roxy!", 
            serverRequests.processDataPeriodically(processCollectedData))
        
    } catch (error) {
        console.error('An error occurred in main:', error.message);
    }
    try {
        await serverRequests.requestRegister("Eris!", "eriswasekainoichibankirei"); 
        const game_info = await serverRequests.requestJoin(24, "Eris!", "eriswasekainoichibankirei", 3); 
        console.log('Response from requestJoin:', game_info); 
        await serverRequests.requestNotify("Roxy!", "mizumajutsushi", String(game_info.game), 0, 0)
        await serverRequests.requestNotify("Eris!", "eriswasekainoichibankirei", String(game_info.game), 0, 1)
        const game_info_rankings = await serverRequests.requestRanking(24, 5)
        console.log(`Response from requestRankings`, game_info_rankings)
       
    } catch (error) {
        console.error('An error occurred in main:', error.message);
    }
   
}
async function teste_multiplayer(){
    try {
        await serverRequests.requestRegister(login, senha); 
        const game_info = await serverRequests.requestJoin(24,login, senha, game_size); 
        console.log('Response from requestJoin:', game_info);
        boardUtils.game_info = game_info.game
        serverRequests.requestUpdate(game_info.game, login, 
            serverRequests.processDataPeriodically(processCollectedData))
        
    } catch (error) {
        console.error('An error occurred in main:', error.message);
    }
}
//teste_singleplayer()
teste_multiplayer()
