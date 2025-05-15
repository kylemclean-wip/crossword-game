<script lang="ts">
  import "@fontsource/atkinson-hyperlegible-next";
  import { Client } from "../lib/client.svelte";
  import GameView from "./GameView.svelte";

  const client = new Client("ws://localhost:2121/game");
</script>

{#if client.connection.status === "inGame"}
  <GameView {client} />
{:else if client.connection.status === "connecting" || client.connection.status === "connected"}
  <div>Connecting...</div>
{:else if client.connection.status === "disconnected"}
  <div>Disconnected</div>
  {#if client.connection.reason.error !== "USER_DISCONNECTED"}
    <code>{client.connection.reason.error}</code>
  {/if}
{/if}

<style>
  :global {
    @import "../styles/game.css";
  }
</style>
