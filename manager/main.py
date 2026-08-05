from fastapi import FastAPI

from models import PlayerAction
from router import handle_action
from state import get_state


app = FastAPI(
    title="Escape Room Game Manager"
)


@app.post("/action")
def action(player_action: PlayerAction):

    result = handle_action(player_action)

    return {
        "result": result,
        "state": get_state()
    }


@app.get("/state")
def state():

    return get_state()