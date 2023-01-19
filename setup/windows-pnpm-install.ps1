# Modified from https://pnpm.io/installation#on-windows to use expanded args
Invoke-WebRequest -UseBasicParsing -Uri "https://get.pnpm.io/install.ps1" -OutFile "./setup/temp/install-pnpm-win.ps1"; &"./setup/temp/install-pnpm-win.ps1"
