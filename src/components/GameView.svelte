<script lang="ts">
  import BoardView from "./BoardView.svelte";
  import CluesView from "./CluesView.svelte";
  import { Client } from "../lib/client.svelte.ts";
  import Meter from "./Meter.svelte";
  import IndeterminateBoard from "./IndeterminateBoard.svelte";

  interface Props {
    client: Client;
  }

  const { client }: Props = $props();
  const game = $derived(client.game!);
  const player = $derived(client.thisPlayer);

  function onResetClicked() {
    if (!player?.board) return;
    player.board.reset();
  }
</script>

<div class="game">
  <div class="side other-stuff">
    {#if game.status.type === "playing"}
      <button onclick={() => client.requestNewBoard()}>New Board</button>
      <!-- <button onclick={() => player?.board?.selection?.cell?.check()}
        >Check Cell</button
      >
      <button onclick={() => player?.board?.checkPuzzle()}>Check Puzzle</button> -->
      <button onclick={onResetClicked}>Reset</button>
    {/if}

    <div class="other-boards">
      {#each client.otherPlayers as otherPlayer}
        <div class="other-board-container">
          {#if otherPlayer.board}
            <BoardView bind:board={otherPlayer.board} />
          {:else}
            <IndeterminateBoard width={5} height={5} />
          {/if}
        </div>
      {/each}
    </div>
  </div>
  <div class="player-area">
    <div class="this-board-container">
      {#if game.status.type === "lobby"}
        <IndeterminateBoard width={5} height={5} />
      {:else if game.status.type === "playing" && player?.board}
        <BoardView bind:board={player.board} controllable />
      {/if}
    </div>
    <div class="health-meter">
      <!-- <Meter value={player?.health ?? 1} maxValue={player?.maxHealth ?? 1} /> -->
    </div>

    {#if game.status.type === "lobby" && client.thisPlayer}
      <button onclick={() => client.toggleReady()}
        >{client.thisPlayer.ready ? "Unready" : "Ready"}</button
      >
    {/if}
  </div>
  <div class="side clues-container">
    {#if game.status.type === "playing" && player?.board}
      <CluesView bind:board={player.board} />
    {/if}
  </div>
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
    gap: 10px;
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

  .other-boards {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .other-board-container {
    max-width: 100px;
    max-height: 100px;
    width: 100%;
    height: 100%;
    filter: brightness(0.5);
  }
</style>
