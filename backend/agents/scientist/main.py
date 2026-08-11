import os
from openai import OpenAI
from .prompt import SYSTEM_PROMPT
from anthropic import Anthropic

# client = OpenAI(
#     base_url="https://router.huggingface.co/v1",
#     api_key=os.environ.get("HF_TOKEN"),
# )

client = Anthropic(
    api_key=os.environ.get("CLAUDE_TOKEN"),
)

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
    return "".join(block.text for block in response.content if block.type == "text")