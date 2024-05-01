# Troubleshooting

!!! warning

    As of March 2024, we have shifted towards running the system on Kubernetes, rather than Docker. These steps still work with the current codebase, but as we fully migrate the codebase to our Kubernetes version, these steps will need to be updated accordingly.

You can view the logs or output of a specific docker container by clicking on its row in the Docker Desktop application.

## Docker Startup

- Docker Engine not started
  - Fix: Docker Desktop probably isn't on; turn it on. If it is on, open the GUI to look for errors.
  - Error message like below:

  ```sh
  error during connect: this error may indicate that the docker daemon is not running: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.24/containers/json?all=1&filters=%7B%22label%22%3A%7B%22com.docker.compose.project%3Dglados-project%22%3Atrue%7D%7D": open //./pipe/docker_engine: The system cannot find the file specified.
  ```

- Docker Desktop perpetually stuck on "Docker Desktop is starting..."
  - [See this stackoverflow post](https://stackoverflow.com/questions/43041331/docker-forever-in-docker-is-starting-at-windows-task)
  - Or [this post](https://brightersidetech.com/docker-desktop-starting-forever-solved/)
  - Or, try manually installing any WSL distribution (ex. Ubuntu, Alpine) through the Microsoft Store
  - Or, try turning off WSL support in optionalfeatures.exe and re-running the Docker Desktop installer so that it re-enables it itself (the approach from [here](https://stackoverflow.com/a/63771669))

- `level=warning msg="The \"FIREBASE_KEY\" variable is not set. Defaulting to a blank string."`
  - You need to obtain or set up a .env file as described in the section above.

<!-- cspell:ignore HRESULT -->
- While building Docker, there might be an exception like this: `Error response from daemon: status code not OK but 500: Unhandled exception: SQLITE_CONSTRAINT_UNIQUE (Exception from HRESULT: 0x87AF0813)`
  - Go to Windows Docker Desktop App > Setting > Resources > File Sharing and add the directory that you have the MonoRepo.
  - Restart your Docker and rebuild it.
  - Check out this [stackoverflow post](https://stackoverflow.com/questions/60754297/docker-compose-failed-to-build-filesharing-has-been-cancelled)

- After building the container, you might run into an error `glados-mongodb exited with code 14
dependency failed to start: container glados-mongodb exited (14)`
  - Go to the Docker Desktop application's Settings > General and check if "User the WSL 2 based engine" checkbox is checked (It should be enabled)

## Shut Down your Local Copy

To stop the system, you must shut down the docker containers. There are a few ways to do this:

- In the repo root, run the command `docker compose down`
- If you did not use the `-d` flag when starting the docker compose, using `Ctrl+C` will shut down the compose and containers.
- Use the Docker Desktop user interface 'Stop' button on the collection

### Correctly Close Docker

Docker is very convenient for modular systems and development,
but unfortunately, it can be quite a memory hog.
In Windows task manager, it will show up as `Vmmem`,
since it's using the WSL2 backend.

Once you're done using it, make sure to 'Quit Docker Desktop' from the tray icon (Windows) when you're done
to get your memory back.

![Quit Docker Desktop](https://i.imgur.com/ko3vFY2.png)
