set fish_greeting

set REPO $PWD

function ctb
  set startTime (date +%s%N | cut -b1-13)
  bun $REPO/dist/cli.js $argv
  echo "ct bun took "(math (date +%s%N | cut -b1-13) - $startTime)"ms"
end

function ct
  set startTime (date +%s%N | cut -b1-13)
  node $REPO/dist/cli.js $argv
  echo "ct took "(math (date +%s%N | cut -b1-13) - $startTime)"ms"
end

function fish_prompt
  printf (set_color brmagenta)"ct"
  set branch (string sub -s 3 (git --git-dir="$REPO/.git" branch | grep '*'))
  if test "$branch" != "main"
    printf (set_color red)"/$branch"
  end
  printf (set_color grey)" "
  if test "$REPO" = "$PWD"
    :
  else if string match "$REPO/*" "$PWD" -q
    printf "."(string sub -s (math (string length $REPO) + 1) "$PWD")" "
  else if string match "$HOME/*" "$PWD" -q
    printf "~"(string sub -s (math (string length $HOME) + 1) "$PWD")" "
  else
    printf "$PWD "
  end
  printf (set_color brwhite)"\$ \n"
end

function run
  bun run $argv
end