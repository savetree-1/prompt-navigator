// Popup script for Prompt Navigator extension

class PromptNavigatorPopup {
  constructor() {
    this.initializeElements();
    this.attachEventListeners();
    this.loadData();
    this.detectPlatform();
  }

  initializeElements() {
    this.elements = {
      togglePanel: document.getElementById('togglePanel'),
      extractPrompt: document.getElementById('extractPrompt'),
      optimizePrompt: document.getElementById('optimizePrompt'),
      promptInput: document.getElementById('promptInput'),
      savePrompt: document.getElementById('savePrompt'),
      savedPrompts: document.getElementById('savedPrompts'),
      savedCount: document.getElementById('savedCount'),
      usedCount: document.getElementById('usedCount'),
      platformCount: document.getElementById('platformCount'),
      platformIndicator: document.getElementById('platformIndicator')
    };

    // Check if all required elements exist
    const missingElements = Object.entries(this.elements)
      .filter(([name, element]) => !element)
      .map(([name]) => name);

    if (missingElements.length > 0) {
      console.error('Missing required elements:', missingElements);
    }
  }

  attachEventListeners() {
    if (this.elements.togglePanel) {
      this.elements.togglePanel.addEventListener('click', () => this.toggleNavigationPanel());
    }
    if (this.elements.extractPrompt) {
      this.elements.extractPrompt.addEventListener('click', () => this.extractCurrentPrompt());
    }
    if (this.elements.optimizePrompt) {
      this.elements.optimizePrompt.addEventListener('click', () => this.optimizePrompt());
    }
    if (this.elements.savePrompt) {
      this.elements.savePrompt.addEventListener('click', () => this.savePrompt());
    }
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['prompts', 'stats']);
      const prompts = result.prompts || [];
      const stats = result.stats || { used: 0, platforms: new Set() };

      this.updateStats(prompts.length, stats.used, stats.platforms.size || 0);
      this.displaySavedPrompts(prompts);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async detectPlatform() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const platform = this.getPlatformFromUrl(tab.url);
      this.elements.platformIndicator.textContent = platform;
      
      // Update platform indicator styling
      const platformColors = {
        'ChatGPT': '#10a37f',
        'Claude': '#d97706',
        'Gemini': '#4285f4',
        'Perplexity': '#20b2aa',
        'Unknown': '#6b7280'
      };
      
