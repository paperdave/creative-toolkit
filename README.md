# Dave Caruso's Creative Toolkit

This repository _\[will be\]_ the full collection of tools, resources, configuration, templates, and presets that I use to create songs and music videos for [paperdave](https://paperdave.net). It is delivered as a git repository with a nix derivation, meaning any linux computer should be able to use all of my tools without complicated installs: `nix develop` to get a preconfigured shell.

Not intended to be used by others. Feel free to explore and try it out though, this file will attempt to document it.

<details>
<summary><sub>table of contents</sub></summary>

- [Dave Caruso's Creative Toolkit](#dave-carusos-creative-toolkit)
  - [requirements](#requirements)
  - [dev environment](#dev-environment)
  - [nix packages](#nix-packages)
  - [project structure](#project-structure)
  - [render store](#render-store)
  - [my fusion/bitwig plugins](#my-fusionbitwig-plugins)
  - [js library for reading/writing fusion comps](#js-library-for-readingwriting-fusion-comps)
  - [`ct` cli help](#ct-cli-help)
    - [`ct init`](#ct-init)
    - [`ct a`](#ct-a)
    - [`ct gui`](#ct-gui)
    - [filming workflow](#filming-workflow)
    - [dreaming workflow](#dreaming-workflow)
    - [`ct audio-from`](#ct-audio-from)
    - [`ct f`](#ct-f)
    - [`ct path`](#ct-path)
    - [`ct r`](#ct-r)
    - [`ct split`](#ct-split)
    - [`ct tr`](#ct-tr)
    - [`ct final`](#ct-final)
  - [bun support](#bun-support)

</details>

## requirements

- [nix](https://nixos.org/). not required, but the entire build and dev flow is with nix
  - if you aren't using nix, you need the following: nodejs, bun, ffmpeg, fusion.
- [blackmagic fusion studio](https://www.blackmagicdesign.com/products/fusion) ($300 physical usb activation key)
- Nvidia GPU; drivers not included here.
  - My laptop has the GTX 1650 (mobile)
  - My desktop has the RTX 3090

## dev environment

Using `nix develop` will open a fish shell with all dependencies installed. May take a while first time as it includes a copy of Fusion studio.

## nix packages

this repo is a flake that contains derivations for the toolkit binaries, but also software I depend on:

- Creative toolkit itself.
- Blackmagic Fusion Studio 18
  - Does not currently support Fusion 9 (free), meaning you need to buy a license to use this.
  - Currently does not export the Render node
- Bun
  - Overrides the nixpkg version to be more updated, since upstream updates slowly especailly during the beta.

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
ct final [format]             webm render

global flags:
  --project -p        set project folder
  --render-root       set render root
```

<!-- END:CT CLI HELP -->

### `ct init`

`ct init` will create a `project.json` file and other basic files. it prompts for display name and id.

### `ct a`

`a` stands for arrange. this handles renaming files, configuring fusion comp render settings, and much more. it gets run automatically on other commands like `ct webm`.

### `ct gui`

this is a highly experimental gui application, but in the future this might be the way the entire app is used. depends on electron.

### filming workflow

`ct gui` contains a filming utility. given a time range (in seconds), it will film (without recording audio) live action content through a webcam, and sort it into a named folder. later these can be pulled into fusion, automatically aligned to the correct frame. filming runs in a loop, meaning you can continue acting without computer interaction until you believe you performed the take correctly (each take is saved).

takes are encoded using ffmpeg and nvenc

### dreaming workflow

**todo**: With the power of Stable Diffusion, we can generate images of any prompt in 5 seconds on a 3090. Creative Toolkit has a command to easily use SD, as easy as `ct di "snowstorm"`, saving the file in `./dream/image/snowstorm-0001.png`.

### `ct audio-from`

`ct audio-from` will set the project audio using the given file. If it is not a `.wav` file, it will be

### `ct f`

this is a simple wrapper around the `Fusion` executable. uses the project-specified fusion, which in 99.9% of cases is gonna be your system/nix-bundled default. it also resolves comp ids to full paths, such as `first` might match to `./comps/0000-1000_first.comp`.

### `ct path`

prints out path data. useful to debug

### `ct r`

this renders one composition by name

### `ct split`

this splits a composition into two compositions, at the given time. the first comp is the original, the second is the split, and is named with the original name plus `_split`.

### `ct tr`

automation to render thumbnail.comp and get just a single png file

### `ct final`

this will render the final video. it will use the project audio, and will use the project's render root as the output path.

## bun support

currently bun is not stable enough to be used as the runtime, but it is used to manage packages. since 2022-08-24 i removed all support of running with it, and will go back to using it when it's stable enough.

what's holding bun back:

- running on windows. I still use a windows machine as of 2022.
- we use electron for gui. this will be hard to replace as an IPC replacement needs to support high bandwidth data transfer (raw video stream, ~250mb/s); Websockets in chrome and firefox cannot handle this, but electron's IPC can. this is going to the be hardest challenge.
- `child_process` (we use bun-utilities when we can so this is not a huge issue)
- `process.stdin` / `prompts`
- `express` (gui only)
- `vite` (gui dev only)

in a dev environment, you can use `ctb` to try bun as the runtime. as of 2022-08-24, it currently errors missing `readline`
