// Background script for Prompt Navigator extension

class PromptNavigatorBackground {
  constructor() {
    this.setupEventListeners();
    this.initializeStorage();
    this.setupContextMenus();
  }

  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.onFirstInstall();
      } else if (details.reason === 'update') {
        this.onUpdate(details.previousVersion);
      }
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Will respond asynchronously
    });

    // Handle tab updates to inject content script if needed
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.isSupportedSite(tab.url)) {
        this.injectContentScript(tabId);
      }
    });

    // Handle keyboard shortcuts
    if (chrome.commands && chrome.commands.onCommand) {
      chrome.commands.onCommand.addListener((command) => {
        this.handleCommand(command);
      });
    }
  }

  async initializeStorage() {
    try {
      const result = await chrome.storage.local.get(['prompts', 'stats', 'settings']);
      
      if (!result.prompts) {
        await chrome.storage.local.set({ prompts: [] });
      }
      
      if (!result.stats) {
        await chrome.storage.local.set({ 
          stats: { 
            used: 0, 
            saved: 0, 
            platforms: [],
            totalSessions: 0 
          } 
        });
      }
      
      if (!result.settings) {
        await chrome.storage.local.set({ 
          settings: {
            autoOptimize: false,
            showPlatformIndicator: true,
            enableKeyboardShortcuts: true,
            syncAcrossDevices: false,
            theme: 'auto'
          } 
        });
      }

      // Initialize with some default templates if first time
      if (!result.prompts || result.prompts.length === 0) {
        await this.installDefaultPrompts();
      }

    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async installDefaultPrompts() {
    const defaultPrompts = [
      {
        id: Date.now() + 1,
        title: 'Professional Email Writer',
        text: 'You are a professional communication expert. Please help me write a clear, professional email about [TOPIC]. Make it concise, polite, and action-oriented with proper structure.',
        category: 'Writing',
        createdAt: new Date().toISOString(),
        platform: 'System',
        usageCount: 0,
        isTemplate: true
      },
      {
        id: Date.now() + 2,
        title: 'Code Review Assistant',
        text: 'You are an experienced software engineer. Please review this code and provide feedback on: 1) Code quality and best practices 2) Potential bugs or issues 3) Performance optimizations 4) Suggestions for improvement',
        category: 'Code',
        createdAt: new Date().toISOString(),
        platform: 'System',
        usageCount: 0,
        isTemplate: true
      },
      {
        id: Date.now() + 3,
        title: 'Learning Explainer',
        text: 'You are a patient and knowledgeable teacher. Please explain [CONCEPT] in simple terms, using analogies and examples. Break it down step-by-step and check my understanding as we go.',
        category: 'Learning',
        createdAt: new Date().toISOString(),
        platform: 'System',
        usageCount: 0,
        isTemplate: true
      }
    ];

    await chrome.storage.local.set({ prompts: defaultPrompts });
  }

  setupContextMenus() {
    // Check if contextMenus API is available
    if (!chrome.contextMenus) {
      console.warn('Context menus API not available');
      return;
    }

    chrome.contextMenus.create({
      id: 'save-prompt',
      title: 'Save as Prompt',
      contexts: ['selection'],
      documentUrlPatterns: [
        '*://chat.openai.com/*',
        '*://claude.ai/*',
        '*://gemini.google.com/*',
        '*://bard.google.com/*',
        '*://perplexity.ai/*',
        '*://poe.com/*'
      ]
    });

    chrome.contextMenus.create({
      id: 'open-navigator',
      title: 'Open Prompt Navigator',
      contexts: ['page'],
      documentUrlPatterns: [
        '*://chat.openai.com/*',
        '*://claude.ai/*',
        '*://gemini.google.com/*',
        '*://bard.google.com/*',
        '*://perplexity.ai/*',
        '*://poe.com/*'
      ]
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenu(info, tab);
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getPrompts':
          const prompts = await this.getPrompts();
          sendResponse({ success: true, prompts });
          break;

        case 'savePrompt':
          const result = await this.savePrompt(request.prompt);
          sendResponse({ success: true, result });
          break;

        case 'deletePrompt':
          await this.deletePrompt(request.promptId);
          sendResponse({ success: true });
          break;

        case 'updateStats':
          await this.updateStats(request.stats);
          sendResponse({ success: true });
          break;

        case 'exportPrompts':
          const exportData = await this.exportPrompts();
          sendResponse({ success: true, data: exportData });
          break;

        case 'importPrompts':
          await this.importPrompts(request.data);
          sendResponse({ success: true });
          break;

        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse({ success: true, settings });
          break;

        case 'updateSettings':
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCommand(command) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      switch (command) {
        case 'toggle-navigator':
          if (this.isSupportedSite(tab.url)) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                if (window.promptNavigator) {
                  const panel = document.getElementById('prompt-navigator-panel');
                  if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
                  }
                }
              }
            });
          }
          break;

        case 'quick-save':
          if (this.isSupportedSite(tab.url)) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                if (window.promptNavigator) {
                  window.promptNavigator.extractPrompt();
                }
              }
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error handling command:', error);
    }
  }

  async handleContextMenu(info, tab) {
    try {
      switch (info.menuItemId) {
        case 'save-prompt':
          if (info.selectionText) {
            const prompt = {
              id: Date.now(),
              title: this.generateTitle(info.selectionText),
              text: info.selectionText,
              category: 'General',
              createdAt: new Date().toISOString(),
              platform: this.getPlatformFromUrl(tab.url),
              usageCount: 0
            };
            await this.savePrompt(prompt);
            
            // Show notification if available
            if (chrome.notifications) {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Prompt Saved',
                message: `"${prompt.title}" has been saved to your prompts.`
              });
            }
          }
          break;

        case 'open-navigator':
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              if (window.promptNavigator) {
                const panel = document.getElementById('prompt-navigator-panel');
                if (panel) {
                  panel.style.display = 'flex';
                }
              }
            }
          });
          break;
      }
    } catch (error) {
      console.error('Error handling context menu:', error);
    }
  }

  async getPrompts() {
    try {
      const result = await chrome.storage.local.get(['prompts']);
      return result.prompts || [];
    } catch (error) {
      console.error('Error getting prompts:', error);
      return [];
    }
  }

  async savePrompt(prompt) {
    try {
      const result = await chrome.storage.local.get(['prompts', 'stats']);
      const prompts = result.prompts || [];
      const stats = result.stats || { used: 0, saved: 0, platforms: [] };

      prompts.unshift(prompt);
      
      // Keep only the latest 200 prompts
      if (prompts.length > 200) {
        prompts.splice(200);
      }

      stats.saved++;
      if (!stats.platforms.includes(prompt.platform)) {
        stats.platforms.push(prompt.platform);
      }

      await chrome.storage.local.set({ prompts, stats });
      return prompt;
    } catch (error) {
      console.error('Error saving prompt:', error);
      throw error;
    }
  }

  async deletePrompt(promptId) {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result.prompts || [];
    const updatedPrompts = prompts.filter(p => p.id !== promptId);
    await chrome.storage.local.set({ prompts: updatedPrompts });
  }

  async updateStats(newStats) {
    const result = await chrome.storage.local.get(['stats']);
    const stats = { ...result.stats, ...newStats };
    await chrome.storage.local.set({ stats });
  }

  async exportPrompts() {
    const result = await chrome.storage.local.get(['prompts', 'stats', 'settings']);
    return {
      prompts: result.prompts || [],
      stats: result.stats || {},
      settings: result.settings || {},
      exportDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version
    };
  }

  async importPrompts(data) {
    if (data.prompts && Array.isArray(data.prompts)) {
      const result = await chrome.storage.local.get(['prompts']);
      const existingPrompts = result.prompts || [];
      
      // Merge prompts, avoiding duplicates
      const mergedPrompts = [...existingPrompts];
      data.prompts.forEach(importedPrompt => {
        const exists = existingPrompts.some(p => 
          p.text === importedPrompt.text && p.title === importedPrompt.title
        );
        if (!exists) {
          mergedPrompts.push({
            ...importedPrompt,
            id: Date.now() + Math.random(),
            createdAt: new Date().toISOString()
          });
        }
      });
      
      await chrome.storage.local.set({ prompts: mergedPrompts });
    }
  }

  async getSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {};
  }

  async updateSettings(newSettings) {
    const result = await chrome.storage.local.get(['settings']);
    const settings = { ...result.settings, ...newSettings };
    await chrome.storage.local.set({ settings });
  }

  async injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (error) {
      // Content script might already be injected, ignore error
      console.debug('Content script injection skipped:', error.message);
    }
  }

  isSupportedSite(url) {
    if (!url) return false;
    const supportedDomains = [
      'chat.openai.com',
      'claude.ai',
      'gemini.google.com',
      'bard.google.com',
      'perplexity.ai',
      'poe.com'
    ];
    return supportedDomains.some(domain => url.includes(domain));
  }

  getPlatformFromUrl(url) {
    if (!url) return 'Unknown';
    if (url.includes('chat.openai.com')) return 'ChatGPT';
    if (url.includes('claude.ai')) return 'Claude';
    if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'Gemini';
    if (url.includes('perplexity.ai')) return 'Perplexity';
    if (url.includes('poe.com')) return 'Poe';
    return 'Unknown';
  }

  generateTitle(text) {
    const words = text.trim().split(' ').slice(0, 6);
    let title = words.join(' ');
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    return title || 'Untitled Prompt';
  }

  async onFirstInstall() {
    // Show welcome notification if notifications API is available
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Welcome to Prompt Navigator!',
        message: 'Your AI prompt management extension is ready. Visit any AI platform to get started.'
      });
    }

    // Open welcome page or tutorial
    chrome.tabs.create({
      url: 'https://chat.openai.com'
    });
  }

  async onUpdate(previousVersion) {
    // Handle version updates
    console.log(`Updated from version ${previousVersion} to ${chrome.runtime.getManifest().version}`);
    
    // Migrate data if needed based on version
    if (previousVersion < '1.0.0') {
      // Perform any necessary data migrations
      await this.migrateFromOldVersion();
    }
  }

  async migrateFromOldVersion() {
    // Placeholder for future migrations
    console.log('Performing data migration...');
  }
}

// Initialize background script
try {
  new PromptNavigatorBackground();
  console.log('🧭 Prompt Navigator background script initialized successfully');
} catch (error) {
  console.error('Error initializing Prompt Navigator background script:', error);
}