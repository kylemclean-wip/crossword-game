import * as v from "valibot";
import { cellLetterRegex, type Cell } from "./cell.svelte.ts";
import { directionSchema, type Direction } from "./direction.ts";
import { positionSchema } from "./position.ts";

export class Word {
  readonly id: number;
  readonly direction: Direction;
  readonly startCell: Cell;
  readonly clueText: string;
  label: string = $state("");
  letters: ReadonlyArray<WordLetter> = $state.raw()!;

  constructor({
    id,
    direction,
    startCell,
    clueText,
    label,
    letters,
  }: {
    id: number;
    direction: Direction;
    startCell: Cell;
    clueText: string;
    label: string;
    letters: ReadonlyArray<WordLetter>;
  }) {
    this.id = id;
    this.direction = direction;
    this.startCell = startCell;
    this.clueText = clueText;
    this.label = label;
    this.letters = letters;
  }

  *cells(
    getCell: (x: number, y: number) => Cell = (x, y) =>
      this.startCell.board.cellAt(x, y)
  ) {
    let { x, y } = this.startCell.position;

    for (let i = 0; i < this.letters.length; i++) {
      yield getCell(x, y);
      if (this.direction === "across") x++;
      else y++;
    }
  }

  isFilled() {
    return this.cells().every((cell) => cell.letter);
  }

  isKnownSolved() {
    return this.cells().every((cell) => {
      if (cell.status === "knownCorrect") return true;

      const correctLetter = cell.correctLetter;
      if (correctLetter?.type !== "known") return false;

      return cell.letter === correctLetter.letter;
    });
  }

  wordState(options: { includeAnswers: boolean }): WordState {
    return {
      startCell: this.startCell.position,
      direction: this.direction,
      letters: this.letters.map((letter) =>
        options.includeAnswers ? letter : { type: "unknown" }
      ),
      label: this.label,
      clueText: this.clueText,
    };
  }
}

const wordLetterSchema = v.variant("type", [
  v.object({
    type: v.literal("known"),
    letter: v.pipe(v.string(), v.regex(cellLetterRegex)),
  }),
  v.object({ type: v.literal("unknown") }),
]);
type WordLetter = Readonly<v.InferOutput<typeof wordLetterSchema>>;

export const wordStateSchema = v.object({
  label: v.string(),
  letters: v.array(wordLetterSchema),
  direction: directionSchema,
  startCell: positionSchema,
  clueText: v.string(),
});
export type WordState = v.InferOutput<typeof wordStateSchema>;

export interface Clue {
  readonly word: Word;
  readonly text: string;
}
