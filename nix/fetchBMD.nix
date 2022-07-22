# Part of this file is based on
# https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/video/davinci-resolve/default.nix
{ pkgs ? import <nixpkgs> { }, ... }:
{ platform ? "Linux"
, product
, id
, sha256
}:
pkgs.runCommandLocal "${product}-src.tar"
rec {
  outputHash = sha256;
  outputHashAlgo = "sha256";
  outputHashMode = "flat";

  impureEnvVars = pkgs.lib.fetchers.proxyImpureEnvVars;

  nativeBuildInputs = [ pkgs.curl ];

  # ENV VARS
  SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";

  SITEURL = "https://www.blackmagicdesign.com/api/register/us/download/${id}";

  USERAGENT = builtins.concatStringsSep " " [
    "User-Agent: Mozilla/5.0 (X11; Linux ${pkgs.targetPlatform.linuxArch})"
    "AppleWebKit/537.36 (KHTML, like Gecko)"
    "Chrome/77.0.3865.75"
    "Safari/537.36"
  ];

  REQJSON = builtins.toJSON {
    platform = "Linux";
    policy = true;
    firstname = "NixOS";
    lastname = "Linux";
    email = "someone@nixos.org";
    phone = "+31 71 452 5670";
    country = "nl";
    state = "Province of Utrecht";
    city = "Utrecht";
    product = product;
  };

} ''
  DOWNLOAD_URL=$(curl \
    -s \
    -H 'Host: www.blackmagicdesign.com' \
    -H 'Accept: application/json, text/plain, */*' \
    -H 'Origin: https://www.blackmagicdesign.com' \
    -H "$USERAGENT" \
    -H 'Content-Type: application/json;charset=UTF-8' \
    -H "Referer: https://www.blackmagicdesign.com/support/download" \
    -H 'Accept-Encoding: gzip, deflate, br' \
    -H 'Accept-Language: en-US,en;q=0.9' \
    -H 'Authority: www.blackmagicdesign.com' \
    -H 'Cookie: _ga=GA1.2.1849503966.1518103294; _gid=GA1.2.953840595.1518103294' \
    --data-ascii "$REQJSON" \
    --compressed \
    "$SITEURL")

  curl \
    --retry 3 --retry-delay 3 \
    -H "Host: sw.blackmagicdesign.com" \
    -H "Upgrade-Insecure-Requests: 1" \
    -H "$USERAGENT" \
    -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8" \
    -H "Accept-Language: en-US,en;q=0.9" \
    --compressed \
    "$DOWNLOAD_URL" \
    > $out
''
