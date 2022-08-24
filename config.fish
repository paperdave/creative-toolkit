set fish_greeting

set REPO $PWD

function ctb
  bun $REPO/src/index.ts $argv
end

function ct
  node $REPO/dist/cli.js $argv
end

function fish_prompt
  printf (set_color brmagenta)"ct"
  set branch (string sub -s 3 (git branch))
  if test "$branch" != "main"
    printf (set_color magenta)"/$branch"
  end
  printf (set_color grey)" "
  if string match "$REPO/*" "$PWD" -q
    printf "."(string sub -s (math (string length $REPO) + 1) "$PWD")
  else if string match "$HOME/*" "$PWD" -q
    printf "~"(string sub -s (math (string length $HOME) + 1) "$PWD")
  else
    printf "$PWD"
  end
  printf (set_color brwhite)" \$ \n"
end