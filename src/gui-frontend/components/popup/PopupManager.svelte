<script lang="ts">
  import { popups } from './popup';
  import PopupDefaultContainer from './PopupDefaultContainer.svelte';
</script>

{#each $popups as prompt, i (prompt.id)}
  <svelte:component 
    this={prompt.containerComponent ?? PopupDefaultContainer}
    title={prompt.title}
    z={10000 + i}
    {...prompt.props}
    on:close={prompt.onClose}
  >
    <svelte:component
      this={prompt.contentComponent}
      title={prompt.title}
      {...prompt.props}
      on:close={prompt.onClose}
    />
  </svelte:component>
{/each}
