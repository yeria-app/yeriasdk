# Contributing to JSON-driven UI SDK

Thank you for your interest in contributing to the JSON-driven UI SDK! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Issues
- Check if the issue already exists
- Provide clear description and steps to reproduce
- Include code examples when relevant
- Specify SDK version and environment

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit with clear message (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/numerum-tech/yeriasdk.git
cd yeriasdk

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

### Coding Standards

- Use TypeScript for all new code
- Follow existing code style
- Add JSDoc comments for public APIs
- Write tests for new features
- Ensure no TypeScript errors
- Keep commits focused and atomic

### Testing

- Write unit tests for new functionality
- Ensure all existing tests pass
- Aim for high code coverage
- Test edge cases and error conditions

### Documentation

- Update README for new features
- Add TypeScript types with clear documentation
- Include examples for new functionality
- Update CHANGELOG.md

## Questions?

Feel free to open an issue for any questions about contributing.