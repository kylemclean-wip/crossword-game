<script lang="ts">
  interface Props {
    width: number;
    height: number;
  }

  const { width, height }: Props = $props();
</script>

<div class="board">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
    {#each Array.from({ length: width }) as _, x}
      {#each Array.from({ length: height }) as _, y}
        <g
          class="cell"
          style:--pulse-duration="{4 + 1.5 * Math.random()}s"
          style:--pulse-delay="{Math.random() * 3}s"
        >
          <rect {x} {y} width="1" height="1" stroke-width="0.01" stroke="#444">
          </rect>
        </g>
      {/each}
    {/each}
  </svg>
</div>

<style>
  .board {
    display: flex;
  }

  .board svg {
    font-size: 1px;
  }

  .cell {
    fill: #bbb;
    animation-name: pulse;
    animation-iteration-count: infinite;
    animation-duration: var(--pulse-duration, 1s);
    animation-delay: var(--pulse-delay, 0s);
  }

  @keyframes pulse {
    0% {
      fill: #bbb;
    }

    25% {
      fill: #555;
    }

    50% {
      fill: #ccc;
    }

    75% {
      fill: #333;
    }

    100% {
      fill: #bbb;
    }
  }
</style>
