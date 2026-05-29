# Yeria SDK Component Specifications

This directory contains detailed specifications for all components in the Yeria SDK JavaScript implementation. Each specification document includes:

- **Component Description**: Purpose, use cases, and design principles
- **Fields Description Table**: Complete field reference with types, requirements, and descriptions
- **JavaScript Sample Code**: Practical examples demonstrating component usage

## Main Class

- **[YeriaApp](yeria-app.md)** - Main entry point for creating secure, signed views with Ed25519 signature generation and verification

## View Components

### Form Components

- **[FormView](form-view.md)** - Dynamic forms with various field types, validation rules, and submission actions. Supports text, email, password, number, date, select, file uploads, GPS coordinates, and more.

### Content Display Components

- **[ReaderView](reader-view.md)** - Rich content display for reading. Supports paragraphs, images, markdown content, lists, links, tables, code blocks, quotes, and custom elements.

- **[CardView](card-view.md)** - Compact "product sheet" view highlighting a single item with stats, sections, and actions. Ideal for product information, user profiles, or event details.

- **[CarouselView](carousel-view.md)** - Carousel/slideshow component for showcasing featured content, announcements, or promotions. Supports autoplay, looping, and configurable display settings.

- **[TimelineView](timeline-view.md)** - Chronological timeline display for tracking progress, onboarding steps, or activity feeds. Supports status indicators (pending, active, completed, error).

- **[MediaView](media-view.md)** - Audio and video playlist component for media playback. Supports multiple sources, posters, and playback controls.

- **[MapView](map-view.md)** - Geographic map display with markers, viewport configuration, controls, and overlays. Backend provides data while renderer handles styling and interactions.

### Action Components

- **[ActionListView](action-list-view.md)** - Vertical list of action items for navigation menus, feature lists, or command centers. Each action can have title, description, thumbnail, and metadata.

- **[ActionGridView](action-grid-view.md)** - Grid layout of action items for dashboards or icon-based navigation. Supports configurable columns (1-6) and spacing.

### QR Code Components

- **[QRScanView](qr-scan-view.md)** - QR code scanner interface. Mobile app handles scanner implementation while view describes what to scan and where to submit. Supports auto-submit, validation, and preview modes.

- **[QRDisplayView](qr-display-view.md)** - QR code display component for sharing access codes, tickets, or payment information. Supports multiple QR codes with individual titles, descriptions, and configuration options.

### Message Components

- **[MessageView](message-view.md)** - Message, notification, and alert display component. Supports different severity levels (info, success, warning, error) with primary and secondary actions. Can be dismissible or require user interaction.

## Usage

Each specification document provides:

1. **Complete field reference** - All available fields with their types, requirements, and descriptions
2. **Practical examples** - Real-world code samples showing how to use each component
3. **Best practices** - Design principles and conventions for each component type

## Quick Start

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';

// Initialize YeriaApp
const yeriaApp = new YeriaApp({
    appId: 'my-app',
    viewExpirationMinutes: 30
});

// Create a view (example: FormView)
const form = yeriaApp
    .createFormView('registration', 'User Registration')
    .addTextField('name', 'Name', true)
    .submitButton('Register', 'POST');

// Serve the view (generates secure signature)
const response = yeriaApp.serve(form);
```

For detailed information about each component, refer to the individual specification documents listed above.

