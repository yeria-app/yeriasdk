import pytest

from yeriasdk import CardView, YeriaLink
from yeriasdk.errors import InvalidParameterError


def test_generates_https_links_by_default():
    assert YeriaLink.service("catalog.v2") == "https://yeria.app/dl/s/catalog.v2"
    assert YeriaLink.chat("catalog.v2") == "https://yeria.app/dl/c/catalog.v2"
    assert YeriaLink.pin("catalog.v2") == "https://yeria.app/dl/p/catalog.v2"
    assert (
        YeriaLink.subscribe("catalog.v2")
        == "https://yeria.app/dl/n/catalog.v2"
    )
    assert (
        YeriaLink.component("catalog.v2", "/orders?mode=edit")
        == "https://yeria.app/dl/v/catalog.v2?p=%2Forders%3Fmode%3Dedit"
    )


def test_generates_compact_custom_scheme_links():
    assert (
        YeriaLink.chat("service_42", format="yeria")
        == "yeria://dl/c/service_42"
    )


def test_validates_only_canonical_supported_links():
    assert YeriaLink.is_valid(YeriaLink.service("catalog"))
    assert YeriaLink.is_valid(YeriaLink.component("catalog", "/orders"))
    assert not YeriaLink.is_valid("https://outside.example/dl/s/catalog")
    assert not YeriaLink.is_valid("yeria://dl/x/catalog")
    assert not YeriaLink.is_valid("yeria://dl/s/catalog?redirect=outside")
    assert not YeriaLink.is_valid("https://yeria.app/service/catalog")


def test_rejects_unsafe_identifiers_and_provider_paths():
    with pytest.raises(InvalidParameterError):
        YeriaLink.service("hello world")
    with pytest.raises(InvalidParameterError):
        YeriaLink.component("catalog", "https://outside.example")
    with pytest.raises(InvalidParameterError):
        YeriaLink.component("catalog", "/../admin")
    with pytest.raises(InvalidParameterError):
        YeriaLink.component("catalog", "?mode=edit")


def test_allows_canonical_custom_links_in_card_actions():
    view = CardView("card", "Card").set_description("Description").add_action(
        "Chat", "GET", href=YeriaLink.chat("catalog", format="yeria")
    )

    assert view.get_content()["actions"][0]["href"] == "yeria://dl/c/catalog"
