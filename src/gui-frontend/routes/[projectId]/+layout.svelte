<script lang='ts'>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { activeProject } from '$data';
  import { Button } from '@paperdave/ui';
</script>

<main>
  <layout-button-row>
    <Button on:click={() => goto(`/${$activeProject.id}`)}>Info</Button>
    <Button on:click={() => goto(`/${$activeProject.id}/sequencer`)}>Sequencer</Button>
    <Button on:click={() => goto(`/${$activeProject.id}/film`)}>Film</Button>

    <p>
      URL: {$page.url.pathname}
    </p>
  </layout-button-row>
  
  <slot />
</main>

<style lang='scss'>

</style>
