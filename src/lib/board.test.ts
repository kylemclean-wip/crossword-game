import { expect, test } from "bun:test";
import { Board, type BoardState } from "./board.svelte.ts";
import type { Puzzle } from "./puzzle.ts";
import type { Position } from "./position.ts";
import { Game } from "./game.svelte.ts";
import { TestEndpoint } from "./test-endpoint.ts";
import { Cell, type CellStatus } from "./cell.svelte.ts";
import type { Direction } from "./direction.ts";
import { Player, PlayerChange } from "./player.svelte.ts";

function makeGameAndPlayer() {
  const endpoint = new TestEndpoint();
  const game = new Game({ endpoint });
  const player = new Player({ game, id: crypto.randomUUID() });
  return { game, player };
}

const puzzle: Puzzle = {
  cellLetters: [" ABC ", "DEFGH", "IJKLM", "NOPQR", " STU "],
  clues: [
    {
      direction: "across",
      text: "1A",
      startCell: { x: 1, y: 0 } as Position,
    },
    {
      direction: "across",
      text: "4A",
      startCell: { x: 0, y: 1 } as Position,
    },
    {
      direction: "across",
      text: "6A",
      startCell: { x: 0, y: 2 } as Position,
    },
    {
      direction: "across",
      text: "7A",
      startCell: { x: 0, y: 3 } as Position,
    },
    {
      direction: "across",
      text: "8A",
      startCell: { x: 1, y: 4 } as Position,
    },
    {
      direction: "down",
      text: "1D",
      startCell: { x: 1, y: 0 } as Position,
    },
    {
      direction: "down",
      text: "2D",
      startCell: { x: 2, y: 0 } as Position,
    },
    {
      direction: "down",
      text: "3D",
      startCell: { x: 3, y: 0 } as Position,
    },
    {
      direction: "down",
      text: "4D",
      startCell: { x: 0, y: 1 } as Position,
    },
    {
      direction: "down",
      text: "5D",
      startCell: { x: 4, y: 1 } as Position,
    },
  ],
};

function makeBoardFromPuzzle() {
  const { game, player } = makeGameAndPlayer();

  const board = Board.fromPuzzle(puzzle);
  player.change(new PlayerChange({ board }), {
    allow: "all",
    announce: false,
  });

  return {
    board,
    endpoint: game.endpoint as TestEndpoint,
  };
}

test("Board.fromPuzzle loads puzzle", () => {
  makeBoardFromPuzzle();
});

test("width", () => {
  const { board } = makeBoardFromPuzzle();
  expect(board.width).toBe(5);
});

test("height", () => {
  const { board } = makeBoardFromPuzzle();
  expect(board.height).toBe(5);
});

test("tryCellAt returns valid cell", () => {
  const { board } = makeBoardFromPuzzle();

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      expect(board.tryCellAt(x, y)).toBeInstanceOf(Cell);
    }
  }
});

test("tryCellAt returns null for out-of-bounds cell", () => {
  const { board } = makeBoardFromPuzzle();

  for (let y = -5; y <= 5; y += 5) {
    for (let x = -5; x <= 5; x += 5) {
      if (x === 0 && y === 0) continue;
      expect(board.tryCellAt(x, y)).toBeNull();
    }
  }
});

test("cellAt returns valid cell", () => {
  const { board } = makeBoardFromPuzzle();

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      expect(board.cellAt(x, y)).toBeInstanceOf(Cell);
    }
  }
});

test("cellAt throws for out-of-bounds cell", () => {
  const { board } = makeBoardFromPuzzle();

  for (let y = -5; y <= 5; y += 5) {
    for (let x = -5; x <= 5; x += 5) {
      if (x === 0 && y === 0) continue;
      expect(() => board.cellAt(x, y)).toThrowError();
    }
  }
});

