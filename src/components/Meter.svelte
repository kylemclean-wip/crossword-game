<script lang="ts">
  interface Props {
    value: number;
    maxValue: number;
  }

  const { value, maxValue }: Props = $props();

  const t = $derived(value / maxValue);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1 1"
  width="100%"
  height="20px"
  preserveAspectRatio="none"
>
  <rect x="0" y="0" width="1" height="1" fill="black" />
  <rect x="0" y="0" width={t} height="1" fill="green" />
</svg>

<style>
</style>
