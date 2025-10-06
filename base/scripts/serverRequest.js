//import {boardUtils} from "./board_utils.js"
/*Teste para o envio de pacotes ao servidor, async para nao ficar feio */

/*----------------------------------------------------------------------------------------
Função para registrar e logar um usuario, recebe o nickname do usuario e sua respectiva senha*/ 
export async function requestRegister(nick, password){
    try{
    const response = await fetch('http://twserver.alunos.dcc.fc.up.pt:8008/register', {
        method: 'POST',
        body: JSON.stringify({nick, password})
    })
    } catch (error) {
    alert(`Network error: ${error.message}`);
    console.error('Network error:', error);
    }
    /* para testar o sucesso de envio
    if(response.ok){
        alert("Success")
    }
    else{
        alert("Error, bad request")
    }
    */
}
/*-----------------------------------------------------------------------------------------
Debugging feito*/ 

/*----------------------------------------------------------------------------------------
Função para se juntar a um jogo/ para criar uma sala para o jogo*/ 
export async function requestJoin(group, nick, password, size) {
    try {
        const response = await fetch('http://twserver.alunos.dcc.fc.up.pt:8008/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ group, nick, password, size }),
        });

        if (response.ok) {
            const data = await response.json(); 
            alert("Success");
            return data; 
        } else {
            const errorText = await response.text(); 
            alert("Error, bad request");
            console.error('Error:', errorText);
            return null;
        }
    } catch (error) {
        alert(`Network error: ${error.message}`);
        console.error('Network error:', error);
        return null;
    }
}
/*-----------------------------------------------------------------------------------------
Debugging feito*/

/*----------------------------------------------------------------------------------------
Função para sair de um jogo, importante notar que apos 2 minutos um leave é executado automaticamente*/ 
async function requestLeave(nick, password, game){
    const response = await fetch('http://twserver.alunos.dcc.fc.up.pt:8008/leave', {
        method: 'POST',
        body: JSON.stringify({nick, password, game})
    })
}
/*-----------------------------------------------------------------------------------------
Debugging nao feito*/

/*----------------------------------------------------------------------------------------
Função para enviar ao servidor uma jogada*/ 
export async function requestNotify(nick, password, game, square, position) {
    const cell = { square, position };
    
    try {
        const response = await fetch('http://twserver.alunos.dcc.fc.up.pt:8008/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nick, password, game, cell })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error in requestNotify:", error);
    }
}

/*-----------------------------------------------------------------------------------------
Debugging nao feito*/

/*----------------------------------------------------------------------------------------
Função para autualizar o tabuleiro do jogo*/ 
export async function requestUpdate(game, nick, callback) {
    const params = new URLSearchParams({ game, nick });
    const url = `http://twserver.alunos.dcc.fc.up.pt:8008/update?${params.toString()}`;

    try {
        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            if (event.data.startsWith("winner:")) {
                const winner = event.data.split(":")[1].trim();
                console.log(`Game over. Winner: ${winner}`);
                eventSource.close();
                //chamar pop-up falando game-over
            } else {
                if (callback) callback(JSON.parse(event.data)); // Envia os dados para o callback
            }
        };

        eventSource.onerror = () => {
            console.error("Connection error.");
            eventSource.close();
        };

    } catch (error) {
        console.error("Error initializing EventSource:", error);
    }
}

export function processDataPeriodically(callback) {
    let latestData = null; // Armazena apenas o último pacote

    setInterval(() => {
        if (latestData !== null) {
            callback(latestData); // Processa apenas o último pacote
            latestData = null; // Limpa após processar
        }
    }, 1000);

    return (data) => {
        latestData = data; // Substitui pelo pacote mais recente
    };
}


/*-----------------------------------------------------------------------------------------
Debugging feito, no caso de nao existir o jogo o codigo funciona*/

/*----------------------------------------------------------------------------------------
Função retorna a tabela de classificação com os top 10 jogadores*/ 
export async function requestRanking(group, size) {
    try {
        const response = await fetch('http://twserver.alunos.dcc.fc.up.pt:8008/ranking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ group, size }),
        });

        if (response.ok) {
            const data = await response.json(); // Parse the JSON response
            alert("Success");
            return data; // Return the parsed response
        } else {
            const errorText = await response.text(); // Read the error response
            alert("Error, bad request");
            console.error('Error:', errorText);
            return null;
        }
    } catch (error) {
        alert(`Network error: ${error.message}`);
        console.error('Network error:', error);
        return null;
    }
}
/*-----------------------------------------------------------------------------------------
Debugging feito*/


