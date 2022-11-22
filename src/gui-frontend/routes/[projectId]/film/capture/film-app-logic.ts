/* eslint-disable no-console */
import clickStrongURL from '$assets/audio/click-strong.wav';
import clickWeakURL from '$assets/audio/click-weak.wav';
import type { APIFilmTake } from '$/gui-api/structs/film';
import type { APIProject } from '$/gui-api/structs/project';
import type { IRange } from '$/util';
import { showMessage } from '$components/popup';
import {
  activeFilmShotList,
  activeProject,
  fetchBuffer,
  guiActionCreateFilmShotTake,
  guiActionDeleteFilmShotTake,
  writableWithMap,
} from '$data';
import type { Timer } from '@paperdave/utils';
import { deferred, delay } from '@paperdave/utils';
import { derived, get, writable } from 'svelte/store';
import { roundSecondToFrame } from './film-utils';

declare const CTFilmBackend: CTFilmBackend;

interface CTFilmBackend {
  initCapture(opts: { startFrame: number; endFrame: number; filename: string }): Promise<string>;
  pushFrame(data: any): void;
  finishCapture(): void;
  cancelCapture(): void;
}

export type FilmStatus = 'idle' | 'recording' | 'previewing' | 'recording_prep' | 'recording_post';

export interface AudioInstance {
  source: AudioBufferSourceNode;
  playing: boolean;
  done: Promise<void>;
  stop(): void;
}

export interface PlayOptions {
  delay?: number;
  offset?: number;
  duration?: number;
}

let singleton: FilmAppLogic | Promise<FilmAppLogic> | null = null;
export async function getFilmAppLogic(): Promise<FilmAppLogic> {
  if (singleton) {
    return singleton;
  }
  const filmApp = new FilmAppLogic();
  singleton = filmApp.start().then(() => filmApp);
  singleton = await singleton;
  return singleton;
}

export class FilmAppLogic {
  project: APIProject = get(activeProject);
  beatDuration = 60 / this.project.audioTiming.bpm;
  videoCanvas = new OffscreenCanvas(1920, 1080);
  videoCanvasCtx = this.videoCanvas.getContext('2d')!;
  audioCtx = new AudioContext();
  clickStrong!: AudioBuffer;
  clickWeak!: AudioBuffer;
  projectAudio?: AudioBuffer;

  stream?: MediaStream;

  $status = writable<FilmStatus>('idle');
  $statusCountdown = writable<number | null>(null);
  $mediaDevices = writable<MediaDeviceInfo[]>([]);
  $streamSettings = writable<MediaTrackSettings | null>(null);
  $deviceId = writable<string | undefined>(undefined);
  $targetId = writableWithMap<string>('demo', value => {
    const shot = get(activeFilmShotList).find(x => x.id === value);
    console.log('set targetId', value, shot);
    if (shot) {
      this.targetRange = { start: shot.start, end: shot.end };
    }
    return value;
  });
  $targetRange = writable<IRange>({ start: 0, end: this.project.fps * 2 });
  $targetRangeLocked = derived(
    //
    [this.$targetId, activeFilmShotList],
    ([targetId, filmShotList]) => filmShotList.some(x => x.id === targetId)
  );

  currentAudioInstance?: AudioInstance;

  private boundVideos: HTMLVideoElement[] = [];

  get captureFPS() {
    return this.project.fps === 60 ? 30 : this.project.fps;
  }

  async start() {
    (globalThis as any).film = this;
    const mediaDevices = await navigator.mediaDevices
      .enumerateDevices()
      .then(x => x.filter(d => d.kind === 'videoinput'));
    this.$mediaDevices.set(mediaDevices);

    this.$deviceId.set(mediaDevices[0]?.deviceId);

    this.clickStrong = await fetch(clickStrongURL)
      .then(x => x.arrayBuffer())
      .then(x => this.audioCtx.decodeAudioData(x));
    this.clickWeak = await fetch(clickWeakURL)
      .then(x => x.arrayBuffer())
      .then(x => this.audioCtx.decodeAudioData(x));

    if (this.project.hasAudio) {
      const projectAudio = await fetchBuffer(`/project/${this.project.id}/audio.wav`);
      this.projectAudio = await this.audioCtx.decodeAudioData(projectAudio);
    }

    await this.restartCameraStream();
  }

