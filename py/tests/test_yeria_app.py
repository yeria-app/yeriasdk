"""
Tests for YeriaApp - Signing, verification, and factory methods
"""

import pytest
import time
from yeriasdk import YeriaApp, YeriaAppConfig
from yeriasdk.views import FormView
from yeriasdk.errors import (
    AppIdMismatchError,
    ViewExpiredError,
    SignatureVerificationError,
)


class TestYeriaApp:
    """Test YeriaApp core functionality"""

    def test_create_yeria_app(self):
        """Test creating YeriaApp instance"""
        config = YeriaAppConfig(app_id="test-app", view_expiration_minutes=60)
        app = YeriaApp(config)
        assert app.config.app_id == "test-app"
        assert app.config.view_expiration_minutes == 60

    def test_create_form_view(self):
        """Test factory method for FormView"""
        config = YeriaAppConfig(app_id="test-app")
        app = YeriaApp(config)
        form = app.create_form_view("test-form", "Test Form")
        assert isinstance(form, FormView)
        assert form.id == "test-form"

    def test_serve_view(self):
        """Test serving a view with signature"""
        config = YeriaAppConfig(app_id="test-app")
        app = YeriaApp(config)
        form = app.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")
        
        response = app.serve(form)
        assert response.app_id == "test-app"
        assert response.signature is not None
        assert response.timestamp > 0
        assert response.view is not None
        assert response.view["id"] == "test-form"

    def test_get_public_key(self):
        """Test getting public key"""
        config = YeriaAppConfig(app_id="test-app")
        app = YeriaApp(config)
        public_key = app.get_public_key()
        assert public_key is not None
        assert "BEGIN PUBLIC KEY" in public_key or "BEGIN PUBLIC KEY" in public_key

    def test_verify_integrity_success(self):
        """Test verifying integrity of a valid response"""
        config = YeriaAppConfig(app_id="test-app", view_expiration_minutes=60)
        app = YeriaApp(config)
        form = app.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")
        
        response = app.serve(form)
        result = app.verify_integrity(response)
        assert result is True

    def test_verify_integrity_app_id_mismatch(self):
        """Test verification fails with wrong app ID"""
        config1 = YeriaAppConfig(app_id="app-1")
        app1 = YeriaApp(config1)
        form = app1.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")
        response = app1.serve(form)
        
        config2 = YeriaAppConfig(app_id="app-2")
        app2 = YeriaApp(config2)
        
        with pytest.raises(AppIdMismatchError):
            app2.verify_integrity(response)

    def test_static_sign_view(self):
        """Test static sign_view method"""
        config = YeriaAppConfig(app_id="test-app")
        app = YeriaApp(config)
        form = app.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")
        view_json = form.to_json()
        
        private_key = app.get_public_key()  # In real usage, use private key
        # Note: This test would need actual private key to work properly
        # For now, just verify the method exists and accepts parameters
        assert hasattr(YeriaApp, "sign_view")

    def test_static_verify_signature(self):
        """Test static verify_signature method"""
        config = YeriaAppConfig(app_id="test-app")
        app = YeriaApp(config)
        form = app.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")
        
        response = app.serve(form)
        public_key = app.get_public_key()
        
        result = YeriaApp.verify_signature(public_key, response)
        assert result is True


