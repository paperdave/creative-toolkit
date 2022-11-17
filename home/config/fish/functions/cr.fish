
function cr -d "Code Repo" -a repo
  set dir (pwd)

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
    printf "\nusage: cr <repo or url>\n"
    return
  end

  sr "$repo"
  code .

  cd $dir
end
