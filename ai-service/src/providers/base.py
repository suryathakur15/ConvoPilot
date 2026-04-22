from abc import ABC, abstractmethod


class BaseProvider(ABC):
    @abstractmethod
    def complete(self, system: str, user: str, max_tokens: int) -> str:
        raise NotImplementedError

    def format_conversation(self, messages: list) -> str:
        lines = []
        for m in messages:
            role = m.get("sender_type", "unknown").capitalize()
            content = m.get("content", "")
            lines.append(f"{role}: {content}")
        return "\n".join(lines)
