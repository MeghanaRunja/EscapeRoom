from state import game_state
from state import get_state

# location = get_state()["location"]
# inventory = get_state()["inventory"]
# objects = get_state()["objects"]
# puzzles = get_state()["puzzles"]
# trust = get_state()["trust"]

# def update_location(location, puzzles):
#     if (location == "laboratory") and (puzzles["door_unlocked"] == True):
#         location = "office"
#         game_state["location"] = location

def add_item(item):

    if item not in game_state["inventory"]:

        game_state["inventory"].append(item)

def has_item(item):

    return item in game_state["inventory"]



def remove_item(item):

    if item in game_state["inventory"]:

        game_state["inventory"].remove(item)

