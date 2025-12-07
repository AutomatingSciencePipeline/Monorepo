FROM python:3.12-slim

WORKDIR /code 

COPY ./requirements.txt /code/requirements.txt 
RUN pip install --no-cache-dir -r /code/requirements.txt 

COPY ./runner.py /code/runner.py 
COPY ./server.py /code/server.py 
COPY ./core /code/core 

EXPOSE 8000

# ENV PYTHONUNBUFFERED=1

# CMD ["python", "server.py", "Test_token"]
