"""Puerto de notificaciones, resuelto mediante apps.common.registry."""
from abc import ABC, abstractmethod


class InquiryNotifier(ABC):
    @abstractmethod
    def notify_created(self, inquiry: dict) -> None: ...
