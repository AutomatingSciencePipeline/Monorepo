# For more information, please refer to https://aka.ms/vscode-docker-python
FROM python:3.8-slim

# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

RUN apt-get update

#Ths should also get Java 11?
RUN apt-get install default-jdk -y
ARG JAVA_OPTS
ENV JAVA_OPTS=$JAVA_OPTS

# For file type identification via bytes
RUN apt-get install libmagic1 -y

# RUN apt-get update && \
#       apt-get -y install sudo

# Install pip requirements
COPY requirements.txt .
RUN python -m pip install -r requirements.txt

WORKDIR /app
COPY . /app

# Creates a non-root user with an explicit UID and adds permission to access the /app folder
# For more info, please refer to https://aka.ms/vscode-docker-python-configure-containers
# RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
# RUN usermod -aG sudo appuser
# USER appuser
# RUN chmod -R a=rwx /app

USER root

# During debugging, this entry point will be overridden. For more information, please refer to https://aka.ms/vscode-docker-python-debug 

# Copy in the startup script
COPY start.sh .

CMD ["bash", "start.sh"]
