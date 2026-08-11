from client import send_action, get_state
from openai import OpenAI
import os
from prompt import SYSTEM_PROMPT
from anthropic import Anthropic
import re

client = Anthropic(
    api_key="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",
)


def print_state(state):

    print("\nLocation:")
    print(state["location"])

    print("\nInventory:")
    print(state["inventory"])

def respond(message: str, state: dict) -> str:
    instructions = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Current game state:\n"
        f"Location: {state['location']}\n"
        f"Inventory: {state['inventory']}\n"
        f"Puzzles solved: {state['puzzles']}\n"
    )
    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1024,
        system=instructions,
        messages=[
            {"role": "user", "content": message}
        ],
    )
    
    text = response.content[1].text

    action = re.search(r"\*\*Action:\*\*\s*(.*)", text).group(1).strip()
    target = re.search(r"\*\*Target:\*\*\s*(.*)", text).group(1).strip()
    message = re.search(r"\*\*Message:\*\*\s*(.*)", text).group(1).strip()

    print(action)
    print(target)
    print(message)

    return text


def main():

    print("=== Escape Room ===")
    print("Type 'quit' to exit")

    while True:

        command = input("\n> ")

        if command == "quit":
            break

        text = respond(command, get_state())

        action = re.search(r"\*\*Action:\*\*\s*(.*)", text).group(1).strip()
        target = re.search(r"\*\*Target:\*\*\s*(.*)", text).group(1).strip()
        message = re.search(r"\*\*Message:\*\*\s*(.*)", text).group(1).strip()

        result = send_action(
            action,
            target,
            message,
        )

        if result is None:
            print("\n Something went wrong talking to the manager. Try again.")
            continue

        print(
            "\n",
            result["result"]["message"]
        )

        print_state(
            result["state"]
        )


if __name__ == "__main__":
    main()