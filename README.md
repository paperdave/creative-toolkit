# creative toolkit

Set of tools for building paperdave songs and videos. Most of it is automated tooling operated through a CLI application. The goal is to get everything: automated workflows, rendering pipelines, years of custom application configuration, work logging, song sketching and pre-production utilities, and tools to download and inspect my old completed projects.

Not intended to be used by others; no contributions accepted. Feel free to explore and try it out though. This readme will document some of it but definetly not all of it.

<details>
<summary><sub>table of contents</sub></summary>

- [creative toolkit](#creative-toolkit)
  - [required software](#required-software)
  - [installing](#installing)
  - [`ct` cli help](#ct-cli-help)
  - [nix/nixos contents](#nixnixos-contents)
  - [project structure](#project-structure)
  - [render store](#render-store)
  - [my fusion/bitwig plugins](#my-fusionbitwig-plugins)
  - [js library for reading/writing fusion comps](#js-library-for-readingwriting-fusion-comps)
  - [ct a](#ct-a)
  - [filming workflow](#filming-workflow)
  - [bun support](#bun-support)

</details>

## required software

- [ffmpeg](https://ffmpeg.org/)
- [nodejs](https://nodejs.org/en/) v18
  - Ubuntu repos provides outdated packages, [follow this to install](https://github.com/nodesource/distributions#installation-instructions).
- [blackmagic fusion](https://www.blackmagicdesign.com/products/fusion)
  - Studio version ($300) is required for headless/unattended rendering.
  - Free version should work too, but you're stuck on version 9.0.2, which is from 2017. BMD doesn't provide free versions of newer versions since DaVinci Resolve includes Fusion now.
    - [windows download](https://www.blackmagicdesign.com/support/download/54fc7e36d6fe466d95bc2e583c359582/Windows)
    - [linux download](https://www.blackmagicdesign.com/support/download/54fc7e36d6fe466d95bc2e583c359582/Linux)
  - Nix derivations are available for automated installs, see below.
- A NVIDIA GPU with NVENC support (for video encoding, code could be modified to fallback to other encoders).
  - My laptop has the GTX 1650 (mobile)
  - My desktop has the RTX 3090

## installing

impossible at the moment. use the `main` branch.

## `ct` cli help

<!-- MARKER:CT CLI HELP -->

```
ct init                       setup project structure.
ct a                          arrange
ct gui                        we use electron
ct audio-from <file>          sets project audio using file
ct f [...args]                runs fusion, will resolve compname for you
ct path [<key> <p>]           inspect/edit paths
ct r <...comps>               render comp(s) by label
  --force -f                  clears cache
ct split <id> <at> [to]       split a fusion comp
ct tr                         thumbnail render
ct webm                       webm render

global flags:
  --project -p        set project folder
  --render-root       set render root
```

<!-- END:CT CLI HELP -->

## nix/nixos contents

this repo is a flake that contains derivations for the toolkit binaries, but also software I depend on:

- Blackmagic Fusion Studio 18
  - Does not currently support Fusion 9 (free), meaning you need to buy a license to use this.
  - Currently does not export the Render node
- Bun
  - Overrides the nixpkg version to be more updated, since upstream updates slowly especailly during the beta.

You can use `nix develop` to get a shell with node, and the `ct` cli all prepared for use.

## project structure

a video project consists of an audio file from a DAW like Bitwig Studio (wav format), and then a folder of fusion compositions, where ever frame of the final video is covered by exactly one comp. files are named in a format like `000-000_label.comp`, where the numbers indicate frame ranges. The ranges in filenames are automatically written for you, so this is just a visual sorting thing.

run `ct init` to make the current folder a project, aka creates the `project.json` metadata file. a project has a display name and an id. the id is used for artifact files, such as `./in-the-summer.webm` as the final video output, as well as render store entry names.

## render store

the render store is a folder of rendered contents, ranging from fusion compositions to blender projects to media extractions to whatever. should be a local folder, one per machine. automation work is to be done here, but for now it's just a place to store things.

default location is `/render` on linux (needs sudo to set this up, chmod to allow your user access), and `C:\Render` on windows (might need admin to create this folder) and the contents of it follow this format: `./ProjectName_ProgramName_ShotName`. Each part is always in pascal case. An example of a render store entry name would be `./Mayday_Blender_RainyWorld`.

In the future, it will be possible to download my render store entries, to skip out on rendering them yourself, since we all know that rendering blender things can take days. Some render store entries are local and temporary, such as a film extract entry like `./MysteryOfLife_CTFilm_ElegantWren2`, as these are based off of content within the project folder and make no sense to be uploaded.

> note: entries from [Mayday](https://paperdave.net/mayday) and [I'm 18 now](https://paperdave.net/im-18-now) exist, but might not ever make it into this system since they use an older version of the toolkit before the render system was standardized. if you want these files send me a message.

## my fusion/bitwig plugins

**todo**: add these in. there's alot of fusion plugins and configuration i've done over my 3 years on-and-off of using Fusion. there's a couple of bitwig instrument templates too. i need to check if im allowed to distribute all my fusion plugins as i didn't author them all.

The only thing missing from this would be my sample packs and texture libraries, which I unfortunately can't distribute due to licensing.

## js library for reading/writing fusion comps

there is a library named `bmfusion` which is able to read and write `.comp` files with a decent api. it's not perfect, but it's good enough for my use cases.

```ts
const comp = Composition.fromFile('./my-comp.comp');
// Set the current time to 10 frames after the render starts
comp.CurrentTime = comp.RenderRangeStart + 10;
comp.writeAndMoveFile();
```

## ct a

`a` stands for arrange. this handles renaming files, configuring fusion comp render settings, and much more. it gets run automatically on other commands like `ct webm`.

## filming workflow

`ct gui` contains a filming utility. given a time range (in seconds), it will film (without recording audio) live action content through a webcam, and sort it into a named folder. later these can be pulled into fusion, automatically aligned to the correct frame. filming runs in a loop, meaning you can continue acting without computer interaction until you believe you performed the take correctly (each take is saved).

takes are encoded using ffmpeg and nvenc

## bun support

currently bun is not stable enough to be used. since 2022-08-24 i removed all support of running with it, and will go back to using it when it's stable enough.

what's holding bun back:

- running on windows. I still use a windows machine as of 2022.
- we use electron for gui. this will be hard to replace as an IPC replacement needs to support high bandwidth data transfer (raw video stream, ~250mb/s); Websockets in chrome and firefox cannot handle this, but electron's IPC can. this is going to the be hardest challenge.
- `child_process` (we use bun-utilities when we can so this is not a huge issue)
- `process.stdin` / `prompts`
- `express` (gui only)
- `vite` (gui dev only)
