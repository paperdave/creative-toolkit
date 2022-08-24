with builtins;
{ pkgs ? import <nixpkgs> { }
, ...
}:
let
  repo = "https://github.com/CompVis/stable-diffusion";
  checkpoint = "https://cdn-lfs.huggingface.co/repos/4c/37/4c372b4ebb57bbd02e68413d4951aa326d4b3cfb6e62db989e529c6d4b26fb21/fe4efff1e174c627256e44ec2991ba279b3816e364b49f9be2abc0b3ff3f8556";
in
null
# TODO:
# there will be a lot of effort to get this to work, mainly since i need to look into how conda
# works, especially on nixos. also, running conda-install and then activating the env doesnt work
# directly because glib is then missing. so yeah, good luck future dave.