test("Board.fromPuzzle loads puzzle with correct cells", () => {
  const { board } = makeBoardFromPuzzle();

  expect(board.cells.length).toBe(5);
  for (const cellRow of board.cells) {
    expect(cellRow.length).toBe(5);
  }

  function expectCell(
    x: number,
    y: number,
    correctLetter: string | null,
    letter: string,
    cellStatus: CellStatus
  ) {
    const cell = board.cellAt(x, y);

    expect(cell.x).toBe(x);
    expect(cell.y).toBe(y);

    if (correctLetter === null) {
      expect(cell.correctLetter).toBeNull();
    } else {
      expect(
        cell.correctLetter?.type === "known" && cell.correctLetter?.letter
      ).toBe(correctLetter);
    }

    expect(cell.letter).toBe(letter);
    expect(cell.status).toBe(cellStatus);
  }

  expectCell(0, 0, null, "", "default");
  expectCell(1, 0, "A", "", "default");
  expectCell(2, 0, "B", "", "default");
  expectCell(3, 0, "C", "", "default");
  expectCell(4, 0, null, "", "default");
  expectCell(0, 1, "D", "", "default");
  expectCell(1, 1, "E", "", "default");
  expectCell(2, 1, "F", "", "default");
  expectCell(3, 1, "G", "", "default");
  expectCell(4, 1, "H", "", "default");
  expectCell(0, 2, "I", "", "default");
  expectCell(1, 2, "J", "", "default");
  expectCell(2, 2, "K", "", "default");
  expectCell(3, 2, "L", "", "default");
  expectCell(4, 2, "M", "", "default");
  expectCell(0, 3, "N", "", "default");
  expectCell(1, 3, "O", "", "default");
  expectCell(2, 3, "P", "", "default");
  expectCell(3, 3, "Q", "", "default");
  expectCell(4, 3, "R", "", "default");
  expectCell(0, 4, null, "", "default");
  expectCell(1, 4, "S", "", "default");
  expectCell(2, 4, "T", "", "default");
  expectCell(3, 4, "U", "", "default");
  expectCell(4, 4, null, "", "default");
});

test("Board.fromPuzzle loads puzzle with correct words", () => {
  const { board } = makeBoardFromPuzzle();

  expect(board.words.length).toBe(10);

  expect(new Set(board.words.map((word) => word.id)).size).toBe(
    board.words.length
  );

  function expectWord(
    index: number,
    startX: number,
    startY: number,
    direction: Direction,
    label: string,
    letters: string
  ) {
    const word = board.words[index];
    expect(word).toMatchObject({
      startCell: { x: startX, y: startY },
      direction,
      label,
      letters: letters.split("").map((letter) => ({ letter, type: "known" })),
    });
  }

  expectWord(0, 1, 0, "across", "1", "ABC");
  expectWord(1, 0, 1, "across", "4", "DEFGH");
  expectWord(2, 0, 2, "across", "6", "IJKLM");
  expectWord(3, 0, 3, "across", "7", "NOPQR");
  expectWord(4, 1, 4, "across", "8", "STU");
  expectWord(5, 1, 0, "down", "1", "AEJOS");
  expectWord(6, 2, 0, "down", "2", "BFKPT");
  expectWord(7, 3, 0, "down", "3", "CGLQU");
  expectWord(8, 0, 1, "down", "4", "DIN");
  expectWord(9, 4, 1, "down", "5", "HMR");
});

