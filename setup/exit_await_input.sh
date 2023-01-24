#!/bin/bash

# https://www.linuxquestions.org/questions/linux-general-1/how-to-make-shell-script-wait-for-key-press-to-proceed-687491/
read -p "Press any key to continue..." -r -n 1 -s
exit "$1"
