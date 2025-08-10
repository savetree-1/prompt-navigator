# Prompt Navigator

A browser extension that helps you navigate, manage, and optimize prompts across multiple AI platforms including ChatGPT, Claude, Gemini, Perplexity, and Poe.

## Features

- 🧭 **Cross-Platform Navigation**: Works on ChatGPT, Claude, Gemini, Perplexity, and Poe
- 💾 **Prompt Management**: Save, organize, and reuse your prompts
- 🔍 **Smart Search**: Quickly find saved prompts with search functionality
- ⚡ **Quick Actions**: Extract, optimize, and apply prompts with keyboard shortcuts
- 📊 **Usage Statistics**: Track your prompt usage across platforms
- 🎨 **Modern UI**: Beautiful, responsive interface that adapts to each platform

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

### Firefox

1. Download or clone this repository
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on" and select the `manifest.json` file
5. The extension will be loaded temporarily (you'll need to reload it after browser restart)

## Usage

### Basic Usage

1. Visit any supported AI platform (ChatGPT, Claude, Gemini, etc.)
2. Click the Prompt Navigator extension icon in your browser toolbar
3. Use the popup to:
   - Toggle the navigation panel
   - Extract current prompts
   - Save new prompts
   - View saved prompts

### Keyboard Shortcuts

- `Ctrl/Cmd + Shift + P`: Toggle the navigation panel
- `Escape`: Close the navigation panel

### Context Menu

Right-click on selected text to:
- Save selected text as a prompt
- Open Prompt Navigator

## Supported Platforms

- ✅ ChatGPT (chat.openai.com)
- ✅ Claude (claude.ai)
- ✅ Gemini (gemini.google.com)
- ✅ Bard (bard.google.com)
- ✅ Perplexity (perplexity.ai)
- ✅ Poe (poe.com)

## Troubleshooting

### Extension Not Loading

1. Check that all files are present in the extension directory
2. Ensure the manifest.json is valid
3. Check the browser console for any error messages
4. Try reloading the extension

### Navigation Panel Not Appearing

1. Make sure you're on a supported platform
2. Check if the content script is loaded (look for console messages)
3. Try refreshing the page
4. Check for any JavaScript errors in the console

### Prompts Not Saving

1. Check if the storage permission is granted
2. Look for error messages in the console
3. Try clearing and reinstalling the extension

### Performance Issues

1. The extension limits saved prompts to 200 to prevent performance issues
2. If you experience slowdowns, try clearing old prompts

## Development

### File Structure

```
prompt-navigator/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script for web pages
├── popup.js              # Popup script
├── popup.html            # Popup HTML
├── styles.css            # Styles for the navigation panel
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Making Changes

1. Edit the relevant files
2. Reload the extension in `chrome://extensions/`
3. Refresh any open AI platform pages to see changes

## Privacy

- All prompts are stored locally in your browser
- No data is sent to external servers
- The extension only accesses the AI platforms you visit

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests. 