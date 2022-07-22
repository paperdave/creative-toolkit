{
  description = "";
  inputs = {
    nixpkgs.url = github:NixOS/nixpkgs;
  };
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = let
        repoName = "creative-toolkit";
      in pkgs.mkShell {
        buildInputs = with pkgs; [
          nixpkgs-fmt
          (bun.overrideAttrs (old: rec {
            version = "0.1.4";
            src = pkgs.fetchurl {
              url = "https://github.com/Jarred-Sumner/bun-releases-for-updater/releases/download/bun-v${version}/bun-linux-x64.zip";
              hash = "sha256-uA8dv2m4deD7pgu6Qg63wVHuoe/ehffew684XXwvvuY=";
            };
          }))
        ];

        shellHook = ''
          bun i

          _REPO_ROOT="$PWD"
          
          __prompt_fn() {
            PS1="\[\e[95m\]${repoName}\[\e[97m\]"

            if [[ "$PWD" == "$_REPO_ROOT"* ]]; then
              PS1="''${PS1}\[\e[94m\]''${PWD/#$_REPO_ROOT/}"
            else
              PS1="''${PS1}:\[\e[93m\]$PWD"
            fi

            PS1="''${PS1} \[\e[97m\]$\[\e[0m\] "
          }

          PROMPT_COMMAND="__prompt_fn"
        '';
      };
    };
}
