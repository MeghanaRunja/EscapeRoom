from fastapi import FastAPI

from models import PlayerAction
from router import handle_action
from state import get_state
from fastapi.middleware.cors import CORSMiddleware


# app = FastAPI(
#     title="Escape Room Game Manager"
# )

app = FastAPI(title="Escape Room Game Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # fine for local dev; tighten later if you deploy
    allow_methods=["*"],
    allow_headers=["*"],
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