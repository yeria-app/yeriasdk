"""
Tests for FormView - Critical functionality including separators and intro field
"""

import pytest
from yeriasdk import YeriaApp, YeriaAppConfig
from yeriasdk.views import FormView
from yeriasdk.errors import (
    MissingRequiredParameterError,
    FieldValidationError,
    FieldNotFoundError,
)


class TestFormView:
    """Test FormView basic functionality"""

    def test_create_form_view(self):
        """Test creating a basic form view"""
        form = FormView("test-form", "Test Form")
        assert form.id == "test-form"
        assert form.type == "Form"
        assert form.content["title"] == "Test Form"
        assert form.content["intro"] == ""
        assert form.content["fields"] == []

    def test_set_intro(self):
        """Test setting intro field"""
        form = FormView("test-form", "Test Form")
        form.set_intro("Please fill in the form")
        assert form.content["intro"] == "Please fill in the form"

    def test_set_note_deprecated(self):
        """Test that set_note() still works for backward compatibility"""
        form = FormView("test-form", "Test Form")
        form.set_note("Old note method")
        assert form.content["intro"] == "Old note method"

    def test_add_text_field(self):
        """Test adding a text field"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Full Name", is_required=True)
        assert len(form.content["fields"]) == 1
        field = form.content["fields"][0]
        assert field["fieldType"] == "text"
        assert field["fieldId"] == "name"
        assert field["fieldLabel"] == "Full Name"
        assert field["required"] is True

    def test_add_separator(self):
        """Test adding a separator field"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Name")
        form.add_separator()
        form.add_email_field("email", "Email")
        
        assert len(form.content["fields"]) == 3
        separator = form.content["fields"][1]
        assert separator["fieldType"] == "separator"
        assert separator["fieldLabel"] == ""
        assert "fieldId" in separator

    def test_add_separator_with_id(self):
        """Test adding a separator with explicit ID"""
        form = FormView("test-form", "Test Form")
        form.add_separator("custom-separator")
        
        separator = form.content["fields"][0]
        assert separator["fieldType"] == "separator"
        assert separator["fieldId"] == "custom-separator"

    def test_get_field_count(self):
        """Test get_field_count() method"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Name")
        form.add_separator()
        form.add_email_field("email", "Email")
        
        assert form.get_field_count() == 3
        assert form.get_field_count(exclude_separators=True) == 2

    def test_submit_button(self):
        """Test setting submit button"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Name")
        form.submit_button("Submit", "POST")
        
        assert form.content["submit"] is not None
        assert form.content["submit"]["text"] == "Submit"
        assert form.content["submit"]["method"] == "POST"

    def test_validation_requires_field(self):
        """Test that form validation requires at least one non-separator field"""
        form = FormView("test-form", "Test Form")
        form.add_separator()
        
        result = form._validate()
        assert result.is_valid is False
        assert any("non-separator field" in str(e.message) for e in result.errors)

    def test_validation_with_real_fields(self):
        """Test that form with real fields passes validation"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Name")
        form.add_separator()
        form.add_email_field("email", "Email")
        
        result = form._validate()
        assert result.is_valid is True

    def test_get_field(self):
        """Test getting a field by ID"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Name")
        
        field = form.get_field("name")
        assert field is not None
        assert field["fieldId"] == "name"

    def test_get_field_not_found(self):
        """Test getting a non-existent field"""
        form = FormView("test-form", "Test Form")
        field = form.get_field("nonexistent")
        assert field is None

    def test_remove_field(self):
        """Test removing a field"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Name")
        form.add_email_field("email", "Email")
        
        result = form.remove_field("name")
        assert result is True
        assert len(form.content["fields"]) == 1
        assert form.content["fields"][0]["fieldId"] == "email"

    def test_inject_data(self):
        """Test injecting data into form fields"""
        form = FormView("test-form", "Test Form")
        form.add_text_field("name", "Name")
        form.add_email_field("email", "Email")
        
        errors = form.inject_data({"name": "John Doe", "email": "john@example.com"})
        assert len(errors) == 0
        
        name_field = form.get_field("name")
        assert name_field["value"] == "John Doe"


