# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-07-24

### Added
- **Canonical Yeria link builders** (`YeriaLink`) — typed helpers to generate cross-service deeplinks: `service`, `component`, `chat`, `pin`, `subscribe`, plus `isValid`/`is_valid`. Exposed in both the JS and Python SDKs with byte-identical output frozen by shared golden vectors (`tests/fixtures/yeria_link_validation.json`).
- Card and Carousel views accept canonical Yeria links in their action targets.
- **FormView separators accept an optional label** — `addSeparator(fieldId?, label?)` / `add_separator(field_id, label)`. Empty by default; the mobile app will render the label once separator-label support lands.

### Changed
- **Standardized short deeplink routes** — canonical route table is now the single contract: `dl/s` (service), `dl/n` (subscribe), `dl/v?p=` (component), `dl/c` (chat), `dl/p` (pin), for both `yeria://` and `https://yeria.app`. Legacy `/service/{serviceId}/...` links are rejected, not aliased.
- `docs/deeplink-implementation.md` updated to the short-route table.

### Fixed
- `addSeparator()` / `add_separator()` no longer throw — the empty-label guard in `addField`/`add_field` now exempts separators (JS + Python). Previously any separator raised `MissingRequiredParameterError` before the downstream validator's separator exemption could run.

## [1.2.0] - 2026-07-06

### Added
- Two-symbol public surface, provider error contract, and GPS `maxAccuracy` field.

### Fixed
- JS/Python signing parity made byte-identical (compact JSON, null-link omission), frozen by a permanent parity test.

## [1.1.0] - 2026-06-21

### Added
- Complete Python SDK port with signing/verification parity to the JS SDK.

<!-- Legacy entries below use the pre-rename `jsonapp-js` version scheme (superseded by the 1.x `@numerum-tech/yeriasdk` line above). -->

## [3.0.0] - 2025-01-28

### BREAKING CHANGES
- **Removed DataView class** - DataView had unclear mobile screen representation and was not being used. Tables should be part of text content using ReaderView's `addTable(headers, rows)` method instead.

### Added
- **Intro field harmonization** - All view components now support a consistent `intro` field via `setIntro()` method:
  - FormView: Changed from `note` to `intro` (backward compatible via deprecated `setNote()`)
  - ActionListView: Added `intro` field and `setIntro()` method
  - ActionGridView: Added `intro` field and `setIntro()` method
  - MapView: Added `intro` field and `setIntro()` method
  - All other views already had intro support
- **FormView separator support** - Added `addSeparator()` method to visually group form fields
  - Separators are rendered as gaps or lines by mobile app renderers
  - Auto-generates unique field IDs when not provided
  - Excluded from "at least one field" validation
- **Enhanced FormView methods**:
  - `getFieldCount(excludeSeparators?)` - Optionally exclude separators from count
- **Complete Python SDK** - Full Python port with 100% API parity:
  - All 12 view types implemented
  - Ed25519 signing and verification
  - Complete validation system
  - Full error handling

### Changed
- **FormView**: `setNote()` is now deprecated in favor of `setIntro()` (still works for backward compatibility)
- **ActionListView/ActionGridView**: Constructor parameter renamed from `view_title` to `title` for consistency

### Removed
- DataView class and all related functionality
- DataViewContent interface from types
- YeriaApp.createDataView() factory method
- 'DataView' from ViewType union
- All DataView demo examples from demo-app

### Fixed
- **Python SDK**: Fixed all API parity issues identified in accuracy assessment
- **Python SDK**: Fixed version number consistency (now 3.0.0)
- **Validation**: Separator fields now properly excluded from form validation
- **FieldValidator**: Separator fields allowed to have empty labels

### Rationale
DataView served no clear purpose as a standalone mobile screen. Tabular data is better suited as part of text content within ReaderView, which already provides full table support via the `addTable()` method.

---

## [1.0.0] - 2025-09-02

### Added
- Initial release of JSON-driven UI SDK
- Core view types: FormView, DataView, ActionListView, ActionGridView
- Message and Reader views for content display
- QR code generation and scanning views
- Comprehensive validation system
- Ed25519 signature support for security
- TypeScript definitions with full type safety
- Builder pattern for easy view construction
- Example implementations
- Test suite with Jest

### Security
- Ed25519 cryptographic signatures for provider verification
- Secure form handling with validation
- Input sanitization and validation rules

### Documentation
- Complete README with usage examples
- TypeScript type definitions
- Example scripts for all view types