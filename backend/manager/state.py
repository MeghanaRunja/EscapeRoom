## This is the game state. The initial game state starts in the lab
## however from, the lab --> office --> control room --> exit door

# from inventory import *

game_state = {

    "location": "laboratory",

    "inventory": [],

    "objects": ["desk", "computer", "vent", "door"],

    "puzzles": {

        "found_keycard": False,

        "door_unlocked": False,

        "open_vent": False,

        "unlock_computer": False
    },

    "trust": {

        "scientist": 0,

        "robot": 0,

        "guard": 0
    }
}

def get_state():

    return game_state