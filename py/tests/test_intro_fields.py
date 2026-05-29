"""
Tests for intro field support across all views
"""

import pytest
from yeriasdk import YeriaApp, YeriaAppConfig
from yeriasdk.views import (
    ActionListView,
    ActionGridView,
    MapView,
    ReaderView,
    QRScanView,
    MessageView,
    TimelineView,
    MediaView,
)


class TestIntroFields:
    """Test intro field support across views"""

    def test_action_list_view_intro(self):
        """Test ActionListView intro support"""
        view = ActionListView("test-list", "Test List")
        view.set_intro("Select an option")
        assert view.content["intro"] == "Select an option"

    def test_action_grid_view_intro(self):
        """Test ActionGridView intro support"""
        view = ActionGridView("test-grid", "Test Grid")
        view.set_intro("Choose an action")
        assert view.content["intro"] == "Choose an action"

    def test_map_view_intro(self):
        """Test MapView intro support"""
        view = MapView("test-map", "Test Map")
        view.set_intro("Find locations on the map")
        assert view.content["intro"] == "Find locations on the map"

    def test_reader_view_intro(self):
        """Test ReaderView intro support"""
        view = ReaderView("test-reader", "Test Reader")
        view.set_intro("Read the content below")
        assert view.content["intro"] == "Read the content below"

    def test_qr_scan_view_intro(self):
        """Test QRScanView intro support"""
        view = QRScanView("test-scan", "Test Scanner")
        view.set_intro("Point camera at QR code")
        assert view.content["intro"] == "Point camera at QR code"

    def test_message_view_intro(self):
        """Test MessageView intro support"""
        view = MessageView("test-msg", "Test Message")
        view.set_intro("Welcome message")
        assert view.content["intro"] == "Welcome message"

    def test_timeline_view_intro(self):
        """Test TimelineView intro support"""
        view = TimelineView("test-timeline", "Test Timeline")
        view.set_intro("View your timeline")
        assert view.content["intro"] == "View your timeline"

    def test_media_view_intro(self):
        """Test MediaView intro support"""
        view = MediaView("test-media", "Test Media")
        view.set_intro("Browse media")
        assert view.content["intro"] == "Browse media"


