with builtins;
{ pkgs ? import <nixpkgs> { }
, ...
}:
{ version, asset, hash }:
(pkgs.bun.overrideAttrs (old: {
  inherit version;
  src = pkgs.fetchurl {
    url = "https://github.com/oven-sh/bun/releases/download/bun-v${version}/${asset}.zip";
    hash = hash;
  };
}))
