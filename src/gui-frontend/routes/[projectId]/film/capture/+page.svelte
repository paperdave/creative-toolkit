<script lang='ts'>
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte/types/runtime/internal/lifecycle';
  import { FilmAppLogic, getFilmAppLogic } from './film-app-logic';
  import './film-app-logic.ts';
  import FilmApp from './FilmApp.svelte';

  const film = getFilmAppLogic();
  let instance: FilmAppLogic;

  onDestroy(() => {
    instance?.close();
  });
</script>

{#await film}
  <p>Loading...</p>
{:then film}
  {@const _1 = instance = film}
  {@const _2 = film.targetId = $page.url.searchParams.get('targetId') ?? film.targetId}
  <FilmApp film={film} />
{/await}
