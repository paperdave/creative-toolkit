with builtins;
{ pkgs ? import <nixpkgs> { }
, ctPackages
, ...
}:
pkgs.stdenv.mkDerivation rec {
  pname = "creative-toolkit";
  version = (builtins.fromJSON (builtins.readFile ../package.json)).version;
}
