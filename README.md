# Yeria SDK Monorepo

An SDK for generating dynamic interfaces for the Yeria application ecosystem.

🌐 Website: [yeria.app](https://yeria.app)

## 📦 Language Ports

- **[JavaScript/TypeScript](./js/README.md)** - The original TypeScript implementation
- **[Python](./py/README.md)** - Full Python port with API parity

## 🚀 Quick Start

### JavaScript/TypeScript

```bash
cd js
npm install
npm run build
```

See [js/README.md](./js/README.md) for detailed documentation.

### Python

```bash
cd py
pip install -r requirements.txt
```

See [py/README.md](./py/README.md) for detailed documentation.

## 🎯 Core Features

All language ports share the same core features:

- **12 View Types**: Form, Reader, ActionList, ActionGrid, QRScan, QRDisplay, Message, Card, Carousel, Timeline, Media, Map
- **Notifications**: Send signed notifications to users via City-Mate platform
- **Ed25519 Signing**: Secure view signing and verification
- **Stateless Architecture**: No internal state, perfect for serverless
- **Validation**: Built-in field and form validation
- **Security**: XSS protection, URL validation, input sanitization
- **API Parity**: Same fluent API across all language ports

## 📚 Documentation

Each language port has its own complete documentation:

- [JavaScript/TypeScript Documentation](./js/README.md)
- [Python Documentation](./py/README.md)

## 🏗️ Architecture

The SDK follows a stateless factory pattern:

- **YeriaApp** acts as a factory for creating views
- Views are created using factory methods (e.g., `createFormView()`)
- Views are signed statelessly using Ed25519
- No internal state is maintained between requests

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📄 License

Apache License 2.0 - see the [LICENSE](./LICENSE) and [NOTICE](./NOTICE) files for details.

Copyright 2026 Numerum.
