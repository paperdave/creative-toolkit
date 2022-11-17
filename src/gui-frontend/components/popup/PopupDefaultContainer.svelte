<script lang='ts'>
  import { createEventDispatcher } from "svelte";
  import { fade, scale } from "svelte/transition";

  export let z = 0;
  export let title: string | undefined = undefined;

  const dispatcher = createEventDispatcher();

  function submit(ev: SubmitEvent) {
    // @ts-expect-error formdata.entries
    const entries = [...new FormData(ev.target as HTMLFormElement).entries()];
    
    if (entries.length === 1 && entries[0][0] === "value") {
      dispatcher("close", entries[0][1]);
    } else {
      dispatcher("close", Object.fromEntries(entries));
    }
  }
</script>

<div
  class='backdrop'
  style:z-index={z}
  transition:fade={{ duration: 200 }}
>
  <form 
    class="container"
    on:submit|preventDefault={submit}
    transition:scale={{ duration: 150, start: 0.85, opacity: 0 }}
  >
    {#if title}<h1>{title}</h1>{/if}
    <slot />
  </form>
</div>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container {
    background-color: rgb(var(--bg));
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.4);
  }

  h1 {
    margin: 0 0 0.8rem 0;
    font-size: 1.5rem;
  }
</style>
