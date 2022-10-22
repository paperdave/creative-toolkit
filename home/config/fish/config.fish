if not status is-interactive
  return
end

set fish_greeting

export LS_COLORS="$(vivid generate snazzy)"

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

function sr -d "Switch Repo" -a repo
  # if no repo is passed, list all repos
  if test -z "$repo"
    for username in (ls -1 /code)
      printf (set_color brgreen)"$username\n"
      set -l repos (ls -1 /code/$username)
      for i in (seq (count $repos))
        printf (set_color grey)" "
        if test $i = (count $repos)
          printf "└─ "
        else
          printf "├─ "
        end
        printf (set_color brcyan)$repos[$i]"\n"
      end
    end
    printf "\nusage: sr <repo or url>\n"
    return
  end

  # if repo is a http, https, git, or ssh url.
  set -l match (string match -r "^(?:git\@github.com:|https?:\/\/github.com\/)?([^\/]+)\/(.*?)(\.git)?\$" "$repo")
  if test -n "$match"
    set username $match[2]
    set reponame $match[3]
  else if string match -r "^(.*:\/\/|git\@)" "$repo" -q
    printf (set_color red)"unsupported repo url\n"
    return
  else
    # searching
    set -l findings (find /code -maxdepth 2 | grep '/code/.*/' | grep -i "$repo")
    switch (count $findings)
    case 0
      printf (set_color red)"could not find \"$repo\"\n"
    case 1
      cd $findings
    case '*'
      printf (set_color red)"found multiple repos:\n"
      for n in (seq (count $findings))
        set -l pathSplit (string split / $findings[$n])
        printf (set_color grey)"  [$n] "(set_color brgreen)"@"$pathSplit[3](set_color grey)"/"(set_color brcyan)$pathSplit[4]"\n"
      end
      read -P (set_color grey)"which one? "(set_color white) choice
      cd $findings[$choice]
    end
    return
  end
   
  if not test -d "/code/$username/$reponame"
    if test -z "$repourl"
      set repourl "git@github.com:$username/$reponame.git"
    end

    printf (set_color yellow)"cloning $username/$reponame ...\n"(set_color grey)
    mkdir -p /code/$username
    git clone $repourl /code/$username/$reponame
  end

  cd /code/$username/$reponame
end

function ll -d "List Long (pretty)"
  bash ~/.config/fish/ll.sh
end
function lld -d "List Long (pretty+date)"
  bash ~/.config/fish/lld.sh
end
