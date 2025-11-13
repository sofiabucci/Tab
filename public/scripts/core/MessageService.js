/**
 * Utility class for Tâb game operations. 
 * Handles game messaging and UI notifications.
 * @class
 */
export class MessageService { 
 /** 
     * Element ID constant for the game message display
     * @constant {string}
     */
    static MESSAGE_BOX_ID = 'gameMessage';

     /**
     * Displays a message in the game message box
     * @param {string} text - Message text to display
     */
    static showMessage(text) {
        const msgEl = document.getElementById(MessageService.MESSAGE_BOX_ID);
        if (msgEl) msgEl.textContent = text;
    }
}