<script lang='ts'>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { fade, scale } from "svelte/transition";

  export let name: string;
  export let icon: string;
  export let href: string;
  
  $: url = `/${$page.params.projectId}${href}`;
  $: active = href === '/' ? $page.url.pathname === url : $page.url.pathname.startsWith(url); 
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<ct-tab
  class:active
  on:click={() => {
    if (!active) {
      goto(url);
    }
  }}
>
  hi
  {#if active}
    <span transition:scale={{ duration: 200 }}>{name}</span>
    <svg class='corner l' width="8" height="8"><path d="M0 8L8 8L8 0C8 4.41827 4.41833 8 0 8Z"/></svg>
    <svg class='corner r' width="8" height="8"><path d="M8 8L0 8L-6.99382e-07 0C-3.13124e-07 4.41827 3.58167 8 8 8Z"/></svg>
  {/if}
</ct-tab>
  
<style lang='scss'>
  ct-tab { 
    display: flex;
    padding: 0 8px;
    align-items: center;
    height: 32px;
    align-self: flex-end;
    position: relative;
  }
  .active {
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px 8px 0 0;
  }
  :not(.active) .corner {
    display: none;
  }
  .corner {
    position: absolute;
    width: 8px;
    height: 8px;
    fill: rgba(0, 0, 0, 0.5);

    &.l {
      bottom: 0;
      right: 100%;
    }
    &.r {
      bottom: 0;
      left: 100%;
    }
  }
</style>
