if not status is-interactive
  return
end

set fish_greeting
source ~/.config/fish/prompt.fish
export LS_COLORS="$(vivid generate snazzy)"
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH

alias ssh="kitty +kitten ssh"
alias zr="zig run"

set --export PATH $HOME/.bin $PATH
