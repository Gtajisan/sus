{ pkgs }: {
  deps = [
    pkgs.libuuid
    pkgs.bashInteractive
    pkgs.nodePackages.bash-language-server
    pkgs.man
  ];
}