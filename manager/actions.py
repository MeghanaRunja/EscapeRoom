import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from puzzles import unlock_door, open_vent, unlock_computer
from inventory import add_item, has_item
from agents.guard.main import respond as guard_respond
from agents.robot.main import respond as robot_respond
from agents.scientist.main import respond as scientist_respond
from state import get_state

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

def talk_to_agent(agent, message):
    state = get_state()
    match agent:
        case "guard":
            if message == "":
                return {"message": guard_respond("what do you want to say", state)}
            else:
                return {"message": guard_respond(message, state)}
        case "robot":
            if message == "":
                return {"message": robot_respond("what do you want to say", state)}
            else:
                return {"message": robot_respond(message, state)}
        case "scientist":
            if message == "":
                return {"message": scientist_respond("what do you want to say", state)}
            else:
                return {"message": scientist_respond(message, state)}
        case _:
            return {"message": f"There's no one called '{agent}' here."}
