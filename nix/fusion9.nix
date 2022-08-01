# This used to work, it doesnt anymore. Here for reference
with builtins;
{ pkgs ? import <nixpkgs> { }
, ...
}:
let
  fetchBMD = import ./fetchBMD.nix pkgs;

  fusion = pkgs.stdenv.mkDerivation rec {
    pname = "fusion";
    version = "9.0.2";

    src = fetchBMD {
      product = "Fusion";
      id = "8e1149d13d6f4910b15f523f9f43ff48";
      hash = "13ba6nzb899xlhv9cqpj4cylwypzd2f4hwl5gwzgd229mf39jp3p";
    };

    nativeBuildInputs = with pkgs; [ autoPatchelfHook ];
    buildInputs = with pkgs; [
      appimageTools.appimage-exec
      xorg.libxcb
      xorg.libX11
      xorg.libICE
      xorg.libSM
      xorg.libXrender
      xorg.libXext
      freetype
      libuuid
      fontconfig
      glib
      zlib
      libglvnd
      bzip2
      gcc
      libGLU
      alsaLib
      glib
      ocl-icd
    ];

    unpackPhase = ''
      run="Blackmagic_Fusion_Linux_9.0.2_installer.run"

      tar -xf "$src"
      appimage-exec.sh -x "$out" "$run"
      rm "$run"

      cd "$out"

      rm ./FusionInstaller
      rm ./FusionInstaller.desktop
      rm ./AppRun
    '';
    dontBuild = true;
    dontInstall = true;
  };

  run = pkgs.steamPackages.steam-fhsenv.passthru.run;

  fusionRunner = pkgs.writeShellScript "fusion-run" ''
    cd ${fusion}
    ${run}/bin/steam-run env LD_LIBRARY_PATH=/run/opengl-driver/lib:${fusion} QT_XKB_CONFIG_ROOT=${pkgs.xkeyboard_config}/share/X11/xkb LUA_PATH=$HOME/.fusion/BlackmagicDesign/Fusion/Modules/Lua/?.lua $*
  '';
in
pkgs.runCommand "fusion-free-9.0.2" { } ''
  mkdir -p $out/bin
  ln -s ${pkgs.writeShellScript "fusion-wrapper" "${fusionRunner} ./Fusion $*"} $out/bin/fusion
  ln -s ${pkgs.writeShellScript "fusion-server-wrapper" "${fusionRunner} ./FusionServer $*"} $out/bin/fusion-server
  ln -s ${pkgs.writeShellScript "fuscript-wrapper" "${fusionRunner} ./fuscript $*"} $out/bin/fuscript
''
