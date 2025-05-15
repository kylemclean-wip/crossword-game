<script lang="ts">
  import type { Board } from "../lib/board.svelte";

  interface Props {
    board: Board;
  }

  const { board = $bindable() }: Props = $props();

  const wordsByDirection = $derived(
    Object.groupBy(board.words, (word) => word.direction)
  );
</script>

<div class="clues">
  {#each Object.entries(wordsByDirection) as [direction, directionWords]}
    <div class="direction-clues">
      <div class="direction-name">
        {direction === "across" ? "Across" : "Down"}
      </div>
      <div class="divider"></div>
      <ol class="clue-list">
        {#each directionWords as word}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li
            class={{
              clue: true,
              selected: board.selectedWord?.id === word.id,
              solved: word.isKnownSolved(),
            }}
            onclick={() => (board.selectedWord = word)}
          >
            <div class="label">
              {word.label}
            </div>
            <div class="text">
              {word.clueText}
            </div>
          </li>
        {/each}
      </ol>
    </div>
  {/each}
</div>

<style>
  .clues {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    flex-wrap: wrap;
    background-color: var(--control-bg-color);
    color: var(--control-fg-color);
    border: var(--control-border);
    box-shadow: var(--control-shadow);
    padding: var(--control-padding);
    font-size: 1rem;
  }

  .direction-clues {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0.25rem;
  }

  .direction-name {
    text-transform: uppercase;
    font-weight: bold;
  }

  .divider {
    height: 1px;
    background-color: #777;
  }

  .clue-list {
    display: flex;
    flex-direction: column;
    list-style: none;
    min-width: 150px;
  }

  .clue {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    padding-block: 0.25rem;
    cursor: pointer;
    user-select: none;

    .label {
      font-weight: bold;
      min-width: 1.5rem;
      text-align: right;
    }

    .text {
      flex: 1;
    }

    &.solved :is(.label, .text) {
      opacity: 0.5;
    }

    &.selected {
      background-color: rgb(173, 222, 255);
    }
  }
</style>
