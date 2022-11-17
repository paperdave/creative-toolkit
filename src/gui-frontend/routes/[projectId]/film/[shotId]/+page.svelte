<script lang='ts'>
  import { activeFilmShot } from '$data';
</script>

<h1>{$activeFilmShot.id}</h1>

<pre><code>{JSON.stringify($activeFilmShot, null, 2)}</code></pre>
