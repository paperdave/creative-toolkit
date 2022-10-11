with builtins;
{ pkgs ? import <nixpkgs> { }
, mkFusion ? import ./mkFusion.nix pkgs
, mkBun ? import ./mkBun.nix pkgs
, mkBlender ? import ./mkBlender.nix pkgs
, ...
}:
let ctPackages = rec {
  default = import ./creativeToolkit.nix { inherit pkgs ctPackages; };
  creative-toolkit = default;

  # sunshine
  sunshine = import ./sunshine.nix { inherit pkgs ctPackages; };

  # bun
  bun = mkBun {
    version = "0.1.11";
    asset = "bun-linux-x64";
    hash = "sha256-N3hGPyp9wvb7jjpaFLJcdNIRyLvegjAe+MiV2aMS1nE=";
  };

  # Latest Fusion Studio
  fusion-studio = fusion-studio-18;

  # Individual major versions of each package. I only am adding the ones here that I can test.
  # TODO: 18.0.2
  fusion-studio-18 = mkFusion {
    id = "c723102afaec4a1d98f36e79fe6b4e77";
    version = "18.0.1";
    tarHash = "sha256-KluBKNfRdzlwZ1BuqFMjRxNV9GI02g4ZOUuDMhRL7po=";
  };

  blender-alpha = pkgs.blender.overrideAttrs (old: {
    cudaSupport = true;
    buildInputs = old.buildInputs ++ [ pkgs.libepoxy ];
    src = pkgs.fetchgit {
      name = "blender";
      url = "https://github.com/blender/blender";
      rev = "9cd99684b02e83b60821497ed749258a6c03d922";
      sha256 = "sha256-ITiI0i1xLP/bbR+Xy/CwmnbPIbFNSzvS9pIcER6Oz0A=";
      deepClone = true;
    };
  });
};
in
ctPackages
