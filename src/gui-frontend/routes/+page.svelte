<script lang="ts">
  import { status } from '$data';

  function openProject() {
    
  }
</script>

<h1>Welcome to Creative Toolkit v{$status.version}</h1>
<p>
  <em>
    now featuring the <u>two step process</u>!
  </em>
</p>

<h2>press the button to open up a project file</h2>
<button on:click={openProject}>open project</button>

<h2>stats</h2>
<pre>
<code>{JSON.stringify($status, null, 2)}</code>
</pre>
