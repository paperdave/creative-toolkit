{
  description = "";
  inputs = {
    nixpkgs.url = github:NixOS/nixpkgs;
  };
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      bun = (pkgs.bun.overrideAttrs (old: rec {
        version = "0.1.5";
        src = pkgs.fetchurl {
          url = "https://github.com/Jarred-Sumner/bun-releases-for-updater/releases/download/bun-v${version}/bun-linux-x64.zip";
          hash = "sha256-UkotflHd2keGeZVSrhwYq45hc7sw8VjybK6Jmn508i8=";
        };
      }));
    in
    rec {
      devShells.${system}.default =
        let
          repoName = "ct";
        in
        pkgs.mkShell {
          buildInputs = [
            pkgs.nixpkgs-fmt
            bun
          ];

          shellHook = ''
            bun i > /dev/null

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

            ct() {
              bun $REPO/src/index.ts -- "$@"
            }

            PROMPT_COMMAND="__prompt_fn"
          '';
        };

      # packages.${system}.default = pkgs.runCommand "creative-toolkit"
      #   {
      #     tk = ''
      #       #!${pkgs.runtimeShell}
      #       exec ${bun}/bin/bun ${./src/index.ts} -- "$@"
      #     '';
      #   } ''
      #   mkdir $out/bin -p
      #   echo "$tk" > "$out/bin/tk"
      #   chmod +x "$out/bin/tk"
      # '';

      # apps.${system}.default = {
      #   type = "app";
      #   program = "${packages.${system}.default}/bin/tk";
      # };
    };
}
