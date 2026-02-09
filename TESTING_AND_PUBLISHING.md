# Testing and Publishing Guide

This guide will help you complete, test, and publish your VS Code extension.

## Prerequisites

1. **Node.js and npm** installed (check with `node --version` and `npm --version`)
2. **VS Code** installed
3. **Git** (if publishing to marketplace)

## Step 1: Complete the Extension Setup

### 1.1 Update package.json

Before publishing, you need to update `package.json` with your information:

1. **Publisher Name**: Replace `"your-publisher-name"` with your publisher ID (lowercase, alphanumeric, no spaces)
   - This will be your unique identifier on the VS Code Marketplace
   - Example: `"publisher": "johndoe"` or `"publisher": "mycompany"`

2. **Repository URLs**: Update the repository, bugs, and homepage URLs with your actual GitHub repository
   - Replace `your-username` and `your-repo` with your actual values

3. **Icon** (Optional but recommended): Add a 128x128 PNG icon named `icon.png` in the root directory

### 1.2 Install Publishing Tool

Install the VS Code Extension Manager (`vsce`) globally:

```bash
npm install -g @vscode/vsce
```

Or use it locally (recommended):

```bash
npm install --save-dev @vscode/vsce
```

## Step 2: Test Locally

### 2.1 Build the Extension

First, compile the TypeScript code:

```bash
npm run compile
```

This creates the `out/` directory with compiled JavaScript files.

### 2.2 Run in Extension Development Host

1. **Open the extension folder** in VS Code:
   ```bash
   code /Users/vijaykumar/Developer/vscode_ext/SA-code-vizualizer
   ```

2. **Press F5** or go to Run > Start Debugging
   - This opens a new "Extension Development Host" window
   - Your extension is loaded in this new window

3. **Test the extension**:
   - In the Extension Development Host window, open a workspace folder (preferably one with code files)
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Show Code Visualization" and select it
   - Wait for the scanning to complete
   - Verify the visualization appears correctly

### 2.3 Test Different Scenarios

Test with:
- ✅ Small codebase (few files)
- ✅ Medium codebase (multiple folders)
- ✅ Different programming languages
- ✅ Empty workspace (should show error message)
- ✅ Workspace with no code files

### 2.4 Watch Mode (for Development)

While developing, use watch mode to automatically recompile on changes:

```bash
npm run watch
```

Then press F5 to launch. Changes will be picked up automatically.

## Step 3: Package the Extension

### 3.1 Create a VSIX Package

Before publishing, create a `.vsix` file that can be installed locally or shared:

```bash
npm run package
```

Or if you installed vsce globally:

```bash
vsce package
```

This creates a file like `code-visualizer-0.0.1.vsix` in the root directory.

### 3.2 Install VSIX Locally

You can install the `.vsix` file to test the packaged version:

1. In VS Code, go to Extensions view (`Cmd+Shift+X` or `Ctrl+Shift+X`)
2. Click the `...` menu at the top
3. Select "Install from VSIX..."
4. Choose your `.vsix` file
5. Reload VS Code if prompted

## Step 4: Publish to VS Code Marketplace

### 4.1 Create a Publisher Account

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft/GitHub account
3. Click "Create Publisher"
4. Fill in:
   - **Publisher ID**: Must match the `publisher` field in `package.json` (lowercase, alphanumeric)
   - **Publisher Name**: Your display name
   - **Support Email**: Your email address

### 4.2 Get a Personal Access Token

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Sign in with the same account
3. Click on your profile picture → Security
4. Click "New Token"
5. Create a token with:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: All accessible organizations
   - **Expiration**: Set appropriate expiration (or custom)
   - **Scopes**: Marketplace (Manage)
6. Copy the token (you won't see it again!)

### 4.3 Login to vsce

```bash
vsce login <your-publisher-id>
```

Enter your Personal Access Token when prompted.

### 4.4 Publish the Extension

**First time publishing:**

```bash
vsce publish
```

**Update existing extension:**

```bash
vsce publish <new-version>
```

Or update the version in `package.json` and run:

```bash
vsce publish
```

### 4.5 Verify Publication

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/vscode)
2. Search for your extension name
3. It should appear within a few minutes

## Step 5: Update the Extension

When you make changes:

1. **Update version** in `package.json` (follow [Semantic Versioning](https://semver.org/)):
   - Patch: `0.0.1` → `0.0.2` (bug fixes)
   - Minor: `0.0.1` → `0.1.0` (new features)
   - Major: `0.0.1` → `1.0.0` (breaking changes)

2. **Update CHANGELOG.md** (create if doesn't exist):
   ```markdown
   # Change Log
   
   ## [0.0.2] - 2026-02-09
   - Fixed bug with dependency resolution
   - Improved performance for large codebases
   
   ## [0.0.1] - 2026-02-09
   - Initial release
   ```

3. **Compile and publish**:
   ```bash
   npm run compile
   vsce publish
   ```

## Troubleshooting

### Common Issues

1. **"Missing publisher" error**
   - Make sure `publisher` field exists in `package.json`
   - Publisher ID must match your marketplace publisher ID

2. **"Extension not found" when publishing**
   - First time: Use `vsce publish` (without version)
   - Updates: Make sure version number is incremented

3. **"Invalid Personal Access Token"**
   - Token may have expired
   - Make sure token has "Marketplace (Manage)" scope
   - Try creating a new token

4. **Extension doesn't activate**
   - Check `activationEvents` in `package.json`
   - Verify command is registered in `contributes.commands`
   - Check the Debug Console for errors (View > Output > select "Log (Extension Host)")

5. **Build errors**
   - Run `npm install` to ensure dependencies are installed
   - Check `tsconfig.json` configuration
   - Verify all TypeScript files compile without errors

### Debug Tips

- **View Extension Logs**: View > Output > select "Log (Extension Host)"
- **Reload Extension**: In Extension Development Host, press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux)
- **Check Console**: Open Developer Tools (Help > Toggle Developer Tools) in Extension Development Host

## Additional Resources

- [VS Code Extension API Documentation](https://code.visualstudio.com/api)
- [Publishing Extensions Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile)
npm run watch

# Package extension (.vsix)
npm run package
# or
vsce package

# Publish to marketplace
vsce publish

# Login to marketplace
vsce login <publisher-id>

# Check extension (validates package.json)
vsce ls
```

## Next Steps

After publishing:

1. ✅ Share your extension with others
2. ✅ Monitor marketplace analytics
3. ✅ Respond to user feedback and issues
4. ✅ Plan future features and improvements
5. ✅ Consider adding:
   - Extension settings/configuration
   - Keyboard shortcuts
   - Status bar items
   - Tree view providers
   - More language support

Good luck with your extension! 🚀