test("Board.fromBoardState loads puzzle", () => {
  const boardState: BoardState = {
    id: crypto.randomUUID(),
    cellStates: [
      [
        { letter: "", status: "default" },
        { letter: "A", status: "knownCorrect" },
        { letter: "X", status: "knownIncorrect" },
        { letter: "C", status: "default" },
        { letter: "", status: "default" },
      ],
      [
        { letter: "D", status: "default" },
        { letter: "E", status: "default" },
        { letter: "F", status: "default" },
        { letter: "G", status: "default" },
        { letter: "H", status: "default" },
      ],
      [
        { letter: "I", status: "default" },
        { letter: "", status: "default" },
        { letter: "K", status: "default" },
        { letter: "", status: "default" },
        { letter: "M", status: "default" },
      ],
      [
        { letter: "N", status: "default" },
        { letter: "O", status: "default" },
        { letter: "P", status: "default" },
        { letter: "Q", status: "default" },
        { letter: "R", status: "default" },
      ],
      [
        { letter: "", status: "default" },
        { letter: "S", status: "default" },
        { letter: "T", status: "default" },
        { letter: "U", status: "default" },
        { letter: "", status: "default" },
      ],
    ],
    words: [
      {
        startCell: { x: 1, y: 0 } as Position,
        label: "1",
        direction: "across",
        letters: [
          { type: "known", letter: "A" },
          { type: "known", letter: "B" },
          { type: "known", letter: "C" },
        ],
        clueText: "1A",
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        label: "4",
        direction: "across",
        letters: [
          { type: "known", letter: "D" },
          { type: "known", letter: "E" },
          { type: "known", letter: "F" },
          { type: "known", letter: "G" },
          { type: "known", letter: "H" },
        ],
        clueText: "4A",
      },
      {
        startCell: { x: 0, y: 2 } as Position,
        label: "6",
        direction: "across",
        letters: [
          { type: "known", letter: "I" },
          { type: "known", letter: "J" },
          { type: "known", letter: "K" },
          { type: "known", letter: "L" },
          { type: "known", letter: "M" },
        ],
        clueText: "6A",
      },
      {
        startCell: { x: 0, y: 3 } as Position,
        label: "7",
        direction: "across",
        letters: [
          { type: "known", letter: "N" },
          { type: "known", letter: "O" },
          { type: "known", letter: "P" },
          { type: "known", letter: "Q" },
          { type: "known", letter: "R" },
        ],
        clueText: "7A",
      },
      {
        startCell: { x: 0, y: 4 } as Position,
        label: "8",
        direction: "across",
        letters: [
          { type: "known", letter: "S" },
          { type: "known", letter: "T" },
          { type: "known", letter: "U" },
        ],
        clueText: "8A",
      },
      {
        startCell: { x: 1, y: 0 } as Position,
        label: "1",
        direction: "down",
        letters: [
          { type: "known", letter: "A" },
          { type: "known", letter: "E" },
          { type: "known", letter: "J" },
          { type: "known", letter: "O" },
          { type: "known", letter: "S" },
        ],
        clueText: "1D",
      },
      {
        startCell: { x: 2, y: 0 } as Position,
        label: "2",
        direction: "down",
        letters: [
          { type: "known", letter: "B" },
          { type: "known", letter: "F" },
          { type: "known", letter: "K" },
          { type: "known", letter: "P" },
          { type: "known", letter: "T" },
        ],
        clueText: "2D",
      },
      {
        startCell: { x: 3, y: 0 } as Position,
        label: "3",
        direction: "down",
        letters: [
          { type: "known", letter: "C" },
          { type: "known", letter: "G" },
          { type: "known", letter: "L" },
          { type: "known", letter: "Q" },
          { type: "known", letter: "U" },
        ],
        clueText: "3D",
      },
      {
        startCell: { x: 0, y: 1 } as Position,
        label: "4",
        direction: "down",
        letters: [
          { type: "known", letter: "D" },
          { type: "known", letter: "I" },
          { type: "known", letter: "N" },
        ],
        clueText: "4D",
      },
      {
        startCell: { x: 4, y: 1 } as Position,
        label: "5",
        direction: "down",
        letters: [
          { type: "known", letter: "H" },
          { type: "known", letter: "M" },
          { type: "known", letter: "R" },
        ],
        clueText: "5D",
      },
    ],
    selection: {
      cell: { x: 3, y: 3 } as Position,
      direction: "down",
    },
  };

  Board.fromBoardState(boardState);
});

