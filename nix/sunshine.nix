# TODO: does not build
with builtins;
{ pkgs ? import <nixpkgs> { }
, ...
}:
pkgs.stdenv.mkDerivation {
  name = "sunshine";
  src = fetchGit {
    url = "https://github.com/loki-47-6F-64/sunshine.git";
    rev = "e4c9c292e57d39136df2d46d1e9b66eba53f3bd3";
    submodules = true;
  };

  nativeBuildInputs = with pkgs; [
    cmake
    pkgconfig
  ];

  buildInputs = with pkgs; [
    openssl
    (boost.override { enableShared = false; enabledStatic = true; })
    # boost
    libpulseaudio
    libopus
    libevdev
    ffmpeg
  ];

  hardeningDisable = [ "all" ];

  configurePhase = ''
    cmake .
  '';

  buildPhase = ''
    make
  '';

  installPhase = ''
    mkdir -p $out/bin
    mv chord $out/bin
  '';
}
