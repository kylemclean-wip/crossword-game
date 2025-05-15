<script lang="ts">
  import type { Board } from "../lib/board.svelte";
  import CellView from "./CellView.svelte";

  interface Props {
    board: Board;
    controllable?: boolean;
  }

  const { board = $bindable(), controllable = false }: Props = $props();

  const showSelectionCursor = $derived(controllable && board.editing);

  function onKeyDown(event: KeyboardEvent) {
    if (!controllable) return;

    const handled = board.handleKeyDown(event);

    if (!handled) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }
</script>

<div class="board">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 {board.width} {board.height}"
  >
    {#each Array.from({ length: board.width }) as _, x}
      {#each Array.from({ length: board.height }) as _, y}
        <CellView {board} {x} {y} {controllable} />
      {/each}
    {/each}

    {#if showSelectionCursor && board.selection}
      {@const strokeWidth = 0.03}
      <rect
        {...board.selection.direction === "across"
          ? {
              x: strokeWidth / 2,
              y: board.selection.cell.y + strokeWidth / 2,
              width: board.width - strokeWidth,
              height: 1 - strokeWidth,
            }
          : {
              x: board.selection.cell.x + strokeWidth / 2,
              y: strokeWidth / 2,
              width: 1 - strokeWidth,
              height: board.height - strokeWidth,
            }}
        fill="none"
        stroke="#33c"
        stroke-width={strokeWidth}
      />
    {/if}
  </svg>
</div>

<svelte:document onkeydown={onKeyDown} />

<style>
  .board {
    display: flex;
  }

  .board svg {
    font-size: 1px;
  }
</style>
