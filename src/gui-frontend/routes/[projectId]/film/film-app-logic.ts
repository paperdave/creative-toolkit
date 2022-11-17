/* eslint-disable no-console */
import clickStrongURL from '$assets/audio/click-strong.wav';
import clickWeakURL from '$assets/audio/click-weak.wav';
import type { APIProject } from '$/gui-api/structs/project';
import type { IRange } from '$/util';
import { activeProject, fetchBuffer } from '$data';
import { deferred } from '@paperdave/utils';
import { get, writable } from 'svelte/store';

export type FilmStatus = 'idle' | 'recording' | 'previewing' | 'recording_prep' | 'recording_post';

export interface AudioInstance {
  source: AudioBufferSourceNode;
  playing: boolean;
  done: Promise<void>;
  stop(): void;
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
  videoCanvas = new OffscreenCanvas(1920, 1080);
  audioCtx = new AudioContext();
  clickStrong!: AudioBuffer;
  clickWeak!: AudioBuffer;
  projectAudio?: AudioBuffer;

  stream?: MediaStream;

  $status = writable<FilmStatus>('idle');
  $mediaDevices = writable<MediaDeviceInfo[]>([]);
  $streamSettings = writable<MediaTrackSettings | null>(null);
  $deviceId = writable<string | undefined>(undefined);
  $targetId = writable<string>('demo');
  $targetRange = writable<IRange>({ start: 0, end: this.project.fps * 2 });

  currentAudioInstance?: AudioInstance;

  private boundVideos: HTMLVideoElement[] = [];

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

  playBuffer(buffer: AudioBuffer, secondsDelay = 0): AudioInstance {
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
    source.start(secondsDelay + this.audioCtx.currentTime);
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
    this.currentAudioInstance = this.playBuffer(this.projectAudio);
    await this.currentAudioInstance.done;
    this.$status.set('idle');
  }

  close() {
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
