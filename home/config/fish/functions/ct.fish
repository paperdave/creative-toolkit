function ct -d "Creative Toolkit"
  bun (dirname (status --current-filename))/../../../../src/cmd-runner/cli.ts $argv
end
