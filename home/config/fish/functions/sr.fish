
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
