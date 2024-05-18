# Assorted Troubleshooting

Here's a bunch of ctrl-f'able error messages and how we've fixed them in the past.

## Activate.ps1 bash error

VSCode terminal contains: `apps/backend/.venv/Scripts/Activate.ps1 bash: syntax error near unexpected token &`

This is caused by VSCode opening a bash terminal as its default terminal type (as configured by our workspace settings) but still trying to run the Powershell script for venv activation for some reason. It can be ignored, and worked around by opening a new terminal instance with the plus button.

## Next SWC

Container logs contains:

<!-- cspell:ignore gnux -->
```bash
glados-frontend  | info  - Using wasm build of next-swc
glados-frontend  | warn  - Attempted to load @next/swc-linux-x64-gnu, but it was not installed
glados-frontend  | warn  - Attempted to load @next/swc-linux-x64-gnux32, but it was not installed
glados-frontend  | warn  - Attempted to load @next/swc-linux-x64-musl, but it was not installed
```

This does not actively seem to break anything, but it could cause the frontend hot reloading to be slower than it could be.
It might be related to the fact that we're using a Windows host machine, and the container is Linux.

<!-- cspell:ignore caniuse -->
## browserslist: caniuse-lite is outdated

Container logs contains:

```bash
Browserslist: caniuse-lite is outdated. Please run:
glados-frontend  |   npx update-browserslist-db@latest
glados-frontend  |   Why you should do it regularly: https://github.com/browserslist/update-db#readme
```

TODO this doesn't actually update it

Run `bash dev-install.sh` to update dependencies, including the browserslist database.

TODO `npx update-browserslist-db@latest`?

## Error: While importing 'app', an ImportError was raised

This is an annoying error to troubleshoot.
The message so vague because flask is the "thing" running our code, not python directly.
More info: <https://stackoverflow.com/a/71669914/12693560>

A few approaches to finding the actual error:

- Use the VSCode Run and Debug task "Debug Backend" to have Flask run the file on your local machine with the debugger attached, which will let you see the error stacktrace
  - Example: ![ImageExample](https://i.imgur.com/WfTgUG0.png)
- Manually run the python file on your local machine (instead of having Flask run it for you)
  - The VSCode Run and Debug task "Python: Current File (in Backend App)" can help with this
- Add a ton of logging calls to the top of `app.py` so you can tell how "far it gets" and track down which import is causing the problem

## Docker: Bind for 0.0.0.0:27017 failed: port is already allocated

Make sure that you don't have more than one container trying to use the same port.

Also, make sure something else on your computer isn't using the port.

On windows, in **command prompt, not powershell**: `netstat -ano | find "27017"`

If nothing shows up, try restarting docker desktop.

## Docker containers stop responding and refuse to be killed or restarted

This glitched state will prevent you from closing Docker Desktop normally because it keeps trying to close containers first.

Terminate WSL via `wsl --shutdown` in powershell.
Note that this will cause Docker Desktop to stop displaying your containers in the list -
this is a visual bug only; your container definitions still exist.
After running the command you'll be able to quit docker desktop normally.

After it fully closes, open it again and it will turn WSL back on as it starts.
