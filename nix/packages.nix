with builtins;
{ pkgs ? import <nixpkgs> { }
, mkFusion ? import ./mkFusion.nix pkgs
, mkBun ? import ./mkBun.nix pkgs
, ...
}:
let ctPackages = rec {
  default = import ./creativeToolkit.nix { inherit pkgs ctPackages; };
  creative-toolkit = default;

  # bun
  bun = mkBun {
    version = "0.1.11";
    asset = "bun-linux-x64";
    hash = "sha256-N3hGPyp9wvb7jjpaFLJcdNIRyLvegjAe+MiV2aMS1nE=";
  };

  # Latest Fusion Studio
  fusion-studio = fusion-studio-18;
  # Latest Fusion Free
  fusion-free = fusion-free-9;

  # Individual major versions of each package. I only am adding the ones here that I can test.
  fusion-studio-18 = mkFusion {
    id = "c723102afaec4a1d98f36e79fe6b4e77";
    version = "18.0.1";
    tarHash = "sha256-KluBKNfRdzlwZ1BuqFMjRxNV9GI02g4ZOUuDMhRL7po=";
  };

  # Broken
  fusion-free-9 = mkFusion {
    id = "8e1149d13d6f4910b15f523f9f43ff48";
    version = "9.0.2";
    tarHash = "13ba6nzb899xlhv9cqpj4cylwypzd2f4hwl5gwzgd229mf39jp3p";
    studio = false;
  };
};
in
ctPackages
