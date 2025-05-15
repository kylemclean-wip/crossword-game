import * as v from "valibot";
import type { Word } from "./word.svelte.ts";
import type { Direction } from "./direction.ts";
import type { CellChange } from "./network.ts";
import type { AnnounceOptions } from "./endpoint.ts";
import type { Position } from "./position.ts";
import type { Board } from "./board.svelte.ts";

export const cellLetterRegex = /^[A-Z]?$/;

export class Cell {
  private _board: Board | undefined;
  readonly x: number;
  readonly y: number;
  readonly words: Record<Direction, Word | null> = $state({
    across: null,
    down: null,
  });
  private _letter: string = $state("");
  private _status: CellStatus = $state("default");

  constructor({ x, y }: { x: number; y: number }) {
    this.x = x;
    this.y = y;
  }

  get board() {
    const board = this._board;
    if (!board) throw new Error("No board");
    return board;
  }

  set board(board: Board) {
    if (this._board) throw new Error("Cell already has a board");
    this._board = board;
  }

  get letter() {
    return this._letter;
  }

  get status() {
    return this._status;
  }

  get isVoid() {
    return !this.words.across && !this.words.down;
  }

  get correctLetter() {
    const wordToCheck = this.words.across ?? this.words.down;
    if (!wordToCheck) return null;

    const indexInWord =
      wordToCheck.direction === "across"
        ? this.x - wordToCheck.startCell.x
        : this.y - wordToCheck.startCell.y;

    return wordToCheck.letters[indexInWord];
  }

  check() {
    if (this.letter === "" || this.isVoid) return;

    const correctLetter = this.correctLetter;
    if (!correctLetter) return;

    this.change(
      {
        status:
          correctLetter.type === "unknown"
            ? "default"
            : correctLetter.letter === this.letter
            ? "knownCorrect"
            : "knownIncorrect",
      },
      { announce: true }
    );
  }

  cellState(): CellState {
    return {
      letter: this.letter,
      status: this._status,
    };
  }

  get position(): Position {
    return { x: this.x, y: this.y } as Position;
  }

  change(
    change: CellChange,
    {
      announce,
      callHandlers = true,
    }: { announce: boolean | AnnounceOptions; callHandlers?: boolean }
  ) {
    const oldLetter = this.letter;

    if (change.letter !== undefined && change.letter !== oldLetter) {
      if (!cellLetterRegex.test(change.letter))
        throw new Error(`Invalid letter: ${change.letter}`);

      this._letter = change.letter;
    }

    if (change.status !== undefined) {
      this._status = change.status;
    } else if (this.letter !== oldLetter) {
      this._status = "default";
    }

    if (announce && this.board.player) {
      this.board.player.game.endpoint.announce(
        {
          type: "cellChange",
          boardId: this.board.id,
          cellPosition: this.position,
          cellChange: change,
        },
        typeof announce === "object" ? announce : {}
      );
    }

    if (callHandlers) {
      this.board.onCellChange(this, change);
    }
  }
}

const cellStatusSchema = v.picklist([
  "default",
  "knownCorrect",
  "knownIncorrect",
]);
export type CellStatus = v.InferOutput<typeof cellStatusSchema>;

export const cellStateSchema = v.object({
  letter: v.pipe(v.string(), v.regex(cellLetterRegex)),
  status: cellStatusSchema,
});
export type CellState = v.InferOutput<typeof cellStateSchema>;
