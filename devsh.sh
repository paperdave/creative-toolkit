REPO="$PWD"

__prompt_fn() {
  PS1="\[\e[95m\]creative-toolkit\[\e[97m\]"

  if [[ "$PWD" == "$REPO"* ]]; then
    PS1="${PS1}\[\e[94m\]${PWD/#$REPO/}"
  else
    PS1="${PS1}:\[\e[93m\]$PWD"
  fi

  PS1="${PS1} \[\e[97m\]$\[\e[0m\] "
}

ct() {
  bun $REPO/src/index.ts -- "$@"
}

PROMPT_COMMAND="__prompt_fn"