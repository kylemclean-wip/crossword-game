const letters = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;
type Letter = (typeof letters)[number];
type LetterCell = { type: "letter"; letter: Letter | undefined };
type EmptyCell = { type: "empty" };
type Cell = LetterCell | EmptyCell;

function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

type Direction = "across" | "down";
type Word = {
  cellPositions: { x: number; y: number }[];
  direction: Direction;
  state: { type: "chosen" } | { type: "unchosen"; candidates: Set<string> };
};
type UnchosenWord = Word & { state: { type: "unchosen" } };

function* getWordCells(
  word: { cellPositions: { x: number; y: number }[] },
  allCells: Cell[][]
) {
  for (const { x, y } of word.cellPositions) {
    const cell = allCells[y][x];
    if (cell.type !== "letter")
      throw new Error("Word contains non-letter cell");
    yield cell;
  }
}

function isViable(
  word: { cellPositions: { x: number; y: number }[] },
  candidate: string,
  cells: Cell[][]
) {
  if (candidate.length !== word.cellPositions.length) return false;

  const wordCells = [...getWordCells(word, cells)];
  for (let i = 0; i < wordCells.length; i++) {
    const cell = wordCells[i];
    if (
      cell.type === "letter" &&
      cell.letter !== undefined &&
      cell.letter !== candidate[i]
    ) {
      return false;
    }
  }

  return true;
}

export function generatePuzzle({
  cellConfiguration,
  wordList,
}: {
  cellConfiguration: (Letter | " " | ".")[][];
  wordList: string[];
}): { cells: Cell[][] } | null {
  const width = cellConfiguration[0].length;
  const height = cellConfiguration.length;

  const initialCells: Cell[][] = cellConfiguration.map((row) =>
    row.map((cell) =>
      cell === "."
        ? { type: "empty" }
        : {
            type: "letter",
            letter: cell === " " ? undefined : cell,
            wordIndices: { across: -1, down: -1 },
          }
    )
  );

  wordList = wordList.map((word) => word.toUpperCase());

  function getWordsInCells(direction: Direction) {
    const words: Word[] = [];
    const currentWordCellPositions: { x: number; y: number }[] = [];

    function pushWord() {
      if (currentWordCellPositions.length > 0) {
        const cellPositions = [...currentWordCellPositions];
        const word: Word = {
          cellPositions,
          direction,
          state: {
            type: "unchosen",
            candidates: new Set(
              shuffle(
                wordList.filter((candidate) =>
                  isViable({ cellPositions }, candidate, initialCells)
                )
              )
            ),
          },
        };
        words.push(word);
        currentWordCellPositions.length = 0;
      }
    }

    for (let i = 0; i < (direction === "across" ? height : width); i++) {
      for (let j = 0; j < (direction === "across" ? width : height); j++) {
        const cellPosition =
          direction === "across" ? { x: j, y: i } : { x: i, y: j };
        const cell = initialCells[cellPosition.y][cellPosition.x];
        if (cell.type === "empty") {
          pushWord();
        } else {
          currentWordCellPositions.push(cellPosition);
        }
      }

      pushWord();
    }

    return words;
  }

  const wordsInCells: Word[] = [
    ...getWordsInCells("across"),
    ...getWordsInCells("down"),
  ];

  const unchosenWords = wordsInCells.filter(
    (word): word is UnchosenWord => word.state.type === "unchosen"
  );

  return putWord({
    cells: initialCells,
    unchosenWords,
  });
}

function wordEntropy(word: UnchosenWord) {
  return word.state.candidates.size;
}

function tryCandidate({
  cells,
  unchosenWords,
  wordIndex,
  candidatesArray,
  candidateIndex,
}: {
  cells: Cell[][];
  unchosenWords: UnchosenWord[];
  wordIndex: number;
  candidatesArray: string[];
  candidateIndex: number;
}) {
  cells = structuredClone(cells);
  unchosenWords = structuredClone(unchosenWords);

  const word = unchosenWords[wordIndex];
  const candidate = candidatesArray[candidateIndex];

  for (let i = 0; i < word.cellPositions.length; i++) {
    const { x, y } = word.cellPositions[i];
    cells[y][x] = {
      type: "letter",
      letter: candidate[i] as Letter,
    };
  }

  (word as Word).state = { type: "chosen" };
  unchosenWords.splice(wordIndex, 1);

  for (const otherWord of unchosenWords) {
    otherWord.state.candidates.delete(candidate);
  }

  return putWord({ cells, unchosenWords });
}

function putWord({
  cells,
  unchosenWords,
}: {
  cells: Cell[][];
  unchosenWords: UnchosenWord[];
}): { cells: Cell[][] } | null {
  if (unchosenWords.length === 0) return { cells };

  // unchosenWords = structuredClone(unchosenWords);

  for (const word of unchosenWords) {
    word.state.candidates = new Set(
      word.state.candidates
        .values()
        .filter((candidate) => isViable(word, candidate, cells))
    );
  }

  unchosenWords.sort((a, b) => wordEntropy(a) - wordEntropy(b));

  const minEntropy = wordEntropy(unchosenWords[0]);
  const minEntropyWordCount =
    unchosenWords.findLastIndex((word) => wordEntropy(word) <= minEntropy) + 1;

  const wordIndex = Math.floor(Math.random() * minEntropyWordCount);
  const word = unchosenWords[wordIndex];

  const candidatesArray = [...word.state.candidates.values()];

  for (
    let candidateIndex = 0;
    candidateIndex < candidatesArray.length;
    candidateIndex++
  ) {
    const result = tryCandidate({
      cells,
      unchosenWords,
      wordIndex,
      candidatesArray,
      candidateIndex,
    });
    if (result !== null) return result;
  }

  return null;
}

import { wordList } from "./word-list.ts";

const puzzle = generatePuzzle({
  cellConfiguration: [
    [".", " ", " ", " ", "."],
    [" ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " "],
    [".", " ", " ", " ", "."],
  ],
  wordList,
});

if (puzzle) {
  for (const row of puzzle.cells) {
    let line = "";
    for (const cell of row) {
      if (cell.type === "empty") {
        line += " ";
      }
      if (cell.type === "letter") {
        line += cell.letter ?? "?";
      }
    }
    console.log(line);
  }
} else {
  console.log("No puzzle");
}
