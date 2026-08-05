from puzzles import unlock_door, open_vent, unlock_computer
from inventory import add_item, has_item
from agents.guard.main import main as gmain
from agents.robot.main import main as rmain
from agents.scientist.main import main as smain

def search_object(object):
    match object:
        case "computer":
            return {
                "message":
                "You found a computer. Do you have the password?"
            }
        case "vent":
            if has_item("screwdriver"):
                add_item("keycard")
                return {
                    "message":
                    "You found a keycard."
                }
            else:
                return{
                    "message":
                    "the vent is closed."
                }
        case "desk":
            add_item("screwdriver")
            return {
                "message":
                "You found a screwdriver."
            }
        case _:
            return {
                    "message":
                    "Nothing found."
                }
        
def use_item(object):
    match object:
        case "computer":
            return unlock_computer()
        case "vent":
            if has_item("screwdriver"):
                return open_vent()
            return {"message": "The vent won't budge without a tool."}
        case "door":
            return unlock_door()
        case _:
            return {
                "message": "You do not have the right item to use on this object."
            }

def talk_to_agent(agent):
    match agent:
        case "guard":
            return gmain()
        case "robot":
            return rmain()
        case "scientist":
            return smain()
