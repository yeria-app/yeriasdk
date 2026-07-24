"""Shared parser-parity golden for the JavaScript and Python YeriaLink ports."""

import json
import os

import pytest

from yeriasdk import YeriaLink

FIXTURE = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "tests",
    "fixtures",
    "yeria_link_validation.json",
)

with open(FIXTURE, encoding="utf-8") as fixture_file:
    VECTORS = json.load(fixture_file)["vectors"]


@pytest.mark.parametrize(
    "vector",
    VECTORS,
    ids=[vector["name"] for vector in VECTORS],
)
def test_yeria_link_parser_matches_shared_golden(vector):
    assert YeriaLink.is_valid(vector["link"]) is vector["valid"]
