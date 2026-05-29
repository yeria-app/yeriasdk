"""
Basic usage example for Yeria Python SDK
"""

from yeriasdk import YeriaApp, YeriaAppConfig
from yeriasdk.views import FormView, MessageView, ReaderView

# Initialize YeriaApp with configuration
config = YeriaAppConfig(
    app_id="my-app",
    view_expiration_minutes=60,
)

app = YeriaApp(config)

# Example 1: Create a simple form view
form = app.create_form_view("registration-form", "User Registration")
form.add_text_field("name", "Full Name", is_required=True, max_length=100)
form.add_email_field("email", "Email Address", is_required=True)
form.add_password_field("password", "Password", min_length=8)
form.submit_button("Register")

# Serve the form with signature
secure_response = app.serve(form)
print("Form view:", secure_response.view)
print("Signature:", secure_response.signature[:50] + "...")

# Example 2: Create a message view
message = app.create_message_view("welcome", "Welcome!")
message.set_intro("Thank you for joining us!")
message.set_body("We're excited to have you on board.")
message.set_severity("success")
message.set_primary_action("Get Started", "POST")

secure_message = app.serve(message)
print("\nMessage view:", secure_message.view)

# Example 3: Create a reader view
reader = app.create_reader_view("about", "About Us")
reader.set_intro("Learn more about our company")
reader.add_paragraph("We are a leading technology company...")
reader.add_subtitle("Our Mission")
reader.add_paragraph("To make technology accessible to everyone.")

secure_reader = app.serve(reader)
print("\nReader view:", secure_reader.view)

# Example 4: Stateless signing
view_json = form.to_json()
signed = YeriaApp.sign_view(
    view=view_json,
    app_id="my-app",
    private_key=app.get_public_key(),  # In real usage, use the private key
    timestamp=secure_response.timestamp,
)
print("\nStateless signed view:", signed.signature[:50] + "...")

