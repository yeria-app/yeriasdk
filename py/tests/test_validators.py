"""
Tests for validators - Field validation and separator handling
"""

import pytest
from yeriasdk.utils.validators import FieldValidator, DataSanitizer
from yeriasdk.types.models import FormFieldParams


class TestFieldValidator:
    """Test FieldValidator functionality"""

    def test_validate_separator_field(self):
        """Test that separator fields don't require labels"""
        result = FieldValidator.validate_field("separator", "sep-1", "", None)
        assert result.is_valid is True

    def test_validate_separator_with_id(self):
        """Test separator field validation with ID"""
        result = FieldValidator.validate_field("separator", "custom-separator", "", None)
        assert result.is_valid is True

    def test_validate_text_field_requires_label(self):
        """Test that non-separator fields require labels"""
        result = FieldValidator.validate_field("text", "name", "", None)
        assert result.is_valid is False
        assert len(result.errors) > 0

    def test_validate_text_field_with_label(self):
        """Test valid text field"""
        params = FormFieldParams(required=True)
        result = FieldValidator.validate_field("text", "name", "Full Name", params)
        assert result.is_valid is True

    def test_validate_email_field(self):
        """Test email field validation"""
        params = FormFieldParams(required=True)
        result = FieldValidator.validate_field("email", "email", "Email", params)
        assert result.is_valid is True


class TestDataSanitizer:
    """Test DataSanitizer functionality"""

    def test_sanitize_input_removes_html(self):
        """Test that HTML is removed by default"""
        input_str = '<script>alert("XSS")</script>Hello'
        result = DataSanitizer.sanitize_input(input_str)
        assert "<script>" not in result
        assert "Hello" in result

    def test_sanitize_input_encodes_special_chars(self):
        """Test that special characters are encoded"""
        input_str = '< > & " \' /'
        result = DataSanitizer.sanitize_input(input_str)
        assert "&lt;" in result
        assert "&gt;" in result
        assert "&amp;" in result

    def test_validate_email(self):
        """Test email validation"""
        assert DataSanitizer.validate_email("user@example.com") is True
        assert DataSanitizer.validate_email("invalid") is False

    def test_validate_coordinates(self):
        """Test GPS coordinate validation"""
        assert DataSanitizer.validate_coordinates(48.8566, 2.3522) is True
        assert DataSanitizer.validate_coordinates(91.0, 0.0) is False  # Invalid lat
        assert DataSanitizer.validate_coordinates(0.0, 181.0) is False  # Invalid lon


