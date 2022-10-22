#!/bin/bash
ls -hF --hyperlink=always --color -log --time-style=+$'\e[90m|\e[39m' $1|sed 's/^\([^ ][^ ]*\)  *[^ ][^ ]* /\x1B[90m\1 \x1B[95m\x1B[1m/'
