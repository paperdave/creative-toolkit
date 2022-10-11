# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{ config, pkgs, ... }:
let
  user = "dave";
  passwd = "1234";
in
{
  system.stateVersion = "22.05";
  nix.extraOptions = "experimental-features = nix-command flakes";

  nixpkgs.config.allowUnfree = true;

  imports =
    [
      # Include the results of the hardware scan.
      ./hardware-configuration.nix
    ];

  services.xserver.videoDrivers = [ "nvidia" ];
  hardware.opengl.enable = true;

  boot.supportedFilesystems = [ "ntfs" ];
  boot.loader = {
    systemd-boot.enable = false;
    efi = {
      canTouchEfiVariables = true;
      efiSysMountPoint = "/boot";
    };
    grub = {
      enable = true;
      devices = [ "nodev" ];
      efiSupport = true;
      version = 2;
      useOSProber = true;
      splashImage = pkgs.nixos-artwork.wallpapers.nineish-dark-gray.gnomeFilePath;
      gfxmodeEfi = "2560x1440,1920x1080,auto";
      font = "${pkgs.hack-font}/share/fonts/hack/Hack-Regular.ttf";
      fontSize = 24;
      configurationLimit = 15;
    };
  };

  # Set your time zone.
  time.timeZone = "America/Detroit";

  # Select internationalisation properties.
  i18n.defaultLocale = "en_US.UTF-8";
  # console = {
  #   font = "Lat2-Terminus16";
  #   keyMap = "us";
  #   useXkbConfig = true; # use xkbOptions in tty.
  # };

  # Enable the X11 windowing system.
  services.xserver.enable = true;

  virtualisation.docker.enable = true;
  virtualisation.lxd.enable = true;

  # Enable the GNOME Desktop Environment.
  services.xserver.displayManager.gdm.enable = true;
  services.xserver.desktopManager.gnome.enable = true;

  # Enable CUPS to print documents.
  services.printing.enable = true;

  # Enable sound.
  sound.enable = true;
  hardware.pulseaudio.enable = true;

  programs.fish.enable = true;

  users.defaultUserShell = pkgs.fish;
  users.mutableUsers = false;
  users.users.root.initialPassword = passwd;
  users.users.${user} = {
    isNormalUser = true;
    initialPassword = passwd;
    extraGroups = [ "wheel" "docker" "plugdev" "lxd" ];
    packages = with pkgs; [
      firefox
      microsoft-edge
      discord
      nodejs-18_x
      thunderbird
      vscode
      git
      obsidian
      neofetch
      tree
      (blender.override { cudaSupport = true; })
    ];
  };
  security.sudo.wheelNeedsPassword = false;

  environment.etc."machine-id".source = "/nix/persist/etc/machine-id";
  environment.etc."nixos".source = "/nix/persist/etc/nixos";
  environment.etc."ssh/ssh_host_ed25519_key".source = "/nix/persist/etc/ssh/ssh_host_ed25519_key";
  environment.etc."ssh/ssh_host_ed25519_key.pub".source = "/nix/persist/etc/ssh/ssh_host_ed25519_key.pub";
  environment.etc."ssh/ssh_host_rsa_key".source = "/nix/persist/etc/ssh/ssh_host_rsa_key";
  environment.etc."ssh/ssh_host_rsa_key.pub".source = "/nix/persist/etc/ssh/ssh_host_rsa_key.pub";
  environment.sessionVariables.NIXPKGS_ALLOW_UNFREE = "1";

  services.udev.extraRules = ''
    KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="096e", ATTRS{idProduct}=="0201", TAG+="uaccess"
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="096e", ATTRS{idProduct}=="0201", MODE="0666", GROUP="plugdev"
  '';

  hardware.enableRedistributableFirmware = true;

  networking.hostName = "zenith";
  networking.nameservers = [ "1.1.1.1" ];
  networking.firewall.enable = false;

  services.openssh = {
    enable = true;
    passwordAuthentication = false;
  };
  services.syncthing = {
    enable = true;
    dataDir = "/shared";
    configDir = "/shared/.config";
    group = "users";
    inherit user;
    overrideFolders = false;
    overrideDevices = false;
  };

  xdg.mime.enable = true;
  xdg.mime.defaultApplications = {
    "text/html" = "microsoft-edge.desktop";
    "x-scheme-handler/http" = "microsoft-edge.desktop";
    "x-scheme-handler/https" = "microsoft-edge.desktop";
    "x-scheme-handler/about" = "microsoft-edge.desktop";
    "x-scheme-handler/unknown" = "microsoft-edge.desktop";
  };
}
