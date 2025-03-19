# Use the official .NET SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set the working directory
WORKDIR /app

# Copy the project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy the rest of the application code
COPY . ./

# Build the application
RUN dotnet publish -c Release -o out

# Use the official .NET runtime image to run the application
FROM mcr.microsoft.com/dotnet/runtime:8.0

# Set the working directory
WORKDIR /app

# Copy the built application from the build image
COPY --from=build /app/out .

# Install Python 3.8
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3.8 \
        python3-pip \
        python3-setuptools \
        python3-wheel \
        python3-dev

# Install the only python dependency, pipreqs
RUN pip3 install pipreqs

# Install Java, default-jdk is a metapackage that installs the default JDK
RUN apt-get install -y --no-install-recommends \
    default-jdk

# Ability to pass in JVM options
ARG JAVA_OPTS
ENV JAVA_OPTS=$JAVA_OPTS

# Keeps Python from generating .pyc files in the container
# This doesn't benefit the performance of the system
# https://stackoverflow.com/questions/59732335/is-there-any-disadvantage-in-using-pythondontwritebytecode-in-docker
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

# Define the entry point for the application
ENTRYPOINT ["dotnet", "GladosRunner.dll"]