<script lang="ts">
  import { activeProject as p, guiActionArrangeClips } from '$data';
  import { Button } from '@paperdave/ui';
  import path from 'path';

  function arrange() {
    guiActionArrangeClips($p.id);
  }
</script>

<h2>project information</h2>
<ul>
  <li><strong>id</strong>: {$p.id}</li>
  <li><strong>name</strong>: {$p.name}</li>
  <li><strong>arranged?</strong>: {$p.isArranged ? 'Yes' : 'No'}</li>
  {#if !$p.isArranged}
    <Button on:click={arrange}>Arrange</Button>
  {/if}
  <li><strong>Audio?</strong>: {$p.hasAudio ? 'Yes' : 'No'}</li>
</ul>
<h2>clip overview</h2>
<p>
  <strong>number of clips</strong>: {$p.clips.length}
</p>

<h2>path map</h2>
<table>
  <tbody>
    <tr>
      <td><strong>project root:</strong></td>
      <td>{$p.root}</td>
    </tr>
    {#each Object.entries($p.paths) as [key, value]}
      {@const dir = (path.dirname(value) + '/')
        .replace(/\/\//g, '/')
        .replace($p.root + '/', './')}

      <tr>
        <td style='padding-right: 20px;'><strong>{key}:</strong></td>
        <td>{dir}<strong>{path.basename(value)}</strong></td>
      </tr>
    {/each}
  </tbody>
</table>
