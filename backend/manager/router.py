from models import PlayerAction
from actions import search_object, use_item, talk_to_agent


def handle_action(action: PlayerAction):

    if action.action == "search":
        return search_object(action.target)


    if action.action == "use":
        return use_item(action.target)


    if action.action == "talk":
        print(action.action)
        print(action.target)
        print(action.message)
        return talk_to_agent(action.target, action.message)


    return {
        "message": "Unknown action."
    }