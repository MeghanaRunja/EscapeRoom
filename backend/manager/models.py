from pydantic import BaseModel


class PlayerAction(BaseModel):

    action: str

    target: str | None = None

    message: str | None = None