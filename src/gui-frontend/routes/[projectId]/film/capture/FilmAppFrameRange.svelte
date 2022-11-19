<script lang='ts'>
  import type { IRange } from "$/util";
  import { Button, TextBox } from "@paperdave/ui";
  import { capitalize } from "@paperdave/utils";
  import { onDestroy } from "svelte";
  import type { FilmAppLogic } from "./film-app-logic";
  import { roundSecondToFrame } from "./film-utils";

  export let film: FilmAppLogic;
  $: status = film.$status;
  $: targetRangeLocked = film.$targetRangeLocked;

  let type: 'frame' | 'second' | 'beat' = 'beat';

  function formatTimecode(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const secs = Math.floor(seconds % 60);
    const remainder = seconds % 1;
    return `${hours ? hours + ':' : ''}${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}${remainder ? '.' + remainder.toFixed(2).slice(2) : ''}`;
  }
  
  function parseTimecode(timecode: string) {
    const parts = timecode.split(':');
    const seconds = parts.pop();
    const minutes = parts.pop();
    const hours = parts.pop();
    return (hours ? parseInt(hours) * 3600 : 0) + (minutes ? parseInt(minutes) * 60 : 0) + (seconds ? parseFloat(seconds) : 0);
  }

  const converters = {
    frame: {
      stringify: (frames: number) => frames.toString(),
      parse: (input: string) => parseInt(input, 10),
    },
    second: {
      stringify: (frames: number) => formatTimecode(frames / film.project.fps),
      parse: (input: string) => Math.round(parseTimecode(input) * film.project.fps),
    },
    beat: {
      stringify: (frames: number) => String(Math.round((frames * (film.project.audioTiming.bpm / 60) / film.project.fps) * 10) / 10),
      parse: (input: string) => Math.round(parseFloat(input) * film.project.fps * 60 / film.project.audioTiming.bpm),
    },
  };

  let start = '';
  let end = '';

  function resetTextboxes(range: IRange = film.targetRange) {
    start = converters[type].stringify(range.start);
    end = converters[type].stringify(range.end);
  }

  onDestroy(film.$targetRange.subscribe((range) => resetTextboxes(range)));
  $: type && resetTextboxes();
</script>

<layout-flex row gap>
  <Button
    variant={type === 'frame' ? 'primary' : 'normal'}
    on:click={() => type = 'frame'}
  >Frames</Button>
  <Button
    variant={type === 'second' ? 'primary' : 'normal'}
    on:click={() => type = 'second'}
  >Seconds</Button>
  <Button
    variant={type === 'beat' ? 'primary' : 'normal'}
    on:click={() => type = 'beat'}
  >Beats</Button>
</layout-flex>
<layout-flex row gap>
  <TextBox
    label={'Start ' + capitalize(type)}
    disabled={$status !== 'idle' || $targetRangeLocked}
    bind:value={start}
    on:blur={() => {
      const parsed = converters[type].parse(start);
      if (parsed != null && !isNaN(parsed)) {
        film.targetRangeStart = parsed;
      }
    }}
  />
  <TextBox
    label={'End ' + capitalize(type)}
    disabled={$status !== 'idle' || $targetRangeLocked}
    bind:value={end}
    on:blur={() => {
      const parsed = converters[type].parse(end);
      if (parsed != null && !isNaN(parsed)) {
        film.targetRangeEnd = parsed;
      }
    }}
  />
</layout-flex>

<style lang='scss'>

</style>
