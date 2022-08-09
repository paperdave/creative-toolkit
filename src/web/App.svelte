<script>
  import FilmApp from "./FilmApp.svelte";

  const project = fetch('/api/project.json').then(r => r.json());
  const audioBuffer = fetch('/api/audio.wav').then(r => r.arrayBuffer());

  const resClickWeak = fetch('/click-weak.wav').then(r => r.arrayBuffer());
  const resClickStrong = fetch('/click-strong.wav').then(r => r.arrayBuffer());
</script>

{#await Promise.all([project, audioBuffer, resClickWeak, resClickStrong]) then [project, audioBuffer, resClickWeak, resClickStrong]}
  <FilmApp {project} audioData={audioBuffer} {resClickWeak} {resClickStrong} />
{/await}