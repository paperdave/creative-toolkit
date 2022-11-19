<script lang='ts'>
  import { page } from '$app/stores';
  import { getFilmAppLogic } from './film-app-logic';
  import './film-app-logic.ts';
  import FilmApp from './FilmApp.svelte';

  const film = getFilmAppLogic();
</script>

{#await film}
  <p>Loading...</p>
{:then film}
  {@const _ = film.targetId = $page.url.searchParams.get('targetId') ?? film.targetId}
  <FilmApp film={film} />
{/await}
