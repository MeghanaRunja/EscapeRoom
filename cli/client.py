import requests

MANAGER_URL = "http://127.0.0.1:8000"


def send_action(action, target=None, message=None):

    payload = {
        "action": action,
        "target": target,
        "message": message
    }

    response = requests.post(
        f"{MANAGER_URL}/action",
        json=payload
    )

    return response.json()


def get_state():

    response = requests.get(
        f"{MANAGER_URL}/state"
    )

    return response.json()