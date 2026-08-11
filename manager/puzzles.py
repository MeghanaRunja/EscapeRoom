from inventory import has_item
from state import game_state

def unlock_door():
    if has_item("keycard"):
        game_state["puzzles"]["door_unlocked"] = True
        return {
            "message": "door unlocked. You are free"
        }
    else:
        return {
            "message": "You do not have the right item. Search for it"
        }

def open_vent():
    if has_item("screwdriver"):
        game_state["puzzles"]["open_vent"] = True
        return {
            "message": "vent unlocked."
        }
    else:
        return {
            "You do not have the right item. Search for it"
        }
        
def unlock_computer():
    if has_item("password"):
        game_state["puzzles"]["unlock_computer"] = True
        return {
            "message": "Computer unlocked. This is a distraction"
        }
    else:
        return {
            "You do not have the right item. Search for it"
        }