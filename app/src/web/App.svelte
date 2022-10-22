<script>
  import FilmApp from "./FilmApp.svelte";

  let current = null;

  const project = fetch('/api/project.json').then(r => r.json());
  const audioBuffer = fetch('/api/audio.wav').then(r => r.arrayBuffer());
  const resClickWeak = fetch('/click-weak.wav').then(r => r.arrayBuffer());
  const resClickStrong = fetch('/click-strong.wav').then(r => r.arrayBuffer());
</script>

<button on:click={() => current = null}>&nbsp;</button>
<button on:click={() => current = 'film'}>Film</button>
<button disabled on:click={() => current = 'review'}>Review</button>
<button disabled on:click={() => current = 'comps'}>Comps</button>
<button disabled on:click={() => current = 'dream'}>Dream</button>
<button disabled on:click={() => current = 'dream'}>Lyrics</button>

{#if current === 'film'}
  {#await Promise.all([project, audioBuffer, resClickWeak, resClickStrong]) then [project, audioBuffer, resClickWeak, resClickStrong]}
    <FilmApp {project} audioData={audioBuffer} {resClickWeak} {resClickStrong} />
  {/await}
{/if}