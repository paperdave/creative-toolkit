<script lang='ts'>
  import { activeProject } from "$data";
  import Tab from "./Tab.svelte";
</script>

<ct-titlebar>
  {#if $activeProject}
    <span class='project-name'>{$activeProject.name}</span>

    <div class="tabs">
      <Tab icon='' name='Overview' href='/' />
      <Tab icon='' name='Sequencer' href='/sequencer' />
      <Tab icon='' name='Film' href='/film' />
      <Tab icon='' name='Materials' href='/materials' />
      <div style='flex:1'></div>
      <Tab icon='' name='Settings' href='/settings' />
    </div>
  {:else}
    <span>No Project</span>
  {/if}
</ct-titlebar>

<style lang='scss'>
  ct-titlebar {
    height: 36px;
    display: flex;
    padding: 0 8px;
  }
  .project-name {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 8px;
    font-weight: 600;
  }
  .tabs {
    display: flex;
    flex: 1;
    margin: 0 24px;
  }
</style>
