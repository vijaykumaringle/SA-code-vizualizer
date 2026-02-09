# Code Visualizer Extension

A VS Code extension that scans your codebase and creates an interactive visualization of code structure and dependencies.

## Features

- 🔍 **Automatic Code Scanning**: Scans all code files in your workspace
- 📊 **Interactive Graph Visualization**: Displays code structure as an interactive network graph
- 🔗 **Dependency Mapping**: Shows how files are connected through imports and dependencies
- 🎨 **Language-Aware**: Color-codes nodes by programming language
- 📈 **Statistics**: Displays node count, edge count, and language diversity
- 💾 **Export**: Export visualization data as JSON

## Supported Languages

- TypeScript/JavaScript (.ts, .tsx, .js, .jsx)
- Python (.py)
- Java (.java)
- C# (.cs)
- C/C++ (.c, .cpp, .h, .hpp)
- Go (.go)
- Rust (.rs)
- Ruby (.rb)
- PHP (.php)
- Swift (.swift)
- Kotlin (.kt)
- Scala (.scala)
- Dart (.dart)
- Vue (.vue)
- Svelte (.svelte)

## Usage

1. Open a workspace folder in VS Code
2. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
3. Run the command: **"Show Code Visualization"**
4. Wait for the code scanning to complete
5. The visualization will open in a new tab

## Visualization Controls

- **Fit to Screen**: Adjusts the view to show all nodes
- **Reset Zoom**: Resets zoom level to default
- **Toggle Physics**: Enables/disables physics simulation for node positioning
- **Export JSON**: Downloads the graph data as a JSON file

## Interaction

- **Click on a node**: Shows detailed information about the file
- **Hover over nodes**: Highlights connected edges
- **Drag nodes**: Reposition nodes manually
- **Zoom**: Use mouse wheel or pinch gesture
- **Pan**: Click and drag the background

## Requirements

- VS Code version 1.74.0 or higher

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to open a new Extension Development Host window
5. In the new window, open a workspace and run the "Show Code Visualization" command

## Building for Distribution

```bash
npm install -g vsce
vsce package
```

This will create a `.vsix` file that can be installed in VS Code.

## How It Works

1. **Code Scanner**: Recursively scans the workspace for code files
2. **Dependency Extraction**: Analyzes each file to extract imports and dependencies based on language-specific patterns
3. **Graph Building**: Creates a graph structure with nodes (files) and edges (dependencies)
4. **Visualization**: Renders the graph using vis-network library in a webview panel

## Ignored Directories

The extension automatically ignores common build and dependency directories:
- `node_modules`
- `.git`
- `dist`, `build`, `out`
- `.vscode`
- `bin`, `obj`
- `__pycache__`
- `.next`, `.cache`

## Extension Settings

No settings are currently available, but future versions may include:
- Custom ignore patterns
- Language-specific parsing options
- Visualization customization

## Known Limitations

- External package dependencies (e.g., npm packages) are not resolved
- Some complex import patterns may not be detected
- Large codebases may take longer to scan

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License
