import path from "path";
import { existsSync } from "fs";

export enum RenderProgram {
  Fusion = "Fusion",
  Blender = "Blender",
  CTWaveform = "Waveform",
  CTFilm = "Film",
}

const win = process.platform === "win32";

const execFusion = [
  "fusion-studio",
  "Fusion",
  ...(win
    ? [
        "C:\\Program Files\\Blackmagic Design\\Fusion 18\\Fusion.exe",
        "C:\\Program Files\\Blackmagic Design\\Fusion 9\\Fusion.exe",
      ]
    : [
        "/opt/fusion-studio/Fusion",
        "/opt/BlackmagicDesign/Fusion18/Fusion",
        "/opt/BlackmagicDesign/Fusion9/Fusion",
      ]),
];

export const DEFAULT_PATHS = {
  projectJSON: "project.json",
  sequence: "sequence",
  render: win ? "C:\\Render" : "/render",
  audio: "{id}.wav",
  temp: process.env.TEMP ?? process.env.TMPDIR ?? (win ? "C:\\Temp" : "/tmp"),
  film: "film",
  preview: "preview",

  execFusion,
  execFusionRender: [
    "fusion-render-node",
    "FusionRenderNode",
    ...(win
      ? [
          "C:\\Program Files\\Blackmagic Design\\Fusion Render Node 18\\FusionRenderNode.exe",
        ]
      : [
          "/opt/fusion-render-node/FusionRenderNode",
          "/opt/BlackmagicDesign/Fusion18/FusionRenderNode",
        ]),
    ...execFusion,
  ],

  execBlender: "blender",
  execFFmpeg: "ffmpeg",
  execFFprobe: "ffprobe",
};

export type Paths = Record<keyof typeof DEFAULT_PATHS, string>;

export function resolveExec(
  pathname: string | string[],
  root = process.cwd()
): string {
  if (Array.isArray(pathname)) {
    for (const item of pathname) {
      const resolve = resolveExec(item, root);
      if (resolve) {
        return resolve;
      }
    }
    return null!;
  }

  if (pathname.endsWith(".exe")) {
    pathname = pathname.replace(/\.exe$/, "");
  }

  if (pathname.startsWith(".")) {
    pathname = path.resolve(pathname, root);
  }
  if (existsSync(pathname)) {
    return pathname;
  }

  const binPaths = process.env.PATH!.split(path.delimiter);
  for (const binPath of binPaths) {
    const execPath = path.join(binPath, pathname) + (win ? ".exe" : "");
    if (existsSync(execPath)) {
      return execPath;
    }
  }
  return null!;
}
