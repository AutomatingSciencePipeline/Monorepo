# Use the universal base image
# This image includes a number of runtime versions for popular languages like Python, Node, PHP, Java, Go, C++, Ruby, and .NET Core/C#.
FROM mcr.microsoft.com/devcontainers/universal:2

# Install Minikube
RUN curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64 && install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64

# Install ctlptl
RUN CTLPTL_VERSION="0.8.40" && \
    curl -fsSL https://github.com/tilt-dev/ctlptl/releases/download/v$CTLPTL_VERSION/ctlptl.$CTLPTL_VERSION.linux.x86_64.tar.gz | tar -xzv -C /usr/local/bin ctlptl

# Install Tilt
RUN curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash

CMD while sleep 120 && ps aux | egrep 'vscode.*[b]ootstrap-fork.*extensionHost.*' > /dev/null; do :; done