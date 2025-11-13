# README: Tâb Game Core OOP Scripts

This document outlines the intended OOP class structure for the Tâb game, located in the `public/scripts/core/` directory.

## ⚠️ Important Warning

As noted in `Main.js`, this OOP structure is **currently nonfunctional**.
Click handling still needs debugging.

This document is intended to help the team understand the **intended new architecture** for future development and refactoring.

---

## Class Overview

This new structure is built around several key classes:

* **`Main.js (GameBoard)`**: The primary game controller. It acts as the "brain" of the game, managing state and coordinating all other classes.
* **`Board.js (Board)`**: A data-focused class that represents the board itself. It manages the grid and the `Piece` objects within it.
* **`Piece.js (Piece)`**: A simple data class representing a single game token (piece).
* **`Player.js (Player)`**: A data class holding information for a player (human or AI).
* **`PlayerAI.js (PlayerAI)`**: Extends `Player` to add AI-specific properties.
* **`MovementCalculator.js (MovementCalculator)`**: A utility class that handles all movement logic and pathfinding.
* **`MessageService.js (MessageService)`**: A static utility class for displaying messages to the user.
* **`Dice.js (Dice)`**: \*Class was Not implemented. `Main.js` uses `windom.lastRoll` and `this.getLastRoll()` to get dice values given by `public/scripts/dice.js`

---

## Class Details

### `Main.js (class GameBoard)`

This is the main class that controls the entire game flow.

* **Role**: Manages game state, player turns, UI interaction (`handleClick`), and coordinates all other classes.
* **Key Attributes**:
    * `board (Board)`: An instance of the `Board` class.
    * `movementCalculator (MovementCalculator)`: An instance of the `MovementCalculator`.
    * `gameState (String)`: The current interaction state (e.g., `GAME_STATES.IDLE`, `GAME_STATES.TOKEN_SELECTED`).
    * `selectedTokenIndex (Number)`: The board index of the currently selected piece.
    * `currentPlayer (String)`: The ID of the active player (e.g., `Player.P1`).
    * `options (Object)`: Game settings (mode, difficulty) passed in at creation.
    * `gameActive (boolean)`: Flag to stop interactions when the game is over.
    * `diceRolled (boolean)`: Flag to check if a roll has been made this turn.
* **Key Methods**:
    * `constructor(id, cols, options)`: Initializes the game, creates the `Board` and `MovementCalculator`, and renders the initial state.
    * `handleClick(i)`: The main entry point for all user clicks on the board. It routes logic based on the `gameState`.
    * `handleTokenSelect(i, diceValue)`: Contains the logic for a player attempting to select a piece.
    * `handleTargetSelect(i, diceValue)`: Contains the logic for moving the `selectedTokenIndex` to a target square.
    * `isValidMove(from, to, diceValue, errorMsg)`: Checks if a move is legal by consulting the `MovementCalculator` and game rules.
    * `movePiece(from, to)`: Executes a move, updates the `board.content`, handles captures, and calls `endTurn()`.
    * `endTurn()`: Switches `currentPlayer`, handles "roll again" logic, and triggers `makeAIMove()` if it's the AI's turn.
    * `makeAIMove()`: Calls the global `window.IA` object to get an AI move and then calls `movePiece()`.
    * `checkGameEnd()`: Checks the `board` to see if a player has won.
    * `render()`: Clears and redraws all pieces on the board by reading from `this.board.content`.
    * `showMessage(text)`: Displays a message using `MessageService.showMessage()`.
    * `handleStickRoll(roll)`: Event listener that catches the `stickRoll` event, updates the game state, and triggers `makeAIMove()` if needed.

### `Board.js (class Board)`

This class represents the board's data and its DOM representation.

* **Role**: Manages the grid, the `Piece` objects, and the DOM elements for the board squares.
* **Key Attributes**:
    * `content (Array<Piece | null>)`: A 1D array representing the grid. It stores `Piece` objects at their corresponding index or `null` for empty squares.
    * `cols (Number)`: Number of columns.
    * `rows (Number)`: Number of rows (hardcoded to 4).
* **Key Methods**:
    * `initDOM(onCellClick)`: Creates all the `div.board-square` elements and attaches the `onCellClick` (which is `GameBoard.handleClick`) to them.
    * `setupPieces()`: Populates the `content` array with new `Piece` objects in their starting positions.
    * `getPieceAt(index)`: Returns the `Piece` object (or `null`) at a given index.
    * `setPieceAt(index, piece)`: Updates the `content` array with a piece or `null`.
    * `findPlayerPieces()`: Returns an object with arrays of piece indices for `P1Pieces` and `P2Pieces`.

### `Piece.js (class Piece)`

This is a simple data class for a single game token.

