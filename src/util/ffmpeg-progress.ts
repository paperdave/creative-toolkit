// import { Logger, Progress } from "@paperdave/logger";
// import type {
//   FFMpegProgressOptions,
//   IFFMpegProgressData,
// } from "ffmpeg-progress-wrapper";
// // import { FFMpegProgress } from "ffmpeg-progress-wrapper";
// import type { Project } from "../../app/src/project";

// interface RunFFMpegOptions
//   extends Pick<
//     FFMpegProgressOptions,
//     "cwd" | "duration" | "env" | "maxMemory"
//   > {
//   text?: string;
//   durationFrames: number;
//   stream?: NodeJS.ReadableStream;
// }

// const logFFmpeg = new Logger("ffmpeg", { debug: true });

// export async function runFFMpeg(
//   project: Project,
//   args: string[],
//   opts: RunFFMpegOptions
// ) {
//   Logger.debug(`ffmpeg ${args.join(" ")}`);
//   return new Promise<void>((resolve, reject) => {
//     let log = "";
//     const ffmpeg = new FFMpegProgress(args, {
//       cmd: project.paths.execFFmpeg,
//       hideFFConfig: true,
//       cwd: project.root,
//       ...opts,
//     });
//     if (opts.stream) {
//       opts.stream.pipe(ffmpeg.process.stdin!);
//     }
//     const bar = new Progress({
//       text: opts.text ?? "FFmpeg",
//       total: 1,
//     });
//     ffmpeg.on("progress", (data: IFFMpegProgressData) => {
//       bar.update(data.frame! / opts.durationFrames);
//     });
//     ffmpeg.process.stdout!.on("data", (data) => {
//       log += data.toString();
//       const lines = log.replace(/\r/g, "\n").split("\n");
//       log = lines.pop() ?? "";
//       lines.forEach((line) => logFFmpeg(line));
//     });
//     ffmpeg.process.stderr!.on("data", (data) => {
//       log += data.toString();
//       const lines = log.replace(/\r/g, "\n").split("\n");
//       log = lines.pop() ?? "";
//       lines.forEach((line) => logFFmpeg(line));
//     });
//     ffmpeg.once("end", (code) => {
//       if (code !== 0) {
//         bar.error(`${opts.text} exited with code ${code}`);
//         reject();
//       } else {
//         bar.success(`${opts.text} completed`);
//         resolve();
//       }
//     });
//   });
// }