test("initial selectedWord is first word", () => {
  const { board } = makeBoardFromPuzzle();
  expect(board.selectedWord).toBe(board.words[0]);
});

test("initial selection is first cell of first word", () => {
  const { board } = makeBoardFromPuzzle();
  expect(board.selection?.cell).toBe(board.words[0].startCell);
  expect(board.selection?.direction).toBe(board.words[0].direction);
});

test("changeSelection can select nothing", () => {
  const { board } = makeBoardFromPuzzle();
  const succeeded = board.changeSelection(null, { announce: false });
  expect(board.selection).toBeNull();
  expect(succeeded).toBeTrue();
});

test("changeSelection keeps selection and fails if new selection is out of bounds", () => {
  const { board } = makeBoardFromPuzzle();

  const initialSelection = { ...board.selection };
  expect(initialSelection).not.toBeNull();

  expect(() =>
    board.changeSelection(
      { cell: { x: 999, y: 999 } as Position, direction: "across" },
      { announce: false }
    )
  ).toThrowError();

  expect(board.selection).toMatchObject(initialSelection);
});

test("changeSelection keeps selection and fails if new selection is a void cell", () => {
  const { board } = makeBoardFromPuzzle();

  const initialSelection = { ...board.selection };
  expect(initialSelection).not.toBeNull();

  const voidCell = board.cellAt(0, 0);
  expect(voidCell.isVoid).toBeTrue();

  expect(() =>
    board.changeSelection(
      { cell: voidCell.position, direction: "across" },
      { announce: false }
    )
  ).toThrowError();

  expect(board.selection).toMatchObject(initialSelection);
});

test("changeSelection keeps selection and returns false if new selection is out of bounds and throwOnFailure is false", () => {
  const { board } = makeBoardFromPuzzle();

  const initialSelection = { ...board.selection };
  expect(initialSelection).not.toBeNull();

  const succeeded = board.changeSelection(
    { cell: { x: 999, y: 999 } as Position, direction: "across" },
    { announce: false, throwOnFailure: false }
  );

  expect(board.selection).toMatchObject(initialSelection);
  expect(succeeded).toBeFalse();
});

test("changeSelection keeps selection and returns false if new selection is a void cell and throwOnFailure is false", () => {
  const { board } = makeBoardFromPuzzle();

  const initialSelection = { ...board.selection };
  expect(initialSelection).not.toBeNull();

  const voidCell = board.cellAt(0, 0);
  expect(voidCell.isVoid).toBeTrue();

  const succeeded = board.changeSelection(
    { cell: voidCell.position, direction: "across" },
    { announce: false, throwOnFailure: false }
  );

  expect(board.selection).toMatchObject(initialSelection);
  expect(succeeded).toBeFalse();
});

test("changeSelection can keep direction and change only cell", () => {
  const { board } = makeBoardFromPuzzle();

  board.changeSelection(
    {
      cell: { x: 1, y: 1 } as Position,
      direction: "down",
    },
    { announce: false }
  );

  const succeeded = board.changeSelection(
    { cell: { x: 2, y: 1 } as Position },
    { announce: false }
  );

  expect(succeeded).toBeTrue();
  expect(board.selection).toMatchObject({
    cell: { x: 2, y: 1 } as Position,
    direction: "down",
  });
});

test("changeSelection can keep cell and change only direction", () => {
  const { board } = makeBoardFromPuzzle();

  board.changeSelection(
    {
      cell: { x: 1, y: 1 } as Position,
      direction: "across",
    },
    { announce: false }
  );

  const succeeded = board.changeSelection(
    { direction: "down" },
    { announce: false }
  );

  expect(succeeded).toBeTrue();
  expect(board.selection).toMatchObject({
    cell: { x: 1, y: 1 } as Position,
    direction: "down",
  });
});

test("null selection gives null selectedWord", () => {
  const { board } = makeBoardFromPuzzle();
  board.changeSelection(null, { announce: false });
  expect(board.selectedWord).toBeNull();
});