      this.elements.platformIndicator.style.background = platformColors[platform] || platformColors['Unknown'];
    } catch (error) {
      console.error('Error detecting platform:', error);
    }
  }

  getPlatformFromUrl(url) {
    if (url.includes('chat.openai.com')) return 'ChatGPT';
    if (url.includes('claude.ai')) return 'Claude';
    if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'Gemini';
    if (url.includes('perplexity.ai')) return 'Perplexity';
    if (url.includes('poe.com')) return 'Poe';
    return 'Unknown';
  }

  async toggleNavigationPanel() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Toggle the navigation panel
          let panel = document.getElementById('prompt-navigator-panel');
          if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
          } else {
            // Create and inject the navigation panel
            window.promptNavigator?.createNavigationPanel();
          }
        }
      });

      this.showNotification('Navigation panel toggled');
    } catch (error) {
      console.error('Error toggling panel:', error);
      this.showNotification('Error toggling panel', 'error');
    }
  }

  async extractCurrentPrompt() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Platform-specific selectors for input areas
          const selectors = [
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="prompt"]',
            'div[contenteditable="true"]',
            'textarea[data-testid="textbox"]',
            '.ProseMirror',
            'textarea',
            'input[type="text"]'
          ];

          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && (element.value || element.textContent)) {
              return element.value || element.textContent.trim();
            }
          }
          return null;
        }
      });

      const extractedText = result[0]?.result;
      if (extractedText) {
        this.elements.promptInput.value = extractedText;
        this.showNotification('Prompt extracted successfully');
      } else {
        this.showNotification('No prompt found to extract', 'warning');
      }
    } catch (error) {
      console.error('Error extracting prompt:', error);
      this.showNotification('Error extracting prompt', 'error');
    }
  }

  async optimizePrompt() {
    const promptText = this.elements.promptInput.value.trim();
    if (!promptText) {
      this.showNotification('Please enter a prompt to optimize', 'warning');
      return;
    }

    // Simple prompt optimization suggestions
    const optimizations = [
      'Be specific and clear about what you want',
      'Include context and background information',
      'Specify the desired output format',
      'Use examples when helpful',
      'Break complex requests into steps'
    ];

    const optimizedPrompt = this.applyBasicOptimizations(promptText);
    this.elements.promptInput.value = optimizedPrompt;
    
    this.showNotification('Prompt optimized with basic improvements');
  }

  applyBasicOptimizations(prompt) {
    let optimized = prompt;

    // Add structure if missing
    if (!optimized.includes('Please') && !optimized.includes('Could you')) {
      optimized = 'Please ' + optimized.toLowerCase();
    }

    // Ensure it ends with proper punctuation
    if (!/[.!?]$/.test(optimized.trim())) {
      optimized += '.';
    }

    // Add clarity request if it's a short prompt
    if (optimized.length < 50 && !optimized.includes('detailed') && !optimized.includes('specific')) {
      optimized += ' Please provide a detailed and specific response.';
    }

    return optimized;
  }

  async savePrompt() {
    const promptText = this.elements.promptInput.value.trim();
    if (!promptText) {
      this.showNotification('Please enter a prompt to save', 'warning');
      return;
    }

    try {
      const result = await chrome.storage.local.get(['prompts']);
      const prompts = result.prompts || [];

      const newPrompt = {
        id: Date.now(),
        text: promptText,
        title: this.generatePromptTitle(promptText),
        createdAt: new Date().toISOString(),
        platform: this.elements.platformIndicator.textContent,
        usageCount: 0
      };

      prompts.unshift(newPrompt);
      
      // Keep only the latest 50 prompts
      if (prompts.length > 50) {
        prompts.splice(50);
      }

      await chrome.storage.local.set({ prompts });
      
      this.displaySavedPrompts(prompts);
      this.updateStats(prompts.length);
      this.elements.promptInput.value = '';
      
      this.showNotification('Prompt saved successfully');
    } catch (error) {
      console.error('Error saving prompt:', error);
      this.showNotification('Error saving prompt', 'error');
    }
  }

  generatePromptTitle(prompt) {
    // Extract first meaningful words or create title based on content
    const words = prompt.split(' ').slice(0, 6);
    let title = words.join(' ');
    
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }
    
    return title || 'Untitled Prompt';
  }

  displaySavedPrompts(prompts) {
    if (prompts.length === 0) {
      this.elements.savedPrompts.innerHTML = `
        <div style="text-align: center; opacity: 0.6; padding: 20px; font-size: 14px;">
          No prompts saved yet
        </div>
      `;
      return;
    }

    this.elements.savedPrompts.innerHTML = prompts.map(prompt => `
      <div class="prompt-item" data-id="${prompt.id}">
        <div class="prompt-title">${this.escapeHtml(prompt.title)}</div>
        <div class="prompt-preview">${this.escapeHtml(this.truncateText(prompt.text, 80))}</div>
      </div>
    `).join('');

    // Add click listeners to prompt items
    this.elements.savedPrompts.querySelectorAll('.prompt-item').forEach(item => {
      item.addEventListener('click', async () => {
        const promptId = parseInt(item.dataset.id);
        const prompt = prompts.find(p => p.id === promptId);
        if (prompt) {
          await this.usePrompt(prompt);
        }
      });
    });
  }

  async usePrompt(prompt) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (promptText) => {
          // Platform-specific selectors for input areas
          const selectors = [
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="prompt"]',
            'div[contenteditable="true"]',
            'textarea[data-testid="textbox"]',
            '.ProseMirror',
            'textarea'
          ];

          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                element.value = promptText;
                element.dispatchEvent(new Event('input', { bubbles: true }));
              } else {
                element.textContent = promptText;
                element.dispatchEvent(new Event('input', { bubbles: true }));
              }
              element.focus();
              return true;
            }
          }
          return false;
        },
        args: [prompt.text]
      });

      // Update usage count
      const result = await chrome.storage.local.get(['prompts', 'stats']);
      const prompts = result.prompts || [];
      const stats = result.stats || { used: 0, platforms: new Set() };

      const promptIndex = prompts.findIndex(p => p.id === prompt.id);
      if (promptIndex !== -1) {
        prompts[promptIndex].usageCount++;
        stats.used++;
        
        await chrome.storage.local.set({ prompts, stats });
        this.updateStats(prompts.length, stats.used);
      }

      this.showNotification('Prompt applied successfully');
      window.close();
    } catch (error) {
      console.error('Error using prompt:', error);
      this.showNotification('Error applying prompt', 'error');
    }
  }

  updateStats(saved, used = 0, platforms = 0) {
    this.elements.savedCount.textContent = saved;
    this.elements.usedCount.textContent = used;
    this.elements.platformCount.textContent = platforms;
  }

  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = 'success') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    new PromptNavigatorPopup();
    console.log('🧭 Prompt Navigator popup initialized successfully');
  } catch (error) {
    console.error('Error initializing Prompt Navigator popup:', error);
  }
});