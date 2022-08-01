with builtins;
{ pkgs ? import <nixpkgs> { }
, fetchBMD ? import ./fetchBMD.nix pkgs
, ...
}:
{ id
, version
, tarHash
, studio ? true
,
}:
let
  lib = pkgs.lib;

  udevRules = ''
    # BMD hardware (such as Speed Editor)
    KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1edb", TAG+="uaccess"
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="1edb", MODE="0666", GROUP="plugdev"

    # Fusion Activation Dongle
    KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="096e", ATTRS{idProduct}=="0201", TAG+="uaccess"
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="096e", ATTRS{idProduct}=="0201", MODE="0666", GROUP="plugdev"
  '';

  major = elemAt (splitVersion version) 0;
in
pkgs.stdenv.mkDerivation rec {
  pname = if studio then "fusion-studio" else "fusion-free";
  inherit version;

  nativeBuildInputs = with pkgs; [
    appimageTools.appimage-exec
    addOpenGLRunpath
    autoPatchelfHook
  ];

  autoPatchelfIgnoreMissingDeps = [ "libcuda.so.1" ];

  buildInputs = with pkgs; [
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
    libGLU
    alsaLib
    curl
    ocl-icd
  ];

  src = fetchBMD {
    product = "Fusion";
    id = id;
    hash = tarHash;
  };

  setSourceRoot = ''
    sourceRoot=$PWD
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out/opt/"
    mkdir -p "$out/bin/"
    mkdir -p "$out/share/applications/"

    getBinWrapper() {
      echo "#!${pkgs.runtimeShell}"
      echo "export PATH=${pkgs.python3}/bin:"'$PATH'
      echo "export PATH=${pkgs.python2}/bin:"'$PATH'
      echo "export QT_XKB_CONFIG_ROOT=${pkgs.xkeyboard_config}/share/X11/xkb"
      echo "export LUA_PATH=$HOME/.fusion/BlackmagicDesign/Fusion/Modules/Lua/?.lua"
      echo "export LD_LIBRARY_PATH=/run/opengl-driver/lib:"'$LD_LIBRARY_PATH'
      echo "exec $out/opt/$1"' "$@"'
    }

    # Fusion Studio
    fusion="$out/opt/Fusion${major}"
    appimage-exec.sh -x "$fusion" Blackmagic_Fusion${if studio then "_Studio" else ""}_Linux_${version}_installer.run
    rm $fusion/FusionInstaller
    rm $fusion/FusionInstaller.desktop
    rm $fusion/AppRun

    getBinWrapper Fusion${major}/Fusion > $out/bin/fusion
    ln -s $out/bin/fusion $out/bin/fusion${major}
    getBinWrapper Fusion${major}/FusionServer > $out/bin/fusion-server
    ln -s $out/bin/fusion-server $out/bin/fusion${major}-server
    getBinWrapper Fusion${major}/fuscript > $out/bin/fuscript
    ln -s $out/bin/fusion-server $out/bin/fuscript${major}

    cat $fusion/Fusion.desktop | sed -e "s|/opt/BlackmagicDesign/Fusion${major}|$fusion|" > $out/share/applications/Fusion${major}.desktop
    rm $fusion/Fusion.desktop
    mv $fusion/Fusion.directory $out/share/applications/Fusion.directory

    chmod +x $out/bin/*

    runHook postInstall
  '';

  dontBuild = true;
  dontStrip = true;

  postFixup = ''
    for program in $(find "$out" -type f); do
      isELF "$program" || continue
      echo Patching: $program
      addOpenGLRunpath "$program"
    done
  '';

  meta = with lib; {
    description =
      "GPU accelerated 2D and 3D compositing and motion graphics software.";
    homepage = "https://www.blackmagicdesign.com/products/fusion";
    license = licenses.unfree;
    maintainers = with maintainers; [ ];
    platforms = platforms.linux;
  };
}

