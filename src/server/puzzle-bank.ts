import type { Puzzle } from "../lib/puzzle.ts";
import type { Position } from "../lib/position.ts";

export const puzzleBank: Puzzle[] = [
  {
    cellLetters: [" APR ", "TRIAL", "ARENA", "RACKS", " YES "],
    clues: [
      {
        startCell: { x: 1, y: 0 } as Position,
        direction: "across",
        text: "Loan statistic, or month",
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        direction: "across",
        text: "Evaluation",
      },
      {
        startCell: { x: 0, y: 2 } as Position,
        direction: "across",
        text: "Venue for various big events",
      },
      {
        startCell: { x: 0, y: 3 } as Position,
        direction: "across",
        text: "Things that store things",
      },
      {
        startCell: { x: 1, y: 4 } as Position,
        direction: "across",
        text: "Simple answer",
      },
      {
        startCell: { x: 1, y: 0 } as Position,
        direction: "down",
        text: "Data type that stores many",
      },
      {
        startCell: { x: 2, y: 0 } as Position,
        direction: "down",
        text: "Portion",
      },
      {
        startCell: { x: 3, y: 0 } as Position,
        direction: "down",
        text: "Standings",
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        direction: "down",
        text: "Viscous organic material",
      },
      {
        startCell: { x: 4, y: 1 } as Position,
        direction: "down",
        text: "___ Vegas",
      },
    ],
  },
  {
    cellLetters: [" AUS ", "ALLOY", "TITLE", "MARIA", " SAD "],
    clues: [
      {
        startCell: { x: 1, y: 0 } as Position,
        direction: "across",
        text: "Abbreviation for the largest Oceanic country",
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        direction: "across",
        text: "Mixture of metals",
      },
      {
        startCell: { x: 0, y: 2 } as Position,
        direction: "across",
        text: "Name",
      },
      {
        startCell: { x: 0, y: 3 } as Position,
        direction: "across",
        text: "2024 film about opera singer Callas",
      },
      {
        startCell: { x: 1, y: 4 } as Position,
        direction: "across",
        text: "Lacking in joy",
      },
      {
        startCell: { x: 1, y: 0 } as Position,
        direction: "down",
        text: "Another name",
      },
      {
        startCell: { x: 2, y: 0 } as Position,
        direction: "down",
        text: "MK_____",
      },
      {
        startCell: { x: 3, y: 0 } as Position,
        direction: "down",
        text: "Familiar state of matter",
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        direction: "down",
        text: "Source of funds",
      },
      {
        startCell: { x: 4, y: 1 } as Position,
        direction: "down",
        text: "Agreement",
      },
    ],
  },
  {
    cellLetters: [" ALL ", "CHEAP", "DEATH", "SAVED", " DER "],
    clues: [
      {
        startCell: { x: 1, y: 0 } as Position,
        direction: "across",
        text: "Every",
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        direction: "across",
        text: 'With "out", to skimp',
      },
      {
        startCell: { x: 0, y: 2 } as Position,
        direction: "across",
        text: "Our end",
      },
      {
        startCell: { x: 0, y: 3 } as Position,
        direction: "across",
        text: "Rescued",
      },
      {
        startCell: { x: 1, y: 4 } as Position,
        direction: "across",
        text: "Common German article",
      },
      {
        startCell: { x: 1, y: 0 } as Position,
        direction: "down",
        text: "In front",
      },
      {
        startCell: { x: 2, y: 0 } as Position,
        direction: "down",
        text: "Exit",
      },
      {
        startCell: { x: 3, y: 0 } as Position,
        direction: "down",
        text: '"Not now"',
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        direction: "down",
        text: "Musical discs",
      },
      {
        startCell: { x: 4, y: 1 } as Position,
        direction: "down",
        text: "High degree",
      },
    ],
  },
];
