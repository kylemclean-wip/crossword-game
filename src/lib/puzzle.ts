import type { Position } from "./position.ts";
import type { Direction } from "./direction.ts";

export interface Puzzle {
  cellLetters: string[];
  clues: { startCell: Position; direction: Direction; text: string }[];
}