  async restartCameraStream() {
    if (this.stream) {
      this.stopCameraStream();
    }

    const deviceId = get(this.$deviceId);

    if (!deviceId) {
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: {
            ideal: this.project.fps,
          },
        },
        audio: false,
      });
      this.$streamSettings.set(this.stream.getVideoTracks()[0].getSettings());
      for (const video of this.boundVideos) {
        video.srcObject = this.stream;
        video.muted = true;
        video.play();
      }
    } catch (error) {
      console.error(error);
    }
  }

  stopCameraStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = undefined;
      for (const video of this.boundVideos) {
        video.srcObject = null;
      }
    }
  }

  bindVideo(video: HTMLVideoElement) {
    this.boundVideos.push(video);
    if (this.stream) {
      video.srcObject = this.stream;
      video.muted = true;
      video.play();
    }
  }

  unbindVideo(video: HTMLVideoElement) {
    if (this.stream && video.srcObject === this.stream) {
      video.srcObject = null;
    }
    this.boundVideos = this.boundVideos.filter(v => v !== video);
  }

  playBuffer(
    buffer: AudioBuffer,
    { delay: playDelay = 0, duration = Infinity, offset = 0 }: PlayOptions = {}
  ): AudioInstance {
    const source = this.audioCtx.createBufferSource();
    const [done, resolve] = deferred<void>();
    const instance = {
      source,
      playing: true,
      done,
      stop() {
        source.stop();
      },
    };
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);
    source.onended = () => {
      source.disconnect();
      instance.playing = false;
      resolve();
    };
    source.start(
      playDelay + this.audioCtx.currentTime,
      offset,
      duration === Infinity ? undefined : duration
    );
    return instance;
  }

  async startPreview() {
    if (this.status === 'previewing') {
      this.currentAudioInstance?.stop();
      return;
    }
    if (!this.projectAudio || this.status !== 'idle') {
      return;
    }

    this.$status.set('previewing');
    this.currentAudioInstance = this.playBuffer(this.projectAudio, {
      offset: roundSecondToFrame(this.targetRange.start / this.project.fps),
      duration: roundSecondToFrame(
        (this.targetRange.end - this.targetRange.start) / this.project.fps
      ),
    });
    await this.currentAudioInstance.done;
    this.$status.set('idle');
  }

  async startRecording() {
    if (this.status !== 'idle' && !this.stream) {
      return;
    }
    if (!this.projectAudio) {
      return;
    }
    if (typeof CTFilmBackend === 'undefined') {
      showMessage({
        title: 'Cannot record',
        message:
          'The "CTFilmBackend" global variable is not defined. Please run creative toolkit within the desktop app to use this feature.',
      });
      return;
    }
    if (!this.boundVideos[0]) {
      showMessage({
        title: 'Cannot record',
        message:
          'No video element is bound to the FilmAppLogic. Please bind a video element to the logic before recording.',
      });
      return;
    }

    const latency = this.audioCtx.baseLatency;

    const { beatDuration, videoCanvas: canvas, videoCanvasCtx: ctx } = this;
    const fps = this.captureFPS;
    const start = Math.floor((this.targetRange.start / this.project.fps) * fps);
    const end = Math.ceil((this.targetRange.end / this.project.fps) * fps);

    const beatOffset = (start / fps) % beatDuration;

    this.$statusCountdown.set(5);
    this.$status.set('recording_prep');

    let take: APIFilmTake;
    try {
      take = await guiActionCreateFilmShotTake(this.project.id, {
        id: this.targetId,
        start,
        end,
      });
    } catch (error: any) {
      this.$status.set('idle');
      showMessage({
        title: 'Cannot record',
        message: `The api failed to create the take: ${error?.message ?? error}`,
      });
      return;
    }

    try {
      await CTFilmBackend.initCapture({
        startFrame: Math.max(0, Math.floor((start - latency - beatDuration * 2) * fps) - 1),
        endFrame: Math.floor((end - latency + beatDuration * 2) * fps - 1),
        filename: take.filename,
      });
    } catch (error: any) {
      this.$status.set('idle');
      showMessage({
        title: 'Cannot record',
        message: `The backend failed to initialize the recording: ${error?.message ?? error}`,
      });
      this.$status.set('idle');
      guiActionDeleteFilmShotTake(this.project.id, this.targetId, take.num);
      return;
    }

    if (beatOffset === 0) {
      this.playBuffer(this.clickStrong, { delay: beatDuration * 1 });
    }

    this.playBuffer(this.clickWeak, { delay: beatDuration * 2 - beatOffset });
    this.playBuffer(this.clickWeak, { delay: beatDuration * 3 - beatOffset });
    this.playBuffer(this.clickWeak, { delay: beatDuration * 4 - beatOffset });

    const startTime = roundSecondToFrame(start / fps, fps) - beatDuration * 5;
    const duration = roundSecondToFrame((end - start) / fps, fps);

    for (let i = 0; i < duration / beatDuration; i++) {
      this.playBuffer(i % 4 === 0 ? this.clickStrong : this.clickWeak, {
        delay: (i + 5) * beatDuration - beatOffset,
      });
    }

    const mainAudio = this.playBuffer(this.projectAudio, {
      offset: startTime > 0 ? startTime : 0,
      delay: startTime > 0 ? 0 : -startTime,
      duration: duration + (startTime > 0 ? 0 : beatDuration * 5 + startTime),
    });

    for (let i = 1; i <= 4; i++) {
      setTimeout(() => {
        this.$statusCountdown.set(4 - i + 1);
      }, beatDuration * i * 1000);
    }

    let captureTimeout!: Timer;
    setTimeout(() => {
      const boundVideo = this.boundVideos[0];
      captureTimeout = setInterval(() => {
        const nowStart = performance.now();
        ctx.drawImage(boundVideo, 0, 0, canvas.width, canvas.height);
        const nowDrawImage = performance.now();
        const data = new Uint8Array(
          ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        const nowGetData = performance.now();
        CTFilmBackend.pushFrame(data);
        const nowEnd = performance.now();
        const elapsed = nowEnd - nowStart;
        if (elapsed >= 17) {
          console.warn(
            `[film] Frame took ${elapsed.toFixed(2)}ms (drawImage: ${
              nowDrawImage - nowStart
            }ms, getData: ${nowGetData - nowDrawImage}ms, pushFrame: ${nowEnd - nowGetData}ms)`
          );
        }
      }, 1000 / fps);
    }, ((startTime > 0 ? 0 : -startTime) + beatDuration * 2) * 1000);

    await delay(this.beatDuration * (4 + 1) * 1000);
    this.$status.set('recording');
    await mainAudio.done;
    clearInterval(captureTimeout);
    this.$status.set('recording_post');
    this.playBuffer(this.clickStrong);
    await delay(2000 * beatDuration);
    CTFilmBackend.finishCapture();
    await delay(2000 * beatDuration);
    this.$status.set('idle');
  }

  close() {
    this.audioCtx.close();
    this.stopCameraStream();
    delete (globalThis as any).film;
  }

  // store bindings
  get targetId() {
    return get(this.$targetId);
  }
  set targetId(value) {
    this.$targetId.set(value);
  }
  get targetRange() {
    return get(this.$targetRange);
  }
  set targetRange(value) {
    this.$targetRange.set(value);
  }
  get targetRangeStart() {
    return get(this.$targetRange).start;
  }
  set targetRangeStart(value) {
    this.$targetRange.set({
      start: value,
      end: this.targetRangeEnd,
    });
  }
  get targetRangeEnd() {
    return get(this.$targetRange).end;
  }
  set targetRangeEnd(value) {
    this.$targetRange.set({
      start: this.targetRangeStart,
      end: value,
    });
  }
  get mediaDevices() {
    return get(this.$mediaDevices);
  }
  get streamSettings() {
    return get(this.$streamSettings);
  }
  get deviceId() {
    return get(this.$deviceId);
  }
  set deviceId(value) {
    this.$deviceId.set(value);
  }
  get status() {
    return get(this.$status);
  }
}
