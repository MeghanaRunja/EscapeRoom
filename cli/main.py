from client import send_action, get_state


def print_state(state):

    print("\nLocation:")
    print(state["location"])

    print("\nInventory:")
    print(state["inventory"])



def main():

    print("=== Escape Room ===")
    print("Type 'quit' to exit")

    while True:

        command = input("\n> ")

        if command == "quit":
            break


        parts = command.split()

        action = parts[0]


        target = None

        if len(parts) > 1:
            target = parts[1]


        result = send_action(
            action,
            target
        )


        print(
            "\n",
            result["result"]["message"]
        )


        print_state(
            result["state"]
        )


if __name__ == "__main__":
    main()