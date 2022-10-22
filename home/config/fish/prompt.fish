function __print_git_info
  # if not in a git repo, don't do anything
  if not git rev-parse --is-inside-work-tree &> /dev/null
    return
  end

  # get the current branch
  set branch (git rev-parse --abbrev-ref HEAD)

  # if branch is main or master, don't print it
  if test "$branch" = "main" -o "$branch" = "master"
    return
  end

  printf (set_color brmagenta)"(%s)" "$branch"
end

function fish_prompt
  printf (set_color reset)(set_color grey)

  printf "\n\033[1F"

  switch $PWD
  case "$HOME*"
    printf "~"(string sub -s (math (string length $HOME) + 1) $PWD)
  case "/code/*"
    # split
    set -l split (string split / $PWD)
    if test (count $split) = 3
      printf "\n\n"(set_color white)"repos locally\n"
      set -l repos (ls -1 /code/$split[3])
      for repo in $repos
        printf -- (set_color white)"- "(set_color cyan)"$repo\n"
      end
      printf "\033["(math (count $repos) + 3)"F"
      printf (set_color grey)"/code/"(set_color brgreen)$split[3]
    else
      printf (set_color brblue)$split[4]
      __print_git_info
      printf (set_color grey)(string sub -s (math (string length /code/$split[3]/$split[4]) + 1) $PWD)
    end
  case '*'
    printf "$PWD"
    __print_git_info
  end

  printf (set_color brwhite)" \$ "
end

function __clear_rest --on-event fish_preexec --on-event fish_exit
  printf "\033[0J\r"(set_color reset)
end
