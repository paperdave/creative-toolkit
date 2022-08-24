{
  description = "";
  inputs = {
    nixpkgs.url = github:NixOS/nixpkgs;
  };
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import "${nixpkgs}" {
        system = "x86_64-linux";
        config.allowUnfree = true;
      };
      arg = pkgs // { inherit flake; };
      flake = rec {
        devShells.${system} = import ./nix/devShell.nix arg;
        packages.${system} = import ./nix/packages.nix arg;
      };
    in
    flake;
}
