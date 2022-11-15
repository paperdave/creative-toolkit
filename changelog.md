## Next Version

- Repository acts somewhat as a dotfiles for my whole system.
- Rewritten to use only Bun, new cli tools and so on.
- The so called "Two Step Process"
  - `.blend` files in the `step1` folder, these are rendered with extra passses like cryptomatte.
  - `comps` folder moved to `step2`, and now takes a `MainInput` with step 1's render.
  - instead of rendering to separate folders, now renders to `step1` and `step2` folders, no symlinking.
  - all renders use exr format for simplicity.
- gui rewritten to use react
- waveform renders to a mp4 file as it loads faster (and at all, which i didn't realize) on fusion.

## Toolkit 2022-10-06 (mystery of life)

Automated scripts with bun and node, using a `comps` folder, relying heavily on nix and nixos.
