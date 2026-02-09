# Quick Start Guide

## 🚀 Testing Locally (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Compile
```bash
npm run compile
```

### Step 3: Run Extension
1. Open this folder in VS Code
2. Press **F5** (or Run > Start Debugging)
3. A new "Extension Development Host" window will open
4. In the new window:
   - Open a workspace folder with code files
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Show Code Visualization" and run it
   - Wait for scanning to complete
   - Visualization should appear!

### Step 4: Test Changes
- Make changes to `.ts` files
- Run `npm run compile` again
- Press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux) in Extension Development Host to reload

**Tip**: Use `npm run watch` to auto-compile on file changes.

---

## 📦 Package Extension (.vsix)

### Install vsce (one-time)
```bash
npm install -g @vscode/vsce
```

### Create Package
```bash
vsce package
```

This creates `code-visualizer-0.0.1.vsix` that you can:
- Install locally (Extensions > ... > Install from VSIX)
- Share with others
- Upload to marketplace

---

## 🌐 Publish to Marketplace

### Prerequisites
1. **Create Publisher Account**:
   - Go to https://marketplace.visualstudio.com/manage
   - Sign in with Microsoft/GitHub account
   - Create publisher (note your Publisher ID)

2. **Get Personal Access Token**:
   - Go to https://dev.azure.com/
   - Profile > Security > New Token
   - Name: "VS Code Publishing"
   - Scopes: Marketplace (Manage)
   - Copy the token!

### Update package.json
Before publishing, update these fields:
- `"publisher"`: Your publisher ID (lowercase, alphanumeric)
- `"repository"`: Your GitHub repo URL
- `"bugs"`: Your GitHub issues URL
- `"homepage"`: Your GitHub repo URL

### Publish
```bash
# Login (one-time)
vsce login <your-publisher-id>
# Enter your Personal Access Token when prompted

# Publish
vsce publish
```

**To update**: Change version in `package.json` and run `vsce publish` again.

---

## ✅ Checklist Before Publishing

- [ ] Updated `publisher` in `package.json`
- [ ] Updated repository URLs in `package.json`
- [ ] Extension compiles without errors (`npm run compile`)
- [ ] Extension works in Extension Development Host (F5)
- [ ] Tested with different codebases
- [ ] Created/updated CHANGELOG.md
- [ ] Version number follows semantic versioning

---

## 🐛 Troubleshooting

**Extension doesn't activate?**
- Check Debug Console (View > Output > Log (Extension Host))
- Verify command is registered in `package.json`

**Can't publish?**
- Make sure `publisher` field exists and matches your marketplace publisher ID
- Verify Personal Access Token has "Marketplace (Manage)" scope
- Check version number is incremented for updates

**Visualization doesn't load?**
- Check browser console in Extension Development Host (Help > Toggle Developer Tools)
- Verify workspace has code files
- Check network connectivity (CDN for vis-network library)

---

## 📚 More Help

See `TESTING_AND_PUBLISHING.md` for detailed instructions.
