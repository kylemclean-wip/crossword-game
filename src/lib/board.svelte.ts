import * as v from "valibot";
import { Cell, cellLetterRegex, cellStateSchema } from "./cell.svelte.ts";
import type { Puzzle } from "./puzzle.ts";
import { Word, wordStateSchema } from "./word.svelte.ts";
import { directionSchema, type Direction } from "./direction.ts";
import { positionSchema } from "./position.ts";
import type { CellChange, SelectionChange } from "./network.ts";
import type { Player } from "./player.svelte.ts";
import type { AnnounceOptions } from "./endpoint.ts";
import type { Position } from "./position.ts";

export class Board {
  _playerThisIsBoardOf: Player | null = null;
  readonly id: string = "";
  readonly cells: ReadonlyArray<ReadonlyArray<Cell>> = $state.raw()!;

  _words: ReadonlyArray<Word> = $state.raw()!;
  get words() {
    return this._words;
  }
  set words(newWords: ReadonlyArray<Word>) {
    const width = this.width;
    const height = this.height;

    let nextLabelNumber = 1;
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < height; x++) {
        const cell = this.cells[y][x];

        const isStartOfAcrossWord =
          cell.words.across && x === cell.words.across.startCell.x;
        const isStartOfDownWord =
          cell.words.down && y === cell.words.down.startCell.y;

        if (isStartOfAcrossWord || isStartOfDownWord) {
          if (isStartOfAcrossWord)
            cell.words.across!.label = String(nextLabelNumber);
          if (isStartOfDownWord)
            cell.words.down!.label = String(nextLabelNumber);

          nextLabelNumber++;
        }
      }
    }

    const directionOrder = ["across", "down"] as Direction[];
    this._words = newWords.toSorted(
      (a, b) =>
        directionOrder.indexOf(a.direction) -
          directionOrder.indexOf(b.direction) ||
        Number(a.label) - Number(b.label)
    );
  }

  editing = $state(false);

  private _selection: { cell: Cell; direction: Direction } | null =
    $state.raw(null);
  get selection(): Readonly<typeof this._selection> {
    return this._selection;
  }

  get player() {
    return this._playerThisIsBoardOf;
  }

  static fromPuzzle(puzzle: Puzzle) {
    const boardId = crypto.randomUUID();

    const width = puzzle.cellLetters[0].length;
    const height = puzzle.cellLetters.length;

    const cells: Cell[][] = Array.from({
      length: height,
    }).map((_, y) =>
      Array.from({ length: width }).map((_, x) => new Cell({ x, y }))
    );
    const words: Word[] = [];

    for (const clue of puzzle.clues) {
      let { x, y } = clue.startCell;
      let letters = "";

      do {
        const letter = puzzle.cellLetters[y][x];

        if (!cellLetterRegex.test(letter)) {
          throw new Error(
            `Invalid clue ${clue}: invalid letter "${letter}" at (${x}, ${y})`
          );
        }

        letters += letter;
        if (clue.direction === "across") x++;
        else y++;
      } while (x < width && y < height && puzzle.cellLetters[y][x] !== " ");

      const word = new Word({
        id: words.length,
        startCell: cells[clue.startCell.y][clue.startCell.x],
        direction: clue.direction,
        label: "",
        clueText: clue.text,
        letters: letters.split("").map((letter) => ({ type: "known", letter })),
      });

      for (const cell of word.cells((x, y) => cells[y][x]))
        cell.words[word.direction] = word;

      words.push(word);
    }

    const board = new Board({
      id: boardId,
      cells,
      words,
    });

    const firstWord = board.words.at(0);
    if (firstWord) {
      board.changeSelection(
        {
          cell: firstWord.startCell.position,
          direction: firstWord.direction,
        },
        { announce: false }
      );
    }

    return board;
  }

  static fromBoardState(boardState: BoardState) {
    const cells = boardState.cellStates.map((row, y) =>
      row.map((cellState, x) => {
        const cell = new Cell({ x, y });
        cell.change(
          { letter: cellState.letter, status: cellState.status },
          { announce: false, callHandlers: false }
        );
        return cell;
      })
    );

    const words = boardState.words.map(
      (wordState, index) =>
        new Word({
          id: index,
          label: wordState.label,
          letters: wordState.letters,
          direction: wordState.direction,
          startCell: cells[wordState.startCell.y][wordState.startCell.x],
          clueText: wordState.clueText,
        })
    );

    for (const word of words) {
      for (const cell of word.cells((x, y) => cells[y][x])) {
        cell.words[word.direction] = word;
      }
    }

    const board = new Board({
      id: boardState.id,
      cells,
      words,
    });

    if (boardState.selection) {
      board.changeSelection(boardState.selection, { announce: false });
    }

    return board;
  }

  static createEmpty({ width, height }: { width: number; height: number }) {
    return Board.fromPuzzle({
      cellLetters: Array.from({ length: height }).map(() => " ".repeat(width)),
      clues: [],
    });
  }

  constructor({
    id,
    cells,
    words,
  }: {
    id: string;
    cells: Cell[][];
    words: Word[];
  }) {
    this.id = id;
    this.cells = cells;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cellAt(x, y).board = this;
      }
    }

    this.words = words;
  }

  tryCellAt(x: number, y: number): Cell | null {
    return this.cells[y]?.[x] ?? null;
  }

  cellAt(x: number, y: number): Cell {
    const cell = this.tryCellAt(x, y);
    if (!cell) {
      throw new Error(`No cell at (${x}, ${y})`);
    }
    return cell;
  }

  changeSelection(
    selectionChange: SelectionChange,
    {
      announce,
      throwOnFailure = true,
    }: { announce: boolean | AnnounceOptions; throwOnFailure?: boolean }
  ) {
    const succeeded = (() => {
      if (selectionChange === null) {
        this._selection = null;
        return true;
      }

      const newCellPosition =
        selectionChange.cell ?? this.selection?.cell.position;
      if (!newCellPosition) return false;

      const newDirection =
        selectionChange.direction ?? this.selection?.direction ?? "across";

      const cell = this.tryCellAt(newCellPosition.x, newCellPosition.y);
      if (cell && (!cell.isVoid || this.editing)) {
        this._selection = { cell, direction: newDirection };
        return true;
      }

      return false;
    })();

    if (!succeeded && throwOnFailure) {
      throw new Error("Failed to apply selection change", {
        cause: selectionChange,
      });
    }

    if (succeeded && announce && this.player) {
      this.player.game.endpoint.announce(
        {
          type: "selectionChange",
          boardId: this.id,
          selectionChange,
        },
        typeof announce === "object" ? announce : {}
      );
    }

    return succeeded;
  }

  advanceSelectedCell(change: number) {
    if (!this.selection) return false;

    return this.changeSelection(
      {
        cell: (this.selection.direction === "across"
          ? {
              x: this.selection.cell.x + change,
              y: this.selection.cell.y,
            }
          : {
              x: this.selection.cell.x,
              y: this.selection.cell.y + change,
            }) as Position,
      },
      { announce: true, throwOnFailure: false }
    );
  }

  advanceSelectedWord(change: number) {
    const { selectedWord } = this;
    if (!selectedWord) return;

    const currentWordIndex = this.words.findIndex(
      (word) =>
        word.direction === selectedWord.direction &&
        word.startCell.x === selectedWord.startCell.x &&
        word.startCell.y === selectedWord.startCell.y
    );
    if (currentWordIndex === -1) throw new Error("Current word not found");

    const changeWordIndex = (index: number, change: number) => {
      return (
        (((index + change) % this.words.length) + this.words.length) %
        this.words.length
      );
    };

    let newWordIndex = currentWordIndex;
    do {
      newWordIndex = changeWordIndex(newWordIndex, change);
    } while (
      this.words[newWordIndex].isFilled() &&
      newWordIndex !== currentWordIndex
    );

    if (newWordIndex === currentWordIndex)
      newWordIndex = changeWordIndex(currentWordIndex, 1);

    const newWord = this.words[newWordIndex];
    this.selectedWord = newWord;
  }

  get selectedWord() {
    if (!this.selection) return null;
    return this.selection.cell.words[this.selection.direction];
  }

  set selectedWord(word: Word | null) {
    if (!word) {
      this._selection = null;
      return;
    }

    if (this.selectedWord?.id === word.id) {
      this.changeSelection(
        {
          cell: word.startCell.position,
          direction: word.direction,
        },
        { announce: true }
      );
      return;
    }

    let x = word.startCell.x;
    let y = word.startCell.y;

    while (true) {
      const cell = this.tryCellAt(x, y);
      if (!cell || !cell.words[word.direction]) {
        x = word.startCell.x;
        y = word.startCell.y;
        break;
      }

      if (!cell.letter) break;

      if (word.direction === "across") x++;
      else y++;
    }

    this.changeSelection(
      {
        cell: { x, y } as Position,
        direction: word.direction,
      },
      { announce: true }
    );
  }

  get width() {
    return this.cells[0].length;
  }

  get height() {
    return this.cells.length;
  }

  checkPuzzle() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cellAt(x, y).check();
      }
    }
  }

  reset() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cellAt(x, y).change({ letter: "" }, { announce: true });
      }
    }
  }

  boardState(options: { includeAnswers: boolean }): BoardState {
    return {
      id: this.id,
      cellStates: this.cells.map((row) => row.map((cell) => cell.cellState())),
      selection: this.selectionState(),
      words: this.words.map((word) => word.wordState(options)),
    };
  }

  selectionState(): SelectionState {
    return this.selection
      ? {
          cell: this.selection.cell.position,
          direction: this.selection.direction,
        }
      : null;
  }

  isKnownSolved() {
    return this.words.every((word) => word.isKnownSolved());
  }

  onCellChange(cell: Cell, change: CellChange) {
    if (this.editing) {
      const words: Word[] = [];
      let currentWordData:
        | { startCell: Cell; direction: Direction; letters: "" }
        | undefined;

      function pushWord() {
        if (currentWordData)
          words.push(
            new Word({
              id: words.length,
              direction: currentWordData.direction,
              startCell: currentWordData.startCell,
              letters: currentWordData.letters
                .split("")
                .map((letter) => ({ letter, type: "known" })),
              clueText: "",
              label: "",
            })
          );
        currentWordData = undefined;
      }

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const cell = this.cellAt(x, y);
          cell.words.across = null;
          if (cell.letter) {
            if (!currentWordData)
              currentWordData = {
                startCell: cell,
                direction: "across",
                letters: "",
              };

            currentWordData.letters += cell.letter;
          } else {
            pushWord();
          }
        }
        pushWord();
      }

      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          const cell = this.cellAt(x, y);
          cell.words.down = null;
          if (cell.letter) {
            if (!currentWordData)
              currentWordData = {
                startCell: cell,
                direction: "down",
                letters: "",
              };

            currentWordData.letters += cell.letter;
          } else {
            pushWord();
          }
        }
        pushWord();
      }

      for (const word of words) {
        for (const cell of word.cells()) {
          cell.words[word.direction] = word;
        }
      }

      this.words = words;
    }

    if (this.player) this.player.game.onCellChange(cell);
  }

  handleKeyDown(event: {
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  }) {
    if (!this.selection) return false;

    const pressedLetter =
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
        ? event.key.toUpperCase()
        : undefined;

    if (event.key === " ") {
      this.changeSelection(
        {
          direction: this.selection.direction === "across" ? "down" : "across",
        },
        { announce: true }
      );
    } else if (event.key === "Backspace") {
      const wasInEmptyCell = this.selection.cell.letter === "";

      if (wasInEmptyCell) this.advanceSelectedCell(-1);

      if (this.selection.cell.status !== "knownCorrect")
        this.selection.cell.change({ letter: "" }, { announce: true });

      if (!wasInEmptyCell) this.advanceSelectedCell(-1);
    } else if (event.key === "Delete") {
      if (this.selection.cell.status !== "knownCorrect")
        this.selection.cell.change({ letter: "" }, { announce: true });
    } else if (event.key === "ArrowUp") {
      if (this.selection.direction === "across") {
        this.changeSelection({ direction: "down" }, { announce: true });
      } else {
        this.advanceSelectedCell(-1);
      }
    } else if (event.key === "ArrowDown") {
      if (this.selection.direction === "across") {
        this.changeSelection({ direction: "down" }, { announce: true });
      } else {
        this.advanceSelectedCell(1);
      }
    } else if (event.key === "ArrowLeft") {
      if (this.selection.direction === "down") {
        this.changeSelection({ direction: "across" }, { announce: true });
      } else {
        this.advanceSelectedCell(-1);
      }
    } else if (event.key === "ArrowRight") {
      if (this.selection.direction === "down") {
        this.changeSelection({ direction: "across" }, { announce: true });
      } else {
        this.advanceSelectedCell(1);
      }
    } else if (event.key === "Enter" || event.key === "Tab") {
      this.advanceSelectedWord(event.shiftKey ? -1 : 1);
    } else if (pressedLetter && cellLetterRegex.test(pressedLetter)) {
      const originalCell = this.selection.cell;
      const originalCellLetter = this.selection.cell.letter;

      if (this.selection.cell.status !== "knownCorrect") {
        this.selection.cell.change(
          { letter: pressedLetter },
          { announce: true }
        );
      }

      let selectedNextEmpty = false;
      do {
        selectedNextEmpty = this.advanceSelectedCell(1);
      } while (this.selection.cell.letter !== "" && selectedNextEmpty);

      if (!selectedNextEmpty) {
        this.changeSelection(
          { cell: originalCell.position },
          { announce: true }
        );
        if (originalCellLetter !== "") this.advanceSelectedCell(1);
      }
    } else {
      // Ignore this event
      return false;
    }

    return true;
  }
}

export const selectionStateSchema = v.nullable(
  v.object({ cell: positionSchema, direction: directionSchema })
);
export type SelectionState = v.InferOutput<typeof selectionStateSchema>;

export const boardStateSchema = v.object({
  id: v.string(),
  cellStates: v.array(v.array(cellStateSchema)),
  selection: selectionStateSchema,
  words: v.array(wordStateSchema),
});
export type BoardState = v.InferOutput<typeof boardStateSchema>;
