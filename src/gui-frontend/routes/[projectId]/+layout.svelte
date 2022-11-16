<script lang='ts'>
  import { goto } from '$app/navigation';
  import { activeProject } from '$data';
  import { Button } from '@paperdave/ui';
</script>

<layout-button-row>
  <Button on:click={() => goto(`/${$activeProject.id}`)}>Info</Button>
  <Button on:click={() => goto(`/${$activeProject.id}/sequencer`)}>Sequencer</Button>
  <Button on:click={() => goto(`/${$activeProject.id}/film`)}>Film</Button>
</layout-button-row>

<slot />

<style lang='scss'>

</style>
