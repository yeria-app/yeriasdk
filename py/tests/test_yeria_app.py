"""
Tests for YeriaApp - signing, verification, and raw static views.
"""

import json
import time

import pytest
from cryptography.hazmat.primitives import serialization

from yeriasdk import ServiceBranding, YeriaApp, YeriaAppConfig, YeriaUI
from yeriasdk.errors import (
    ConfigurationError,
    SignatureVerificationError,
    ViewExpiredError,
)
from yeriasdk.views import FormView


class TestYeriaApp:
    def test_branding_is_normalized_and_signed_with_every_view(self):
        app = YeriaApp(YeriaAppConfig(
            app_id="branded-app",
            branding=ServiceBranding(primary="  #E85D04 "),
        ))
        form = YeriaUI.create_form_view("brand-form", "Branded form")
        form.add_text_field("name", "Name")
        envelope = app.serve(form)

        assert json.loads(envelope.payload)["view"]["branding"] == {
            "primary": "#E85D04",
        }

    def test_invalid_branding_accent_is_rejected(self):
        with pytest.raises(ConfigurationError, match="branding.primary"):
            YeriaApp(YeriaAppConfig(
                app_id="bad-brand",
                branding={"primary": "orange"},
            ))

    def test_branding_carries_colours_only(self):
        # The logo belongs to the registry (reviewed there), never to a view.
        app = YeriaApp(YeriaAppConfig(
            app_id="brand-extra",
            branding={"primary": "#E85D04", "logo": "img/mark.png"},
        ))
        form = YeriaUI.create_form_view("f", "F")
        form.add_text_field("name", "Name")
        assert json.loads(app.serve(form).payload)["view"]["branding"] == {
            "primary": "#E85D04",
        }

    def test_branding_keys_are_emitted_in_the_fixed_order(self):
        # The object is signed as emitted; JS builds the same order.
        app = YeriaApp(YeriaAppConfig(
            app_id="brand-full",
            branding={
                "shape": "soft", "font": "poppins", "primary": " #E85D04 ",
                "secondaryDark": "#5FD3A1", "secondary": "#168A5B", "primaryDark": "#FFB870",
            },
        ))
        form = YeriaUI.create_form_view("f", "F")
        form.add_text_field("name", "Name")
        branding = json.loads(app.serve(form).payload)["view"]["branding"]
        assert json.dumps(branding, separators=(",", ":")) == (
            '{"primary":"#E85D04","primaryDark":"#FFB870","secondary":"#168A5B",'
            '"secondaryDark":"#5FD3A1","font":"poppins","shape":"soft"}'
        )

    def test_branding_dataclass_maps_snake_case_to_wire_keys(self):
        app = YeriaApp(YeriaAppConfig(
            app_id="brand-dc",
            branding=ServiceBranding(primary="#E85D04", primary_dark="#FFB870", shape="square"),
        ))
        form = YeriaUI.create_form_view("f", "F")
        form.add_text_field("name", "Name")
        assert json.dumps(
            json.loads(app.serve(form).payload)["view"]["branding"], separators=(",", ":")
        ) == '{"primary":"#E85D04","primaryDark":"#FFB870","shape":"square"}'

    def test_absent_optional_branding_keys_are_omitted_and_present_ones_trimmed(self):
        app = YeriaApp(YeriaAppConfig(
            app_id="brand-partial",
            branding={"primary": "#E85D04", "font": " serif ", "primaryDark": None},
        ))
        form = YeriaUI.create_form_view("f", "F")
        form.add_text_field("name", "Name")
        assert json.dumps(
            json.loads(app.serve(form).payload)["view"]["branding"], separators=(",", ":")
        ) == '{"primary":"#E85D04","font":"serif"}'

    @pytest.mark.parametrize("key,branding", [
        ("primaryDark", {"primary": "#E85D04", "primaryDark": "red"}),
        ("secondary", {"primary": "#E85D04", "secondary": "#12345"}),
        ("secondaryDark", {"primary": "#E85D04", "secondaryDark": "red"}),
        ("font", {"primary": "#E85D04", "font": "roboto"}),
        ("font", {"primary": "#E85D04", "font": "Poppins"}),
        ("shape", {"primary": "#E85D04", "shape": "pill"}),
    ])
    def test_invalid_optional_branding_key_is_rejected(self, key, branding):
        with pytest.raises(ConfigurationError, match=f"branding.{key}"):
            YeriaApp(YeriaAppConfig(app_id="bad", branding=branding))

    def test_retired_or_unknown_branding_key_is_dropped(self):
        app = YeriaApp(YeriaAppConfig(
            app_id="brand-unknown",
            branding={"primary": "#E85D04", "header": "brand", "shape": "square"},
        ))
        form = YeriaUI.create_form_view("f", "F")
        form.add_text_field("name", "Name")
        assert json.loads(app.serve(form).payload)["view"]["branding"] == {
            "primary": "#E85D04", "shape": "square",
        }

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
