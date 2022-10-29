#!/bin/sh
PLAYER="spotify"

FORMAT="{{ title }} - {{ artist }}"

C_PLAY="$1"
C_PAUSE="$2"

mapStatus() {
    while IFS= read -r line
    do
        status=$(playerctl -p $PLAYER status)
        if [ "$status" = "Stopped" ]; then
            echo "No music is playing"
        elif [ "$status" = "Paused" ]; then
            playerctl --player=$PLAYER metadata --format "%{F$C_PAUSE} $FORMAT"
        elif [ "$status" = "No player is running"  ]; then
            echo ""
        else
            playerctl --player=$PLAYER metadata --format "%{F$C_PLAY} $FORMAT"
        fi
    done
}

playerctl -Fp $PLAYER status 2>/dev/null | mapStatus &
playerctl -Fp $PLAYER metadata mpris:trackid 2>/dev/null | mapStatus
