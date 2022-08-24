with builtins;
{ pkgs ? import <nixpkgs> { }
, ctPackages ? import ./packages.nix pkgs
, ...
}:
let
  repoName = "ct";
in
pkgs.mkShell {
  buildInputs = [
    pkgs.nixpkgs-fmt
    pkgs.electron
    pkgs.ffmpeg
    ctPackages.bun
    ctPackages.fusion-studio
  ];

  shellHook = ''
    bun i > /dev/null
    bun run dev &>/dev/null &
    DEV_PID=$!

    __exit() {
      kill -9 $DEV_PID
    }
    trap __exit EXIT

    REPO="$PWD"
          
    __prompt_fn() {
      PS1="\[\e[95m\]${repoName}\[\e[97m\]"
              
     if [[ "$PWD" == "$REPO" ]]; then
        :
      elif [[ "$PWD" == "$REPO"* ]]; then
        PS1="''${PS1} \[\e[90m\].''${PWD/#$REPO/}"
      elif [[ "$PWD" == "$HOME"* ]]; then
        PS1="''${PS1} \[\e[90m\]~''${PWD/#$HOME/}"
      else
        PS1="''${PS1} \[\e[90m\]$PWD"
      fi

      PS1="''${PS1} \[\e[97m\]$\[\e[0m\] "
    }

    ctb() {
      bun $REPO/src/index.ts "$@"
    }

    ct() {
      node $REPO/dist/cli.js "$@"
    }

    PROMPT_COMMAND="__prompt_fn"
  '';
}
