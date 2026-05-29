"""
Base action view class for ActionList and ActionGrid views
"""

from typing import List, Optional, Dict, Any, Callable
from abc import ABC, abstractmethod

from ..core.base_view import BaseView
from ..types.models import ActionConfig
from ..errors.exceptions import MissingRequiredParameterError


class BaseActionView(BaseView, ABC):
    """Abstract base class for action views (ActionList and ActionGrid)"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._actions: List[ActionConfig] = []

    def add_action(
        self,
        code: str,
        title: str,
        description: Optional[str] = None,
        thumbnail: Optional[str] = None,
        disabled: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "BaseActionView":
        """Add an action"""
        if not code or not title:
            raise MissingRequiredParameterError("code and title")

        action = ActionConfig(
            code=code,
            title=title,
            desc=description,
            thumbnail=thumbnail,
            disabled=disabled,
            metadata=metadata,
        )

        self._actions.append(action)
        self._sync_actions_to_content()
        return self

    def add_actions(
        self,
        actions: List[Dict[str, Any]],
    ) -> "BaseActionView":
        """Add multiple actions at once"""
        for action in actions:
            self.add_action(
                code=action["code"],
                title=action["title"],
                description=action.get("description"),
                thumbnail=action.get("thumbnail"),
                disabled=action.get("disabled", False),
                metadata=action.get("metadata"),
            )
        return self

    def remove_action(self, action_code: str) -> bool:
        """Remove an action by code"""
        index = next(
            (i for i, action in enumerate(self._actions) if action.code == action_code),
            -1,
        )

        if index != -1:
            self._actions.pop(index)
            self._sync_actions_to_content()
            return True

        return False

    def update_action(
        self, action_code: str, updates: Dict[str, Any]
    ) -> bool:
        """Update an existing action"""
        action = next(
            (a for a in self._actions if a.code == action_code), None
        )

        if action:
            if "title" in updates:
                action.title = updates["title"]
            if "desc" in updates:
                action.desc = updates.get("desc")
            if "thumbnail" in updates:
                action.thumbnail = updates.get("thumbnail")
            if "disabled" in updates:
                action.disabled = updates.get("disabled", False)
            if "metadata" in updates:
                action.metadata = updates.get("metadata")
            self._sync_actions_to_content()
            return True

        return False

    def get_action(self, action_code: str) -> Optional[ActionConfig]:
        """Get an action by code"""
        return next((a for a in self._actions if a.code == action_code), None)

    def get_actions(self) -> List[ActionConfig]:
        """Get all actions"""
        return list(self._actions)

    def get_active_actions(self) -> List[ActionConfig]:
        """Get active (non-disabled) actions"""
        return [a for a in self._actions if not a.disabled]

    def get_action_count(self) -> int:
        """Get action count"""
        return len(self._actions)

    def has_action(self, action_code: str) -> bool:
        """Check if an action exists"""
        return any(a.code == action_code for a in self._actions)

    def clear_actions(self) -> None:
        """Clear all actions"""
        self._actions = []
        self._sync_actions_to_content()

    @abstractmethod
    def _sync_actions_to_content(self) -> None:
        """Abstract method to sync actions array to content"""
        pass

    def filter_actions(
        self, predicate: Callable[[ActionConfig], bool]
    ) -> List[ActionConfig]:
        """Filter actions by predicate"""
        return [a for a in self._actions if predicate(a)]

    def sort_actions(
        self, compare_fn: Callable[[ActionConfig, ActionConfig], int]
    ) -> "BaseActionView":
        """Sort actions by custom comparator"""
        self._actions.sort(key=lambda x: compare_fn(x, x))
        self._sync_actions_to_content()
        return self

    def sort_by_title(self, ascending: bool = True) -> "BaseActionView":
        """Sort actions by title"""
        self._actions.sort(key=lambda a: a.title, reverse=not ascending)
        self._sync_actions_to_content()
        return self

    def disable_all_actions(self) -> "BaseActionView":
        """Disable all actions"""
        for action in self._actions:
            action.disabled = True
        self._sync_actions_to_content()
        return self

    def enable_all_actions(self) -> "BaseActionView":
        """Enable all actions"""
        for action in self._actions:
            action.disabled = False
        self._sync_actions_to_content()
        return self

