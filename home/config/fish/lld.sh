#!/bin/bash
# backport
ls -hF --hyperlink=always --color -log --time-style=+$'\e[0m\e[33m%F \e[93m%H:%M \e[90m|\e[39m' $1|sed 's/^\([^ ][^ ]*\)  *[^ ][^ ]* /\x1B[35m\1 \x1B[95m\x1B[1m/'
