from openai import OpenAI
import os
from prompt import SYSTEM_PROMPT
import requests

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    # api_key=os.environ["HF_TOKEN"],
    api_key="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"
)

MANAGER_URL = "http://127.0.0.1:8000"

# client = OpenAI(
#     base_url="https://router.huggingface.co/v1",
#     api_key=os.environ["HF_TOKEN"],
# )

def get_game_state():
    response = requests.get(f"{MANAGER_URL}/state")
    return response.json()

def build_context(state):
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"Current game state:\n"
        f"Location: {state['location']}\n"
        f"Inventory: {state['inventory']}\n"
        f"Puzzles solved: {state['puzzles']}\n"
    )

def main():
    print("=== Talking to the Robot ===")
    print("Type 'quit' to exit")

    while True:
        user_input = input("\nYou: ")
        if user_input == "quit":
            break

        state = get_game_state()
        instructions = build_context(state)

        try:
            response = client.responses.create(
                model="openai/gpt-oss-120b:cerebras",
                instructions=instructions,
                input=user_input,
            )
            print("\Robot:", response.output_text)
        except Exception:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()