test("across selection gives correct selection and selectedWord", () => {
  const { board } = makeBoardFromPuzzle();
  const succeeded = board.changeSelection(
    {
      cell: { x: 1, y: 1 } as Position,
      direction: "across",
    },
    { announce: false }
  );
  expect(succeeded).toBeTrue();
  expect(board.selection).toMatchObject({
    cell: { x: 1, y: 1 } as Position,
    direction: "across",
  });
  expect(board.selectedWord).toBe(board.words[1]);
});

test("down selection gives correct selection selectedWord", () => {
  const { board } = makeBoardFromPuzzle();
  const succeeded = board.changeSelection(
    {
      cell: { x: 1, y: 1 } as Position,
      direction: "down",
    },
    { announce: false }
  );
  expect(succeeded).toBeTrue();
  expect(board.selection).toMatchObject({
    cell: { x: 1, y: 1 } as Position,
    direction: "down",
  });
  expect(board.selectedWord).toBe(board.words[5]);
});

test("announce: true announces an across selection change", () => {
  const { board, endpoint } = makeBoardFromPuzzle();
  board.changeSelection(
    {
      cell: { x: 1, y: 1 } as Position,
      direction: "across",
    },
    { announce: true }
  );
  expect(endpoint.announcements).toMatchObject([{ data: {}, options: {} }]);
});

test("announce: { exceptPlayerId } announces an across selection change", () => {
  const { board, endpoint } = makeBoardFromPuzzle();
  board.changeSelection(
    {
      cell: { x: 1, y: 1 } as Position,
      direction: "across",
    },
    { announce: { exceptPlayerId: "jeff" } }
  );
  expect(endpoint.announcements).toMatchObject([
    { data: {}, options: { exceptPlayerId: "jeff" } },
  ]);
});

test("selectionState for across selection", () => {
  const { board } = makeBoardFromPuzzle();
  board.changeSelection(
    { cell: { x: 1, y: 1 } as Position, direction: "across" },
    { announce: false }
  );
  expect(board.selectionState()).toMatchObject({
    cell: { x: 1, y: 1 },
    direction: "across",
  });
});

test("selectionState for down selection", () => {
  const { board } = makeBoardFromPuzzle();
  board.changeSelection(
    { cell: { x: 1, y: 1 } as Position, direction: "down" },
    { announce: false }
  );
  expect(board.selectionState()).toMatchObject({
    cell: { x: 1, y: 1 },
    direction: "down",
  });
});

test("selectionState for null selection", () => {
  const { board } = makeBoardFromPuzzle();
  board.changeSelection(null, { announce: false });
  expect(board.selectionState()).toBeNull();
});

test("advanceSelectedWord(1) advances to the first cell of next empty word", () => {
  const { board } = makeBoardFromPuzzle();
  board.changeSelection(
    { cell: { x: 2, y: 0 } as Position, direction: "across" },
    { announce: false }
  );
  board.advanceSelectedWord(1);
  expect(board.selection).toMatchObject({
    cell: { x: 0, y: 1 } as Position,
    direction: "across",
  });
});

test("advanceSelectedWord(1) advances from last across word to first down word", () => {
  const { board } = makeBoardFromPuzzle();
  board.changeSelection(
    { cell: { x: 2, y: 4 } as Position, direction: "across" },
    { announce: false }
  );
  board.advanceSelectedWord(1);
  expect(board.selection).toMatchObject({
    cell: { x: 1, y: 0 } as Position,
    direction: "down",
  });
});

test("advanceSelectedWord(-1) advances to the first cell of previous empty word", () => {
  const { board } = makeBoardFromPuzzle();
  board.changeSelection(
    { cell: { x: 1, y: 1 } as Position, direction: "across" },
    { announce: false }
  );
  board.advanceSelectedWord(-1);
  expect(board.selection).toMatchObject({
    cell: { x: 1, y: 0 } as Position,
    direction: "across",
  });
});
