<script lang='ts'>
  import { Button, TextBox } from '@paperdave/ui';
  import { get } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import type { FilmAppLogic } from './film-app-logic';
  import { getReadableStatus } from './film-utils';

  export let film: FilmAppLogic;
  $: status = film.$status;
  $: mediaDevices = film.$mediaDevices;
  $: streamSettings = film.$streamSettings;
  $: targetId = film.$targetId;
  $: targetRange = film.$targetRange;

  let video: HTMLVideoElement;
  onMount(() => film.bindVideo(video));
  onDestroy(() => film.unbindVideo(video));

  // this shouldn't be needed.
  let targetRangeStartStr = '';
  let targetRangeEndStr = '';
  onDestroy(film.$targetRange.subscribe(({start, end}) => {
    targetRangeStartStr = start.toString();
    targetRangeEndStr = end.toString();
  }));
</script>

<layout-flex gap class="root">
  <h1>ct film 2: electric boogaloo</h1>
  <layout-flex row style='align-items:center;'>
    <div class="status status-{$status}"></div>
    <span>
      {getReadableStatus($status)}
    </span>
  </layout-flex>
  <layout-flex row>
    <TextBox 
      bind:value={$targetId}
      disabled={$status !== 'idle'}
      label='Shot ID'
    />
  </layout-flex>
  <layout-flex row gap>
    <TextBox
      label='Start Frame'
      disabled={$status !== 'idle'}
      bind:value={targetRangeStartStr}
      on:blur={() => {
        const parsed = parseInt(targetRangeStartStr, 10);
        if (parsed) {
          targetRange.set({ start: parsed, end: $targetRange.end });
        }
      }}
    />
    <TextBox
      label='End Frame'
      disabled={$status !== 'idle'}
      bind:value={targetRangeEndStr}
      on:blur={() => {
        const parsed = parseInt(targetRangeEndStr, 10);
        if (parsed) {
          targetRange.set({ start: $targetRange.start, end: parsed });
        }
      }}
    />
  </layout-flex>
  <layout-button-row>
    <Button
      variant='primary'
      disabled={
        $status !== 'idle'
        && $status !== 'recording'
        && $status !== 'recording_prep'
      }
    >Start</Button>
    <Button
      on:click={() => film.startPreview()}
      disabled={$status !== 'idle' && $status !== 'previewing'}
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
    border: 2px solid black;

    &.status-idle {
      background-color: #777;
    }
    &.status-recording {
      background-color: #f00;
    }
    &.status-previewing {
      background-color: #0f0;
    }
    &.status-recording_prep {
      background-color: #ff0;
    }
    &.status-recording_post {
      background-color: #660;
    }
  }
</style>
