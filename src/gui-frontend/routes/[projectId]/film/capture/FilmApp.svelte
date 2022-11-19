<script lang='ts'>
  import { Button, TextBox } from '@paperdave/ui';
  import { onDestroy, onMount } from 'svelte';
  import type { FilmAppLogic } from './film-app-logic';
  import { getReadableStatus } from './film-utils';
  import FilmAppFrameRange from './FilmAppFrameRange.svelte';

  export let film: FilmAppLogic;
  $: status = film.$status;
  $: statusCountdown = film.$statusCountdown;
  $: mediaDevices = film.$mediaDevices;
  $: streamSettings = film.$streamSettings;
  $: targetRange = film.$targetRange;
  $: targetId = film.$targetId;

  let video: HTMLVideoElement;
  onMount(() => film.bindVideo(video));
  onDestroy(() => film.unbindVideo(video));
</script>

<layout-flex gap class="root">
  <h1>ct film 2: electric boogaloo</h1>
  <layout-flex row style='align-items:center;'>
    <div class="status status-{$status}"></div>
    <span>
      {getReadableStatus($status, $statusCountdown)}
    </span>
  </layout-flex>
  <layout-flex row>
    <TextBox 
      bind:value={$targetId}
      disabled={$status !== 'idle'}
      label='Shot ID'
    />
  </layout-flex>
  <FilmAppFrameRange {film} />
  <p>
    {$targetRange.start} - {$targetRange.end}
  </p>
  <layout-button-row>
    <Button
      variant='primary'
      disabled={
        $status !== 'idle'
        && $status !== 'recording'
        && $status !== 'recording_prep'
      }
      on:click={() => film.startRecording()}
    >Start</Button>
    <Button
      disabled={$status !== 'idle' && $status !== 'previewing'}
      on:click={() => film.startPreview()}
    >Preview Audio</Button>
    <Button disabled>Mystery Button</Button>
  </layout-button-row>
  <layout-flex>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video bind:this={video}></video>
    {#if $streamSettings}
      <div>
        <strong>res</strong>: {$streamSettings.width}x{$streamSettings.height},
        <strong>fps</strong>: {$streamSettings.frameRate}
      </div>
    {/if}
  </layout-flex>
</layout-flex>

<style lang="scss">
  .root {
    margin: 1rem;
  }
  video {
    width: 400px;
  }
  .status {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    margin-right: 0.5rem;
    border: 2px solid rgb(var(--on-bg));

    &.status-idle {
      background-color: rgba(var(--on-bg), 0.3);
    }
    &.status-recording {
      border: 2px solid black;
      background-color: #f00;
    }
    &.status-previewing {
      border: 2px solid black;
      background-color: rgb(114, 255, 114);
    }
    &.status-recording_prep {
      border: 2px solid black;
      background-color: #ff0;
    }
    &.status-recording_post {
      background-color: #660;
      border: 2px solid black;
    }
  }
</style>
