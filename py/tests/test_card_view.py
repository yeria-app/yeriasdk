"""Layout elements of the card — mirror of js/tests/card-view.test.ts."""
import json

import pytest

from yeriasdk import YeriaUI
from yeriasdk.errors.exceptions import InvalidParameterError


def test_layout_blocks_take_their_place_among_sections_in_call_order():
    card = (
        YeriaUI.create_card_view("c", "T")
        .add_section("H1", "a • b")
        .add_paragraph("  note ", size="sm", bold=True)
        .add_spacer("lg")
        .add_separator(" Details ")
        .add_section("H2", "text")
    )
    assert json.dumps(card.get_content()["sections"], separators=(",", ":"), ensure_ascii=False) == (
        '[{"heading":"H1","body":"a • b"},'
        '{"type":"paragraph","text":"note","size":"sm","bold":true},'
        '{"type":"spacer","size":"lg"},'
        '{"type":"separator","label":"Details"},'
        '{"heading":"H2","body":"text"}]'
    )


def test_defaults():
    card = YeriaUI.create_card_view("c", "T").add_paragraph("p").add_spacer().add_separator("   ")
    assert card.get_content()["sections"] == [
        {"type": "paragraph", "text": "p", "size": "md"},
        {"type": "spacer", "size": "md"},
        {"type": "separator"},
    ]


def test_rejects_blank_paragraph_and_unknown_sizes():
    card = YeriaUI.create_card_view("c", "T")
    with pytest.raises(InvalidParameterError):
        card.add_paragraph("  ")
    with pytest.raises(InvalidParameterError):
        card.add_paragraph("p", size="xxl")
    with pytest.raises(InvalidParameterError):
        card.add_spacer("xl")


def test_paragraph_alone_is_content_but_spacer_or_separator_is_not():
    YeriaUI.create_card_view("c", "T").add_paragraph("only text").build()
    with pytest.raises(Exception, match="at least a description, stat, or section"):
        YeriaUI.create_card_view("c", "T").add_spacer().build()
    with pytest.raises(Exception, match="at least a description, stat, or section"):
        YeriaUI.create_card_view("c", "T").add_separator("x").build()


def test_clear_sections_drops_layout_blocks_too():
    card = YeriaUI.create_card_view("c", "T").add_section("H", "b").add_spacer().clear_sections()
    assert card.get_content()["sections"] == []
