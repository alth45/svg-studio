# 📄 README.md — SVG Studio


<div align="center">

# ◈ SVG Studio

**A modern, lightweight SVG editor that runs in your browser.**

Design, edit, and export vector graphics with a professional-grade UI — no installation, no account, no cloud.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c8aff.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-34d399.svg)](./CONTRIBUTING.md)

[Features](#-features) · [Quick Start](#-quick-start) · [Usage](#-usage) · [Architecture](#-architecture) · [Shortcuts](#-keyboard-shortcuts)

</div>

---

## ✨ Features

### 🎨 Rich Geometry Library

14 shape tools covering both primitives and organic forms:

| Primitive | Polygon | Path-Based |
|---|---|---|
| Rectangle | Star (⭐) | Arrow |
| Ellipse | Triangle | Heart |
| Line | Diamond | Cross |
| Text | Hexagon | Speech Bubble |
| | Octagon | Custom Pen Path |

All shapes support **fill**, **stroke**, **opacity**, **rotation**, **resize**, and — for path-based shapes — **per-node editing**.

### 🖱️ Professional Editing Experience

- **Multi-select** with Shift+click or marquee drag
- **8-point resize handles** with proportional resize (Shift)
- **Rotation handle** with 15° snap (Shift)
- **Node editor** — double-click any path to drag anchor & bezier control points
- **Undo / redo** — 50-step history
- **Drag reorder** layers with visual drop indicators

### 🎯 Context Menu (Right-Click)

Everything one click away — smart menu that auto-adjusts to viewport:

```
Duplicate  ·  Delete  ·  Copy  ·  Cut  ·  Paste
Group  ·  Ungroup
Bring to Front  ·  Bring Forward  ·  Send Backward  ·  Send to Back
Lock  ·  Hide  ·  Rename
Edit Nodes (for paths)
```

### 📦 Grouping

- Tag any selection as a group with `Ctrl+G`
- Groups select as a unit, move together, resize together
- Ungroup with `Ctrl+Shift+G`
- Exported as native `<g>` tags — round-trip compatible with Figma, Illustrator, Inkscape

### 🎨 Vector Inspector

Full control over every shape:

- **Transform** — X, Y, W, H, rotation
- **Fill** — color, hex input, no-fill, opacity
- **Stroke** — color, width, dash pattern, cap, join
- **Opacity** — per-element
- **Corner Radius** — for rectangles
- **Text** — content, size, weight
- **Polygon** — sides count, star toggle
- **Path** — node edit mode

### 🔄 Import / Export

- **Export** — clean SVG string, copy or download
- **Import** — parse any `.svg` file, including nested `<g>` groups, transforms, and bezier paths
- **Download** — `Ctrl+S` for instant export

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** `>= 18`
- **npm** `>= 9` (or pnpm / yarn)

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/your-username/svg-studio.git
cd svg-studio

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
# → open http://localhost:5173
```

### Build for Production

```bash
npm run build      # builds to ./dist
npm run preview    # preview production build locally
```

The output in `dist/` is fully static — deploy anywhere: **Netlify**, **Vercel**, **GitHub Pages**, **Cloudflare Pages**, or any static host.

---

## 📖 Usage

### Basic Workflow

1. **Pick a tool** from the left toolbar (or press its shortcut)
2. **Drag on canvas** to create a shape
3. **Select** with the Select tool (V)
4. **Edit** in the right inspector panel
5. **Export** with `Ctrl+S` or the Export button

### Creating Shapes

| Method | Result |
|---|---|
| **Drag** | Shape sized to drag bounds |
| **Click** (no drag) | Default-sized shape at click point |
| **Shift + drag** | Square / circle constraint |
| **Alt + drag** | (Coming soon) Shape from center |

### Editing Paths

1. Select a path element
2. **Double-click** it, or click **Edit Nodes** in inspector
3. **Drag square handles** — move anchor points
4. **Drag round handles** — adjust bezier control points
5. **Delete** to remove an anchor (except starting point)
6. **Esc** to exit node edit mode

### Grouping

1. Select 2+ elements (Shift+click or marquee)
2. `Ctrl+G` to group
3. Click any group member — the whole group selects
4. `Ctrl+Shift+G` to ungroup

### Layers Panel

- **Click** to select
- **Shift+click** to add to selection
- **Double-click** to rename
- **Drag** to reorder z-index
- **👁** toggle visibility
- **🔒** toggle lock
- **✕** delete

---

## 🏗 Architecture

SVG Studio follows a **modular, unidirectional data flow** architecture inspired by Redux and clean-architecture principles.

```
┌─────────────────────────────────────────────┐
│              UI Layer (DOM)                 │
│  toolbar · inspector · layers · topbar     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Input Layer                       │
│  pointer · keyboard · zoom · context menu  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           State (source of truth)           │
│  state · history · clipboard               │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Render Pipeline                   │
│  canvas · overlay · grid · viewport        │
└─────────────────────────────────────────────┘
```

**Core principles:**

- **Single source of truth** — all data lives in `state.ts`
- **Pure logic** — geometry, path math, transforms are pure functions
- **DOM-sync render** — `renderAll()` diff-free re-renders (fast at typical scale)
- **Acyclic imports** — no circular dependencies
- **Type-safe** — every state shape is `interface`-typed

### Project Structure

```
svg-studio/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.ts                  # Composition root
│   ├── types.ts                # Shared types
│   ├── config.ts               # Constants
│   │
│   ├── core/                   # Global state & lifecycle
│   │   ├── state.ts            # App state + selectors
│   │   ├── history.ts          # Undo/redo
│   │   └── eventBus.ts         # (reserved)
│   │
│   ├── geometry/               # Pure math
│   │   ├── transforms.ts       # Translate, scale, rotate
│   │   └── bbox.ts             # Bounding box + union
│   │
│   ├── utils/                  # Helpers
│   │   ├── dom.ts              # SVG element factory
│   │   ├── math.ts             # round, clamp, dist
│   │   ├── path.ts             # Path parse/build/matrix
│   │   └── id.ts               # ID generator
│   │
│   ├── model/                  # Element factories
│   │   ├── factory.ts          # makeElement, typeLabel
│   │   ├── style.ts            # styleAttrs
│   │   └── serializer.ts       # element → SVG string
│   │
│   ├── render/                 # State → DOM
│   │   ├── canvas.ts           # buildNode, renderContent
│   │   ├── overlay.ts          # Selection, handles, node edit
│   │   ├── grid.ts             # Canvas grid
│   │   └── viewport.ts         # Pan, zoom, fit
│   │
│   ├── tools/                  # Tool-specific logic
│   │   ├── select.ts           # Move, resize, rotate, marquee
│   │   ├── hand.ts             # Pan
│   │   ├── create.ts           # Shape factories + drag
│   │   ├── pen.ts              # Path drafting
│   │   └── text.ts             # Text creation
│   │
│   ├── input/                  # Event wiring
│   │   ├── pointer.ts          # Pointer + context menu
│   │   ├── keyboard.ts         # Shortcuts
│   │   └── zoom.ts             # Wheel zoom
│   │
│   ├── ui/                     # DOM components
│   │   ├── toolbar.ts          # Tool palette
│   │   ├── topbar.ts           # Top actions
│   │   ├── inspector.ts        # Property panel
│   │   ├── layers.ts           # Layer list
│   │   ├── statusbar.ts        # Bottom bar
│   │   ├── contextMenu.ts      # Right-click menu
│   │   └── toast.ts            # Notifications
│   │
│   ├── io/
│   │   ├── exporter.ts         # SVG export
│   │   └── importer.ts         # SVG import
│   │
│   └── styles/
│       └── main.css            # Design tokens + components
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── README.md
```

---

## ⌨ Keyboard Shortcuts

### Tools

| Key | Tool |
|:---:|---|
| `V` | Select |
| `H` | Hand / Pan |
| `R` | Rectangle |
| `O` | Ellipse |
| `L` | Line |
| `S` | Star / Polygon |
| `P` | Pen |
| `T` | Text |
| `1` | Triangle |
| `2` | Diamond |
| `3` | Hexagon |
| `4` | Octagon |
| `5` | Arrow |
| `6` | Heart |
| `7` | Cross |
| `8` | Speech Bubble |

### Editing

| Shortcut | Action |
|:---:|---|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + D` | Duplicate |
| `Ctrl + C` | Copy |
| `Ctrl + X` | Cut |
| `Ctrl + V` | Paste |
| `Ctrl + A` | Select all |
| `Delete` / `Backspace` | Delete selection |
| `F2` | Rename |
| `Esc` | Deselect / exit node edit / finish path |
| `Enter` | Close pen path |

### Grouping & Z-Order

| Shortcut | Action |
|:---:|---|
| `Ctrl + G` | Group selection |
| `Ctrl + Shift + G` | Ungroup |
| `Ctrl + ]` | Bring to front |
| `Ctrl + [` | Send to back |

### View

| Shortcut | Action |
|:---:|---|
| `Space + drag` | Pan (temporary) |
| `Scroll` | Zoom in / out |
| `Middle-mouse drag` | Pan |
| `Ctrl + S` | Download SVG |

### Modifiers During Drag

| Modifier | Effect |
|:---:|---|
| `Shift` | Constrain axis (move) / preserve ratio (resize) / snap angle (rotate) |
| `Alt` | (Reserved) |

---

## 🎨 Design System

The UI follows a **Linear/Raycast-inspired** dark theme with:

- **Dual-accent palette** — periwinkle (`#7c8aff`) primary, subtle cyan accents
- **8px grid** — consistent spacing scale
- **Frosted panels** — subtle backdrop blur on modals & menus
- **Micro-interactions** — 120–250ms ease transitions
- **Tabular numerals** — for all numeric displays

All design tokens live in `src/styles/main.css` as CSS custom properties (`:root { --accent: ... }`) — theming is trivial (just override the variables).

---

## 🧪 Development

### Commands

```bash
npm run dev        # Dev server with HMR
npm run build      # Type-check + production build
npm run preview    # Preview build locally
```

### Adding a New Shape

1. Add the tool ID to `ToolId` in `src/types.ts`
2. Register in `TOOL_KEYS` in `src/config.ts`
3. Add icon + entry to `TOOLS` in `src/ui/toolbar.ts`
4. Add generator in `src/tools/create.ts`:
   - Polygon-based → add to `POLY_SHAPES`
   - Path-based → add generator function + entry to `PATH_SHAPES`
5. Add hint text in `src/ui/statusbar.ts`
6. Add cursor mapping in `app.ts::setTool`

That's it — the shape will automatically support selection, resize, rotate, inspector, export, and (for paths) node editing.

### Adding a New Operation

1. Implement in `src/app.ts` (e.g. `export function myOperation() {}`)
2. Wire to `Ctrl+<key>` in `src/input/keyboard.ts`
3. Add to context menu in `src/input/pointer.ts::onContextMenu`
4. Optionally add to topbar via `src/ui/topbar.ts`

---

## 🤝 Contributing

Contributions are welcome and appreciated! Here's how:

1. **Fork** the repo and clone your fork
2. **Create a branch** — `git checkout -b feat/amazing-feature`
3. **Make changes** — follow existing code style (Prettier default, 2-space indent)
4. **Test manually** — the app has no automated test suite yet (help wanted!)
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add pentagon tool
   fix: correct rotation handle on grouped elements
   docs: update keyboard shortcuts table
   ```
6. **Push** and open a **Pull Request**

### Good First Issues

Looking for something to work on? Here are high-value ideas:

- [ ] **Light mode theme** — override CSS variables
- [ ] **Autosave to localStorage** — persist state on every change
- [ ] **Linear/radial gradients** — fill type selector
- [ ] **Multi-element alignment tools** — align left/center/right
- [ ] **Snap to grid** — toggle + snap threshold
- [ ] **Boolean operations** — union, subtract, intersect
- [ ] **SVG symbol library** — reusable components
- [ ] **Unit tests** — Vitest for geometry + path utilities

---

## 📋 Roadmap

| Status | Feature |
|:---:|---|
| ✅ | Core shapes, pen tool, node editing |
| ✅ | Import / export SVG |
| ✅ | Context menu, grouping, z-order |
| ✅ | Extended geometry (14 shapes) |
| 🚧 | Light mode |
| 🚧 | Autosave |
| 🧭 | Gradient fills |
| 🧭 | Boolean operations |
| 🧭 | Alignment & distribution |
| 🧭 | SVG symbol library |
| 💡 | Cloud sync (optional) |
| 💡 | Plugin system |

---

## 🐛 Known Limitations

- **No automated tests yet** — manual QA only
- **Text rendering** — uses browser system fonts, no font upload
- **Complex SVG features** — gradients, patterns, filters, and clip paths are stripped on import
- **No multi-artboard** — single canvas per document
- **No collaborative editing** — single-user only

---

## 📄 License

Released under the [MIT License](./LICENSE).



---

## 🙏 Acknowledgements

- **Icons** — hand-drawn SVG paths (no external icon library)
- **Fonts** — [Inter](https://rsms.me/inter/) & [JetBrains Mono](https://www.jetbrains.com/lp/mono/) via Google Fonts
- **Inspiration** — [Figma](https://figma.com), [Excalidraw](https://excalidraw.com), [tldraw](https://tldraw.com)
- **Built with** — [TypeScript](https://typescriptlang.org), [Vite](https://vitejs.dev)

---

<div align="center">

**[⬆ Back to top](#-svg-studio)**

Made with ♥ for the vector graphics community.

</div>

