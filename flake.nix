{
  description = "";
  inputs = {
    nixpkgs.url = github:NixOS/nixpkgs;
  };
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      arg = pkgs // { inherit flake; };
      flake = rec {
        devShells.${system}.default = import ./nix/devShell.nix arg;
        packages.${system} = import ./nix/packages.nix arg;
      };
    in
    flake;
}