* **Role**: Represents a single piece, holding its state and player affiliation.
* **Key Attributes**:
    * `player (String)`: The player ID (`Player.P1` or `Player.P2`) that owns this piece.
    * `position (Number)`: Its current board index.
    * `state (String)`: Its current state (`Piece.UNMOVED`, `Piece.MOVED`, `Piece.PROMOTED`).
* **Key Methods**:
    * `createElement()`: Creates and returns the DOM element (`div.board-token`) for this specific piece, styled based on its `player` and `state`.
    * `markMoved()`, `promote()`: Methods to update the piece's internal state.

### `Player.js (class Player)` & `PlayerAI.js (class PlayerAI)`

These classes store player data. `PlayerAI` extends `Player`.

* **Role**: Data containers for player information.
* **Key Attributes (`Player`)**:
    * `id (String)`: `Player.P1` or `Player.P2`.
    * `name (String)`: Display name (not currently used).
    * `type (String)`: `Player.TYPE.HUMAN` or `Player.TYPE.AI`.
* **Key Attributes (`PlayerAI`)**:
    * `difficulty (String)`: 'easy', 'medium', or 'hard'.
* **Static Constants (`Player`)**:
    * `P1`, `P2`: Static constants for player IDs.
    * `TYPE`: Static constants for player types.

### `MovementCalculator.js (class MovementCalculator)`

A utility class for all pathfinding logic.

* **Role**: Decouples the complex movement logic from the main `GameBoard` class.
* **Key Attributes**:
    * `map (Map<number, number[]>)`: A pre-calculated map where the key is a square index and the value is an array of indices you can move to in a single step.
* **Key Methods**:
    * `static movementMap(rows, cols)`: A static method that generates the movement `map` (Note: this function is buggy and was the cause of a stack overflow).
    * `calculateTarget(fromIndex, steps)`: Recursively uses the `map` to find all possible destination squares given a starting index and number of steps.

### `MessageService.js (class MessageService)`

A static utility class for showing messages.

* **Role**: Decouples the `GameBoard` from the DOM. `GameBoard` doesn't need to know the ID of the message box, it just tells `MessageService` *what* to display.
* **Key Methods**:
    * `static showMessage(text)`: Finds the element with the ID `MESSAGE_BOX_ID` and updates its `textContent`.
    * (Note: The file has a typo: `Messager.MESSAGE_BOX_ID` should be `MessageService.MESSAGE_BOX_ID`).

### `Dice.js (class Dice)`

This class manages the dice component. (Based on the class file found in the zip).

* **Role**: Handles the dice DOM elements, click events, rolling animation, and dispatches a custom event with the roll result.
* **Key Attributes**:
    * `rollButton (HTMLElement)`: The `<button>` element.
    * `resultContainer (HTMLElement)`: The `<p>` element where the dice UI is rendered.
    * `isRolling (boolean)`: A flag to prevent multiple rolls at once.
* **Key Methods**:
    * `roll()`: An async method that shows a rolling animation, calculates a random roll, renders the result, and then dispatches a `stickRoll` custom event.
    * `reset()`: Clears the dice display.

---

## Intended Workflow

1.  `setup.js` (old script) calls `window.generateBoard()`.
2.  `generateBoard()` (in `Main.js`) creates a `new GameBoard(...)`.
3.  The `GameBoard` constructor:
    * Creates `new Board()`.
    * `Board` creates `new Piece()` objects and stores them in `board.content`.
    * `Board.initDOM()` builds the HTML for the board squares.
    * `GameBoard` creates `new MovementCalculator()`.
4.  User clicks the roll button. `Dice.roll()` (or the old `dice.js`) dispatches a `stickRoll` event.
5.  `GameBoard.handleStickRoll()` (which is an event listener) catches this event, stores the roll, and sets `diceRolled = true`.
6.  User clicks a board square. `Board.initDOM` has already wired this click to `GameBoard.handleClick(i)`.
7.  `handleClick(i)` checks `gameState`:
    * **State `IDLE`**: It calls `handleTokenSelect()`. If successful, `gameState` becomes `TOKEN_SELECTED`.
    * **State `TOKEN_SELECTED`**: It calls `handleTargetSelect()`.
8.  `handleTargetSelect()` calls `isValidMove()` to check legality.
9.  `isValidMove()` uses `movementCalculator.calculateTarget()` to get all valid destinations for the given dice roll.
10. If the move is valid, `handleTargetSelect()` calls `movePiece()`.
11. `movePiece()`:
    * Updates `board.content` (moving the `Piece` object).
    * Calls `render()` to update the DOM.
    * Calls `checkGameEnd()`.
    * Calls `endTurn()`.
12. `render()` loops through `board.content` and calls `piece.createElement()` for each piece to rebuild the board's visuals.
13. `endTurn()` switches the `currentPlayer` and, if `isAITurn()` is true, calls `makeAIMove()`.