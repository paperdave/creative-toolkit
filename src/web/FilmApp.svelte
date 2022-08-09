<script lang='ts'>
  import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
  import { onDestroy, onMount } from "svelte";
  import type { ProjectJSON } from '../project-json';
  import { delay } from '@paperdave/utils';

  export let project: ProjectJSON;
  export let audioData: ArrayBuffer;
  export let resClickWeak: ArrayBuffer;
  export let resClickStrong: ArrayBuffer;

  let mounted = true;

  function roundSecondToNearestFrame(seconds: number) {
    return Math.floor(seconds * 30) / 30;
  }
  
  const mediaDevices = navigator.mediaDevices.enumerateDevices()
    .then(x => x.filter(d => d.kind === 'videoinput'));  

  let deviceId: string | null = null;
  let audioRange = [0, 5];
  
  let initialName = 'demo';
  let groupId = initialName;
  function resetDefGroupId() {
    if (initialName === groupId) {
      groupId = initialName = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: '_',
      });
    }
  }

  let videoPreview: HTMLVideoElement;
  let videoCanvas: HTMLCanvasElement;
  let stream: MediaStream | null = null;

  let audioContext: AudioContext = null!;
  let audioSource: AudioBufferSourceNode = null!;
  let audioBuffer: AudioBuffer = null!;
  let clickWeakBuffer: AudioBuffer = null!;
  let clickStrongBuffer: AudioBuffer = null!;
  async function setupAudioContext() {
    if (audioContext) {
      return;
    }

    audioContext = new AudioContext();
    audioBuffer = await audioContext.decodeAudioData(audioData);
    clickWeakBuffer = await audioContext.decodeAudioData(resClickWeak);
    clickStrongBuffer = await audioContext.decodeAudioData(resClickStrong);
  }

  function createAudioSource() {
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.loop = true;
    audioSource.loopStart = roundSecondToNearestFrame(audioRange[0]);
    audioSource.loopEnd = roundSecondToNearestFrame(audioRange[1]);
    audioSource.connect(audioContext.destination);

    return audioSource;
  }


  async function init() {
    if (stream) {
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: deviceId ?? undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: {
          min: 30,
          max: 30,
          exact: 30,
          ideal: 30
        }
      },
      audio: false,
    });

    videoPreview.srcObject = stream;
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      videoPreview.srcObject = null;
      stream = null;
    }
  }

  function onDeviceChange(ev: Event) {
    deviceId = (ev.currentTarget as HTMLInputElement).value;
    stopStream();
    init();
  }

  async function start() {
    if (audioSource) {
      audioSource.stop();
      audioSource.disconnect();
      audioSource = null!;
    }
    if (!stream) return;

    await setupAudioContext();

    await doOneTake();
  }

  function playClickSound(buffer: AudioBuffer, offset: number) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => source.disconnect();
    source.start(offset + audioContext.currentTime);
  }

  async function doOneTake() {
    const recorder = new MediaRecorder(stream!, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 10_000_000,
    });

    const oneBeat = (60 / project.audioTiming.bpm);

    const chunks: Blob[] = [];
    recorder.addEventListener('dataavailable', (event) => {
      chunks.push(event.data);
    });

    recorder.addEventListener('stop', async () => {
      audioSource?.stop();

      const blob = new Blob(chunks, { type: 'video/webm' });
      
      const url = new URL('/api/take', location.href);
      url.searchParams.set('startFrame', Math.max(0, Math.floor((audioRange[0] - oneBeat * 4) * 30)).toString());
      url.searchParams.set('endFrame', Math.floor((audioRange[1] + oneBeat * 4) * 30).toString());
      url.searchParams.set('groupId', groupId);

      const r = await fetch(url, {
        method: 'POST',
        body: blob,
        headers: {
          'Content-Type': 'video/webm',
        },
      }).then(r => r.json());

      alert('it worked if it says so: ' + JSON.stringify(r));
    });

    createAudioSource();

    playClickSound(clickStrongBuffer, 0);
    playClickSound(clickWeakBuffer, oneBeat);
    playClickSound(clickWeakBuffer, oneBeat * 2);
    playClickSound(clickWeakBuffer, oneBeat * 3);
    playClickSound(clickStrongBuffer, oneBeat * 4);
    
    const startTime = roundSecondToNearestFrame(audioRange[0]) - (oneBeat * 4);

    if (startTime > 0) {
      audioSource.start(0, audioContext.currentTime + startTime);
      recorder.start(0);
    } else {
      audioSource.start(audioContext.currentTime - startTime);
      setTimeout(() => {
        recorder.start(0);
      }, -startTime * 1000);
    }

    await delay(roundSecondToNearestFrame(audioRange[1]) * 1000 - roundSecondToNearestFrame(audioRange[0]) * 1000 + oneBeat * 4000);
    playClickSound(clickStrongBuffer, 0);
    audioSource!.stop();
    audioSource.disconnect();
    audioSource = null!;
    await delay(oneBeat * 4000);
    recorder.stop();
  }

  function stop() {
    
  }

  async function previewAudio() {
    await setupAudioContext();
    if (!audioSource) {
      audioSource = createAudioSource();
      audioSource.start(0, roundSecondToNearestFrame(audioRange[0]));
    } else {
      audioSource.stop();
      audioSource.disconnect();
      audioSource = null!;
    }
  }

  // function raf() {
  //   if (!mounted) {
  //     return;
  //   }
  //   requestAnimationFrame(raf);

  //   if (!stream) {
  //     return;
  //   }

  //   const ctx = videoCanvas.getContext('2d')!;
  //   ctx.drawImage(videoPreview, 0, 0, videoCanvas.width, videoCanvas.height);
  //   const imageData = ctx.getImageData(0, 0, videoCanvas.width, videoCanvas.height).data;
  //   console.log(imageData);
  // }

  onMount(() => {
    mediaDevices.then(devices => {
      deviceId = devices[0].deviceId;
      init();
    });
    // requestAnimationFrame(raf);
  });

  onDestroy(() => {
    stopStream();
    mounted = false;
  });

  $: settings = stream && stream.getVideoTracks()[0].getSettings();
