"""
Tests for YeriaApp - signing, verification, and raw static views.
"""

import json
import time

import pytest
from cryptography.hazmat.primitives import serialization

from yeriasdk import YeriaApp, YeriaAppConfig, YeriaUI
from yeriasdk.errors import (
    ConfigurationError,
    SignatureVerificationError,
    ViewExpiredError,
)
from yeriasdk.views import FormView


class TestYeriaApp:
    def test_create_yeria_app(self):
        config = YeriaAppConfig(app_id="test-app", view_expiration_minutes=60)
        app = YeriaApp(config)
        assert app.config.app_id == "test-app"
        assert app.config.view_expiration_minutes == 60

    def test_create_form_view(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        assert isinstance(form, FormView)
        assert form.id == "test-form"

    def test_serve_view(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")

        envelope = app.serve(form)
        decoded = json.loads(envelope.payload)

        assert decoded["appId"] == "test-app"
        assert envelope.signature
        assert decoded["timestamp"] > 0
        assert decoded["view"]["id"] == "test-form"

    def test_serve_raw_view(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))

        view = YeriaUI.from_json(
            {
                "id": "static-home",
                "type": "Reader",
                "content": {
                    "title": "Accueil",
                    "elements": [{"type": "paragraph", "text": "Vue statique"}],
                },
            }
        )
        envelope = app.serve(view)
        decoded = json.loads(envelope.payload)

        assert decoded["view"]["id"] == "static-home"
        assert decoded["view"]["type"] == "Reader"
        assert app.verify_integrity(envelope) is True

    def test_serve_raw_view_rejects_malformed_payload(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))

        with pytest.raises(ConfigurationError):
            YeriaUI.from_json({"id": "x", "type": "Nope", "content": {}})

    def test_get_public_key(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))
        public_key = app.get_service_public_key()
        assert public_key is not None
        assert "BEGIN PUBLIC KEY" in public_key

    def test_verify_integrity_success(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app", view_expiration_minutes=60))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")

        envelope = app.serve(form)
        assert app.verify_integrity(envelope) is True

    def test_verify_integrity_app_id_mismatch(self):
        app1 = YeriaApp(YeriaAppConfig(app_id="app-1"))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")
        envelope = app1.serve(form)

        app2 = YeriaApp(YeriaAppConfig(app_id="app-2"))
        with pytest.raises(SignatureVerificationError):
            app2.verify_integrity(envelope)

    def test_static_sign_view(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")

        assert hasattr(YeriaApp, "sign_view")
        private_key_pem = app._signer.get_private_key_obj().private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()
        envelope = YeriaApp.sign_view(form.to_json(), "test-app", private_key_pem)
        assert YeriaApp.verify_signature(app.get_service_public_key(), envelope.payload, envelope.signature) is True

    def test_static_verify_signature(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")

        envelope = app.serve(form)
        assert YeriaApp.verify_signature(
            app.get_service_public_key(), envelope.payload, envelope.signature
        ) is True

    def test_static_verify_signature_rejects_tampered_payload(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app"))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")

        envelope = app.serve(form)
        tampered_payload = envelope.payload.replace("test-form", "tampered")
        assert YeriaApp.verify_signature(
            app.get_service_public_key(), tampered_payload, envelope.signature
        ) is False

    def test_verify_integrity_expired(self):
        app = YeriaApp(YeriaAppConfig(app_id="test-app", view_expiration_minutes=0.001))
        form = YeriaUI.create_form_view("test-form", "Test Form")
        form.add_text_field("name", "Name")

        envelope = app.serve(form)
        time.sleep(0.1)

        with pytest.raises(ViewExpiredError):
            app.verify_integrity(envelope)
