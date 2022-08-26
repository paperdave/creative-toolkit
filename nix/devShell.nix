with builtins;
{ pkgs ? import <nixpkgs> { }
, ctPackages ? import ./packages.nix pkgs
, ...
}:
let
  repoName = "ct";

  mkDevShell = { light }: pkgs.mkShell {
    buildInputs = concatLists [
      [
        pkgs.tree
        pkgs.nixpkgs-fmt
        pkgs.electron
        pkgs.ffmpeg
        pkgs.fish
        # gyp builds
        pkgs.pkg-config
        pkgs.python3
        pkgs.pixman
        pkgs.cairo
        pkgs.pango
        pkgs.giflib

        ctPackages.bun
      ]
      (if light then [ ] else [
        ctPackages.fusion-studio
      ])
    ];

    shellHook = ''
      set -e
      printf "Preparing development environment... "
      pnpm i 2> /dev/null
      bun rollup -cw &>/dev/null &
      DEV_PID=$!
      printf "\33[2K\r\33[1;32m✔ Development Environment Setup:\33[0m\n"
      printf "\33[32mNode $(node --version)\33[37m | "
      printf "\33[33mBun v$(bun --version)\33[0m "
      ${if light then "" else ''printf "| \33[36mFusion v${ctPackages.fusion-studio.version}\33[0m "''}
      printf "\n"
      printf "  CLI is available as \33[32mct\33[0m\n"
      printf "  Try bun with \33[36mctb\33[0m [experimental]\n\n"
      set +e
      export IS_DEV_SHELL=true

      __exit() {
        kill -9 $DEV_PID
      }
      trap __exit EXIT

      fish -C 'source config.fish'
      exit
    '';
  };
in
{
  default = mkDevShell { light = false; };
  light = mkDevShell { light = true; };
}
