<script lang="ts">
  import { Board } from "../lib/board.svelte";
  import BoardView from "./BoardView.svelte";

  const board = Board.createEmpty({ width: 5, height: 5 });
  board.editing = true;
</script>

<div class="game">
  <div class="side other-stuff"></div>
  <div class="player-area">
    <div class="this-board-container">
      <BoardView {board} controllable />
    </div>
  </div>
  <div class="side controls-container"></div>
</div>

<style>
  .game {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 10px;
  }

  .other-stuff {
    display: flex;
    flex-direction: column;
  }

  .player-area {
    flex: 1;
    display: flex;
    min-width: 300px;
    max-width: max(600px, 25%);
    flex-direction: column;
  }

  .this-board-container {
    flex: 1;
  }

  .side {
    width: 430px;
  }
</style>