</script>

<h1>shityy program to make record video</h1>
<p>
  filming for {project.name} ({project.id})
</p>
<div class="row">
  <button on:click={init}>init</button>
  <select on:change={onDeviceChange} value={deviceId}>
    {#await mediaDevices then devices}
      {#each devices as device}
        <option value={device.deviceId || null}>{device.label || 'Default'}</option>
      {/each}
    {/await}
  </select>
  <button on:click={start}>engage boosters</button>
</div>
<div class="row">
  time:
  <input type="number" bind:value={audioRange[0]} on:change={resetDefGroupId}>-<input type="number" bind:value={audioRange[1]} on:change={resetDefGroupId}>
  <button on:click={previewAudio}>
    {#if audioSource}
      stop preview
    {:else}
      preview
    {/if}
  </button>
</div>
<div class="row">
  capture id = <input type="text" bind:value={groupId}>
</div>
<p>
  {#if audioRange[0] > audioRange[1]}
    error: start time is after end time
  {:else if audioRange[0] < 0}
    error: start time is before 0
  {:else if audioRange[0] < ((60/project.audioTiming.bpm) * 4)}
    note: {((60/project.audioTiming.bpm) * 4 - audioRange[0]).toFixed(2)} seconds of prep time will be cut off.
  {:else}
    &nbsp;
  {/if}
</p>
<div class="row">
  <video bind:this={videoPreview} autoplay muted></video>
  <canvas bind:this={videoCanvas} width='1920' height="1080" ></canvas>
</div>
{#if settings}
  <ul>
    <li>width: {settings.width}</li>
    <li>height: {settings.height}</li>
    <li>frame rate: {settings.frameRate}</li>
  </ul>
{/if}

<style>
  video {
    width: 500px;
    height: calc(500px * (9 / 16));
  }
  canvas {
    width: 500px;
    height: calc(500px * (9 / 16));
  }
</style>
