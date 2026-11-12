"""Sends experiment notification emails through the Gmail API.

This lives in the backend so that the Gmail credentials never have to be given to runner Pods,
where user-submitted code could read them.
"""
import base64
import json
import logging
import os
import urllib.parse
import urllib.request
from email.mime.text import MIMEText

GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"
REQUEST_TIMEOUT_SECONDS = 15

logger = logging.getLogger(__name__)


def build_message(recipient: str, experiment: dict, status: str) -> dict:
    """Builds the Gmail API payload. Counts come from the database, not from the runner request."""
    text = (
        f"Experiment stats: \n\n Status: {status}\n\n Passes: {experiment.get('passes', 0)}\n\n"
        f" Fails: {experiment.get('fails', 0)}\n\n Thank you for using GLADOS!\n\n")
    message = MIMEText(text)
    message['to'] = recipient
    message['subject'] = f"GLADOS Experiment: {experiment.get('name', '')}"
    return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}


def _post(url: str, data: bytes, headers: dict) -> dict:
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:  # nosec B310 - fixed https URLs
        return json.loads(response.read().decode("utf-8"))


def _access_token(creds: dict) -> str:
    token_uri = creds.get('token_uri') or DEFAULT_TOKEN_URI
    if not token_uri.startswith("https://"):
        raise ValueError("GMAIL_CREDS token_uri must use https")
    form = urllib.parse.urlencode({
        'grant_type': 'refresh_token',
        'refresh_token': creds.get('refresh_token'),
        'client_id': creds.get('client_id'),
        'client_secret': creds.get('client_secret'),
    }).encode("utf-8")
    response = _post(token_uri, form, {'Content-Type': 'application/x-www-form-urlencoded'})
    return response['access_token']


def send_experiment_email(experiment: dict, status: str) -> bool:
    """Emails the experiment creator. Returns True if the message was handed to Gmail."""
    recipient = experiment.get('creatorEmail')
    if not recipient:
        logger.warning("Experiment has no creator email, not sending a notification")
        return False
    creds_json = os.getenv('GMAIL_CREDS')
    if not creds_json:
        logger.warning("GMAIL_CREDS is not set, not sending a notification")
        return False
    try:
        access_token = _access_token(json.loads(creds_json))
        body = json.dumps(build_message(recipient, experiment, status)).encode("utf-8")
        _post(GMAIL_SEND_URL, body, {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        })
        return True
    except Exception as err:  # pylint: disable=broad-exception-caught
        # Log only the error type, the message could contain credential details
        logger.error("Failed to send notification email: %s", type(err).__name__)
        return False
