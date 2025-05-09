import logging
import os
import json
import base64
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from modules.logging.gladosLogging import get_experiment_logger

explogger = get_experiment_logger()

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def gmail_auth_from_env():
    # Load json GMAIL_CREDS from environment variable
    creds_json = os.getenv('GMAIL_CREDS')
    if creds_json is None:
        raise ValueError("GMAIL_CREDS environment variable not set")
    creds_dict = json.loads(creds_json)
    creds = Credentials(
        token=None,
        refresh_token=creds_dict.get('refresh_token'),
        token_uri=creds_dict.get('token_uri'),
        client_id=creds_dict.get('client_id'),
        client_secret=creds_dict.get('client_secret'),
        scopes=SCOPES)
    service = build('gmail', 'v1', credentials=creds)
    return service

def create_message(to, subject, message_text):
    message = MIMEText(message_text)
    message['to'] = to
    message['subject'] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {'raw': raw}

def send_message(service, user_id, message):
    try:
        sent_message = service.users().messages().send(userId=user_id, body=message).execute()
        print(f"Message Id: {sent_message['id']}")
        return sent_message
    except Exception as e:
        explogger.error(f"An error occurred: {e}")
        return None

# Usage
def send_email(experiment):
    service = gmail_auth_from_env()
    message = create_message(experiment.creatorEmail, f'GLADOS Experiment: {experiment.name}', f'Experiment stats: \n\n Status: {experiment.status}\n\n Passes: {experiment.passes}\n\n Fails: {experiment.fails}\n\n Thank you for using GLADOS!\n\n')
    send_message(service, "me", message)
