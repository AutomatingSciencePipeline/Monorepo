# Use the universal base image
# This image includes a number of runtime versions for popular languages like Python, Node, PHP, Java, Go, C++, Ruby, and .NET Core/C#.
FROM mcr.microsoft.com/devcontainers/universal:2

# Install kubectl 
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
RUN install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Minikube
RUN curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64 && install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64

# Install ctlptl
RUN CTLPTL_VERSION="0.8.38" && \
    curl -fsSL https://github.com/tilt-dev/ctlptl/releases/download/v$CTLPTL_VERSION/ctlptl.$CTLPTL_VERSION.linux.x86_64.tar.gz | tar -xzv -C /usr/local/bin ctlptl

# Install Tilt
RUN curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash