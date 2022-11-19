<script lang='ts'>
  import { goto } from '$app/navigation';
  import { activeFilmShot, activeProject } from '$data';
  import { Button } from '@paperdave/ui';
</script>

<h1>{$activeFilmShot.id}</h1>

<Button on:click={() => goto(`/${$activeProject.id}/film/capture?targetId=${$activeFilmShot.id}`)}>
  capture on this take!
</Button>

<pre><code>{JSON.stringify($activeFilmShot, null, 2)}</code></pre>
