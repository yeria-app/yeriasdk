# IconGridView Component Specification

## Description

The `IconGridView` component displays actions as an **app-launcher style grid**: each action is a
**square or circle image tile with its label underneath**. It is denser and more icon-oriented than
`ActionGridView` (which shows image + title + description cards).

It shares the same action model and the same navigation behaviour as the other action views: when an
action is selected, the mobile app requests `{currentUrl}/{actionCode}` (same flow as `ActionGrid` /
`ActionList`).

Use it for dashboards / launchers / category pickers where a compact icon-and-label layout reads
better than full cards.

## Fields Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the icon grid view |
| `type` | `string` | Yes | Always `"IconGrid"` |
| `content` | `IconGridContent` | Yes | Icon grid content object |
| `content.title` | `string` | No | Optional title displayed above the grid |
| `content.intro` | `string` | No | Optional introduction text displayed before the grid |
| `content.shape` | `"circle" \| "square"` | No | Tile shape for **all** tiles (default: `"circle"`) |
| `content.columns` | `number` | No | Number of columns (2-6, default: 4) |
| `content.spacing` | `number` | No | Spacing between tiles in pixels (default: 12) |
| `content.actions` | `ActionConfig[]` | Yes | Array of actions (at least one required) |
| `content.actions[].code` | `string` | Yes | Unique action code (used in the request) |
| `content.actions[].title` | `string` | Yes | Caption shown **under** the tile |
| `content.actions[].thumbnail` | `string` | No | Image URL rendered **inside** the tile (clipped to `shape`) |
| `content.actions[].badge` | `string` | No | Small overlay text on the tile (e.g. `"3"`, `"New"`) |
| `content.actions[].disabled` | `boolean` | No | Whether the tile is disabled — greyed and non-tappable (default: false) |
| `content.actions[].desc` | `string` | No | Optional description. **Kept for parity, but the mobile IconGrid renderer ignores it** (no text under the icon besides the title). |
| `content.actions[].metadata` | `Record<string, unknown>` | No | Optional metadata for the action |
| `processId` | `string` | No | Process identifier for multi-step workflows |
| `metadata` | `object` | No | View metadata (version, createdAt, author, tags) |

> Rendering notes (mobile): the `thumbnail` image is clipped to a circle (`shape:"circle"`) or a
> rounded square (`shape:"square"`); the `title` caption sits under the tile on a single line with
> ellipsis; `badge` renders as a small overlay at the top-right of the tile; a `disabled` tile is
> dimmed and not tappable. `desc` is **not** rendered.
>
> **Asset URLs (applies to all SGUI components):** `thumbnail` — like every image/media asset in a
> provider view — must be a **relative path**, resolved by the client against the **service base**
> (the view's own URL). Absolute `http(s)://`, `//host`, `file://` and `data:` values are **rejected**
> by the renderer (no external hosts, no cleartext, no local-file/inline payloads). To serve assets
> from a CDN, return a relative path whose endpoint **302-redirects to a short-lived signed CDN URL**
> — the client/player follows the redirect transparently.

## Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setTitle(title)` | `title` | `this` | Sets the title above the grid |
| `setIntro(intro)` | `intro` | `this` | Sets the intro text above the grid |
| `setShape(shape)` | `shape` - `"circle" \| "square"` | `this` | Sets the tile shape for all tiles |
| `setColumns(columns)` | `columns` - 2-6 | `this` | Sets the number of columns |
| `setSpacing(spacing)` | `spacing` - px (>= 0) | `this` | Sets spacing between tiles |
| `getShape()` | - | `"circle" \| "square"` | Gets the current shape |
| `getColumns()` | - | `number` | Gets the current column count |
| `getSpacing()` | - | `number` | Gets the current spacing |
| `addIcon(code, title, thumbnail?, badge?, disabled?, metadata?)` | image-first ergonomic API | `this` | Adds an icon tile (preferred for IconGrid) |
| `addAction(code, title, description?, thumbnail?, disabled?, metadata?)` | base order | `this` | Adds an action (same signature as ActionGrid; `description` is ignored at render) |
| `addActions(actions)` | `actions[]` | `this` | Adds multiple actions (inherited) |
| `removeAction(code)` | `code` | `boolean` | Removes an action (inherited) |
| `updateAction(code, updates)` | `code`, partial | `boolean` | Updates an action (inherited) |
| `hasActions()` | - | `boolean` | Whether the grid has any actions |
| `serve()` / `toJSON()` | - | object | Serialize/serve (inherited from BaseView) |

(All other action helpers — `getAction`, `getActions`, `getActiveActions`, `sortByTitle`,
`disableAllActions`, etc. — are inherited from `BaseActionView`, same as `ActionGridView`.)

## JavaScript Sample Code

### Basic icon grid (circle tiles)

```javascript
import { YeriaApp } from '@numerum-tech/yeriasdk';

const yeriaApp = new YeriaApp({ appId: 'my-app' });

const iconGrid = yeriaApp
    .createIconGridView('home', 'Accueil')
    .setIntro('Choisissez un service')
    .setColumns(4)
    .addIcon('map',     'Carte',     'https://example.com/icons/map.png')
    .addIcon('wallet',  'Portefeuille', 'https://example.com/icons/wallet.png', '3')
    .addIcon('docs',    'Documents', 'https://example.com/icons/docs.png')
    .addIcon('support', 'Support',   'https://example.com/icons/support.png');

const response = yeriaApp.serve(iconGrid);
```

### Square tiles + a disabled action

```javascript
const iconGrid = yeriaApp
    .createIconGridView('tools', 'Outils')
    .setShape('square')
    .setColumns(3)
    .addIcon('scan',    'Scanner', 'scan.png')
    .addIcon('pay',     'Payer',   'pay.png', 'New')
    .addIcon('archive', 'Archives','archive.png', undefined, true); // disabled
```

## Complete JSON Example

```json
{
  "id": "home",
  "type": "IconGrid",
  "content": {
    "title": "Accueil",
    "intro": "Choisissez un service",
    "shape": "circle",
    "columns": 4,
    "spacing": 12,
    "actions": [
      { "code": "map",     "title": "Carte",        "thumbnail": "https://example.com/icons/map.png" },
      { "code": "wallet",  "title": "Portefeuille", "thumbnail": "https://example.com/icons/wallet.png", "badge": "3" },
      { "code": "docs",    "title": "Documents",    "thumbnail": "https://example.com/icons/docs.png" },
      { "code": "support", "title": "Support",      "thumbnail": "https://example.com/icons/support.png", "disabled": true }
    ]
  },
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2026-06-19T10:00:00.000Z"
  }
}
```

## Signed envelope

`serve()` wraps the view exactly like every other type — no special handling:

```json
{
  "payload": "{\"appId\":\"my-app\",\"timestamp\":1750329600000,\"view\":{\"id\":\"home\",\"type\":\"IconGrid\",\"content\":{ ... }}}",
  "signature": "<base64 Ed25519 signature over the payload string>"
}
```
