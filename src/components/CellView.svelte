<script lang="ts">
  import type { Board } from "../lib/board.svelte";
  import type { Cell } from "../lib/cell.svelte.ts";

  interface Props {
    board: Board;
    x: number;
    y: number;
    controllable?: boolean;
  }

  const { board, x, y, controllable = false }: Props = $props();

  const cell = $derived(board.cellAt(x, y));
  const isStartOfWord = $derived(
    (cell.words.across &&
      x === cell.words.across.startCell.x &&
      cell.words.across) ||
      (cell.words.down && y === cell.words.down.startCell.y && cell.words.down)
  );

  function onClickCell(cell: Cell) {
    if (!controllable) return;

    if (
      board.selection &&
      cell.x === board.selection.cell.x &&
      cell.y === board.selection.cell.y
    ) {
      board.changeSelection(
        {
          direction: board.selection.direction === "across" ? "down" : "across",
        },
        { announce: true }
      );
    } else {
      board.changeSelection({ cell: cell.position }, { announce: true });
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<g
  class={{
    cell: true,
    editing: board.editing,
    selected:
      board.selection &&
      board.selection.cell.x === x &&
      board.selection.cell.y === y,
    "word-selected":
      board.selectedWord &&
      board.selectedWord.id === cell.words[board.selectedWord.direction]?.id,
    void: cell.isVoid,
  }}
>
  <rect
    {x}
    {y}
    width="1"
    height="1"
    stroke-width="0.01"
    stroke="#444"
    fill="white"
    role="button"
    onclick={() => onClickCell(cell)}
  >
  </rect>
  {#if isStartOfWord}
    <text
      x={x + 0.03}
      y={y + 0.03}
      width="1"
      height="1"
      text-anchor="left"
      dominant-baseline="hanging"
      class="word-label"
    >
      {isStartOfWord.label}
    </text>
  {/if}
  <text
    x={x + 0.5}
    y={y + 0.5}
    width="1"
    height="1"
    text-anchor="middle"
    dominant-baseline="central"
    class={{
      letter: true,
      "known-correct": cell.status === "knownCorrect",
      "known-incorrect": cell.status === "knownIncorrect",
    }}
  >
    {cell.letter}
  </text>
</g>

<style>
  .cell {
    &.void.editing rect {
      fill: #999;
    }

    &.word-selected rect {
      fill: rgb(157, 216, 255);
    }

    &.selected.selected rect {
      fill: rgb(225, 243, 255);
    }

    &.void rect {
      fill: black;
    }

    text {
      pointer-events: none;
    }

    .letter {
      font-size: 0.75px;

      &.known-correct {
        fill: rgb(0, 112, 187);
      }

      &.known-incorrect {
        fill: red;
      }
    }

    .word-label {
      font-size: 0.35px;
    }
  }
</style>
