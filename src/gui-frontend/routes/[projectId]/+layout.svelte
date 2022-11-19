<script lang='ts'>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { activeProject } from '$data';
  import { Button } from '@paperdave/ui';

  const tabs = [
    { name: 'Info', url: '/' },
    { name: 'Config', url: '/config', disabled: true },
    { name: 'Sequence', url: '/sequence', disabled: true },
    { name: 'Film', url: '/film' },
    // maybe this one idk
    { name: 'Materials', url: '/materials', disabled: true },
];
</script>

<main>
  <layout-button-row>
    {#each tabs as tab}
      {@const url = `/${$activeProject.id}${tab.url}`}
      <Button
        variant={(tab.url === '/' ? url === $page.url.pathname : $page.url.pathname.startsWith(url)) ? 'primary' : 'normal'}
        disabled={tab.disabled}
        on:click={() => goto(`/${$activeProject.id}${tab.url}`)}
      >{tab.name}</Button>
    {/each}
  </layout-button-row>
  
  <slot />
</main>

<style lang='scss'>

</style>
