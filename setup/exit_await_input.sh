#!/bin/bash

# Make a terminal ding noise if error
if [ "$1" -gt 0 ]; then
    tput bel
fi

# https://www.linuxquestions.org/questions/linux-general-1/how-to-make-shell-script-wait-for-key-press-to-proceed-687491/
read -p "Press any key to exit..." -r -n 1 -s
exit "$1"
