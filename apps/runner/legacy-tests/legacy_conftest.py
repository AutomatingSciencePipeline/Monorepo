#the purpose of this file is create the configuration for opening hte docker file 
import os
import pytest


@pytest.fixture(scope="session")
def docker_compose_file(pytestconfig):
    return os.path.join(str(pytestconfig.rootdir), "mycustomdir", "docker-compose.yml")