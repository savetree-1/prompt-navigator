// Content script for Prompt Navigator extension

class PromptNavigator {
  constructor() {
    this.platform = this.detectPlatform();
    this.isInitialized = false;
    this.navigationPanel = null;
    this.prompts = [];
    
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    this.loadPrompts();
    this.createNavigationPanel();
    this.setupKeyboardShortcuts();
    this.observePageChanges();
    
    this.isInitialized = true;
    console.log('🧭 Prompt Navigator initialized on', this.platform);
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chat.openai.com')) return 'ChatGPT';
    if (hostname.includes('claude.ai')) return 'Claude';
    if (hostname.includes('gemini.google.com') || hostname.includes('bard.google.com')) return 'Gemini';
    if (hostname.includes('perplexity.ai')) return 'Perplexity';
    if (hostname.includes('poe.com')) return 'Poe';
    return 'Unknown';
  }

  async loadPrompts() {
    try {
      const result = await chrome.storage.local.get(['prompts']);
      this.prompts = result.prompts || [];
    } catch (error) {
      console.error('Error loading prompts:', error);
      this.prompts = [];
    }
  }

  createNavigationPanel() {
    try {
      if (this.navigationPanel) {
        this.navigationPanel.remove();
      }

      this.navigationPanel = document.createElement('div');
      this.navigationPanel.id = 'prompt-navigator-panel';
      this.navigationPanel.innerHTML = this.getPanelHTML();
      
      document.body.appendChild(this.navigationPanel);
      this.attachPanelEventListeners();
    } catch (error) {
      console.error('Error creating navigation panel:', error);
    }
  }

  getPanelHTML() {
    return `
      <div class="pn-panel">
        <div class="pn-header">
          <div class="pn-title">
            <span class="pn-icon">🧭</span>
            Prompt Navigator
            <span class="pn-platform">${this.platform}</span>
          </div>
          <button class="pn-close" id="pn-close">×</button>
        </div>
        
        <div class="pn-tabs">
          <button class="pn-tab active" data-tab="quick">Quick</button>
          <button class="pn-tab" data-tab="saved">Saved</button>
          <button class="pn-tab" data-tab="templates">Templates</button>
        </div>

        <div class="pn-content">
          <div class="pn-tab-content active" id="pn-quick">
            <div class="pn-quick-actions">
              <button class="pn-action-btn" id="pn-extract">Extract Prompt</button>
              <button class="pn-action-btn" id="pn-optimize">Optimize</button>
              <button class="pn-action-btn" id="pn-save">Save Current</button>
            </div>
            
            <div class="pn-input-section">
              <textarea class="pn-textarea" id="pn-input" placeholder="Enter or paste your prompt here..."></textarea>
              <button class="pn-apply-btn" id="pn-apply">Apply Prompt</button>
            </div>
          </div>

          <div class="pn-tab-content" id="pn-saved">
            <div class="pn-search">
              <input type="text" class="pn-search-input" id="pn-search" placeholder="Search saved prompts...">
            </div>
            <div class="pn-prompts-list" id="pn-prompts-list">
              <!-- Prompts will be populated here -->
            </div>
          </div>

          <div class="pn-tab-content" id="pn-templates">
            <div class="pn-templates-grid" id="pn-templates-grid">
              <!-- Templates will be populated here -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachPanelEventListeners() {
    try {
      // Close panel
      const closeBtn = document.getElementById('pn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          if (this.navigationPanel) {
            this.navigationPanel.style.display = 'none';
          }
        });
      }

      // Tab switching
      document.querySelectorAll('.pn-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const targetTab = e.target.dataset.tab;
          this.switchTab(targetTab);
        });
      });

      // Quick actions
      const extractBtn = document.getElementById('pn-extract');
      if (extractBtn) {
        extractBtn.addEventListener('click', () => this.extractPrompt());
      }

      const optimizeBtn = document.getElementById('pn-optimize');
      if (optimizeBtn) {
        optimizeBtn.addEventListener('click', () => this.optimizePrompt());
      }

      const saveBtn = document.getElementById('pn-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveCurrentPrompt());
      }

      const applyBtn = document.getElementById('pn-apply');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => this.applyPrompt());
      }

      // Search
      const searchInput = document.getElementById('pn-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.filterPrompts(e.target.value);
        });
      }

      // Load content for tabs
      this.loadSavedPrompts();
      this.loadTemplates();
    } catch (error) {
      console.error('Error attaching panel event listeners:', error);
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.pn-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.pn-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `pn-${tabName}`);
    });
  }

  extractPrompt() {
    const inputElement = this.findInputElement();
    if (inputElement) {
      const promptText = inputElement.value || inputElement.textContent || '';
      document.getElementById('pn-input').value = promptText;
      this.showToast('Prompt extracted successfully', 'success');
    } else {
      this.showToast('No input found to extract from', 'warning');
    }
  }

  optimizePrompt() {
    const textarea = document.getElementById('pn-input');
    const promptText = textarea.value.trim();
    
    if (!promptText) {
      this.showToast('Please enter a prompt to optimize', 'warning');
      return;
    }

    const optimizedPrompt = this.applyOptimizations(promptText);
    textarea.value = optimizedPrompt;
    this.showToast('Prompt optimized', 'success');
  }

  applyOptimizations(prompt) {
    let optimized = prompt;

    // Add role definition if missing
    if (!optimized.toLowerCase().includes('you are') && !optimized.toLowerCase().includes('act as')) {
      optimized = 'You are a helpful AI assistant. ' + optimized;
    }

    // Add structure for better clarity
    if (!optimized.includes('Please') && !optimized.includes('Could you')) {
      optimized = optimized.replace(/^[a-z]/, match => match.toUpperCase());
      if (!optimized.startsWith('Please')) {
        optimized = 'Please ' + optimized.toLowerCase();
      }
    }

    // Ensure proper punctuation
    if (!/[.!?]$/.test(optimized.trim())) {
      optimized += '.';
    }

    // Add output format specification for short prompts
    if (optimized.length < 100 && !optimized.toLowerCase().includes('format')) {
      optimized += ' Please provide a clear and detailed response.';
    }

    return optimized;
  }

  async saveCurrentPrompt() {
    const textarea = document.getElementById('pn-input');
    const promptText = textarea.value.trim();
    
    if (!promptText) {
      this.showToast('Please enter a prompt to save', 'warning');
      return;
    }

    try {
      const result = await chrome.storage.local.get(['prompts']);
      const prompts = result.prompts || [];

      const newPrompt = {
        id: Date.now(),
        text: promptText,
        title: this.generateTitle(promptText),
        createdAt: new Date().toISOString(),
        platform: this.platform,
        usageCount: 0,
        category: this.categorizePrompt(promptText)
      };

      prompts.unshift(newPrompt);
      
      if (prompts.length > 100) {
        prompts.splice(100);
      }

      await chrome.storage.local.set({ prompts });
      this.prompts = prompts;
      
      this.loadSavedPrompts();
      this.showToast('Prompt saved successfully', 'success');
      
      textarea.value = '';
    } catch (error) {
      console.error('Error saving prompt:', error);
      this.showToast('Error saving prompt', 'error');
    }
  }

  applyPrompt() {
    const textarea = document.getElementById('pn-input');
    const promptText = textarea.value.trim();
    
    if (!promptText) {
      this.showToast('Please enter a prompt to apply', 'warning');
      return;
    }

    const inputElement = this.findInputElement();
    if (inputElement) {
      this.insertText(inputElement, promptText);
      this.showToast('Prompt applied successfully', 'success');
      this.navigationPanel.style.display = 'none';
    } else {
      this.showToast('Could not find input element', 'error');
    }
  }

  findInputElement() {
    const selectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="prompt"]',
      'div[contenteditable="true"]',
      'textarea[data-testid="textbox"]',
      '.ProseMirror',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Type"]',
      'textarea',
      'input[type="text"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && this.isVisibleElement(element)) {
        return element;
      }
    }
    return null;
  }

  isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           window.getComputedStyle(element).display !== 'none';
  }

  insertText(element, text) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
      element.textContent = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    element.focus();
  }

  loadSavedPrompts() {
    const container = document.getElementById('pn-prompts-list');
    if (!container) return;

    if (this.prompts.length === 0) {
      container.innerHTML = `
        <div class="pn-empty">
          <div class="pn-empty-icon">📝</div>
          <div class="pn-empty-text">No saved prompts yet</div>
          <div class="pn-empty-subtext">Save prompts to access them quickly</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.prompts.map(prompt => `
      <div class="pn-prompt-item" data-id="${prompt.id}">
        <div class="pn-prompt-header">
          <div class="pn-prompt-title">${this.escapeHtml(prompt.title)}</div>
          <div class="pn-prompt-meta">
            <span class="pn-prompt-category">${prompt.category || 'General'}</span>
            <span class="pn-prompt-usage">Used ${prompt.usageCount || 0} times</span>
          </div>
        </div>
        <div class="pn-prompt-preview">${this.escapeHtml(this.truncateText(prompt.text, 120))}</div>
        <div class="pn-prompt-actions">
          <button class="pn-prompt-action" onclick="window.promptNavigator.usePrompt(${prompt.id})">Use</button>
          <button class="pn-prompt-action" onclick="window.promptNavigator.editPrompt(${prompt.id})">Edit</button>
          <button class="pn-prompt-action delete" onclick="window.promptNavigator.deletePrompt(${prompt.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }

  loadTemplates() {
    const container = document.getElementById('pn-templates-grid');
    if (!container) return;

    const templates = [
      {
        title: '📝 Content Writing',
        description: 'Create engaging content',
        prompt: 'You are an expert content writer. Please create engaging, well-structured content about [TOPIC]. Make it informative, easy to read, and optimized for the target audience. Include relevant examples and actionable insights.'
      },
      {
        title: '🔍 Research Assistant',
        description: 'Comprehensive research help',
        prompt: 'You are a thorough research assistant. Please provide comprehensive information about [TOPIC], including key facts, different perspectives, recent developments, and credible sources. Structure the information clearly and highlight the most important points.'
      },
      {
        title: '💡 Problem Solver',
        description: 'Structured problem solving',
        prompt: 'You are an analytical problem solver. Please help me solve this problem: [PROBLEM]. Break down the problem, identify key factors, generate multiple solution approaches, evaluate pros and cons, and recommend the best solution with implementation steps.'
      },
      {
        title: '🎓 Learning Tutor',
        description: 'Educational assistance',
        prompt: 'You are a patient and knowledgeable tutor. Please explain [CONCEPT] in a clear, step-by-step manner. Use simple language, provide examples, and check my understanding. Adapt your explanation to my learning level and pace.'
      },
      {
        title: '💼 Business Analyst',
        description: 'Business strategy and analysis',
        prompt: 'You are an experienced business analyst. Please analyze [BUSINESS SITUATION] and provide strategic recommendations. Include market analysis, competitive landscape, risks, opportunities, and actionable next steps.'
      },
      {
        title: '🔧 Code Helper',
        description: 'Programming assistance',
        prompt: 'You are an expert programmer. Please help me with [PROGRAMMING TASK]. Provide clean, well-commented code, explain the logic, suggest best practices, and include error handling where appropriate. Use [PROGRAMMING LANGUAGE] if specified.'
      }
    ];

    container.innerHTML = templates.map((template, index) => `
      <div class="pn-template-card" onclick="window.promptNavigator.useTemplate(${index})">
        <div class="pn-template-title">${template.title}</div>
        <div class="pn-template-description">${template.description}</div>
      </div>
    `).join('');
  }

  async usePrompt(promptId) {
    const prompt = this.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    document.getElementById('pn-input').value = prompt.text;
    
    // Update usage count
    try {
      prompt.usageCount = (prompt.usageCount || 0) + 1;
      await chrome.storage.local.set({ prompts: this.prompts });
      this.loadSavedPrompts();
    } catch (error) {
      console.error('Error updating usage count:', error);
    }
    
    this.switchTab('quick');
  }

  useTemplate(templateIndex) {
    const templates = [
      'You are an expert content writer. Please create engaging, well-structured content about [TOPIC]. Make it informative, easy to read, and optimized for the target audience. Include relevant examples and actionable insights.',
      'You are a thorough research assistant. Please provide comprehensive information about [TOPIC], including key facts, different perspectives, recent developments, and credible sources. Structure the information clearly and highlight the most important points.',
      'You are an analytical problem solver. Please help me solve this problem: [PROBLEM]. Break down the problem, identify key factors, generate multiple solution approaches, evaluate pros and cons, and recommend the best solution with implementation steps.',
      'You are a patient and knowledgeable tutor. Please explain [CONCEPT] in a clear, step-by-step manner. Use simple language, provide examples, and check my understanding. Adapt your explanation to my learning level and pace.',
      'You are an experienced business analyst. Please analyze [BUSINESS SITUATION] and provide strategic recommendations. Include market analysis, competitive landscape, risks, opportunities, and actionable next steps.',
      'You are an expert programmer. Please help me with [PROGRAMMING TASK]. Provide clean, well-commented code, explain the logic, suggest best practices, and include error handling where appropriate. Use [PROGRAMMING LANGUAGE] if specified.'
    ];

    if (templates[templateIndex]) {
      document.getElementById('pn-input').value = templates[templateIndex];
      this.switchTab('quick');
    }
  }

  async deletePrompt(promptId) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      this.prompts = this.prompts.filter(p => p.id !== promptId);
      await chrome.storage.local.set({ prompts: this.prompts });
      this.loadSavedPrompts();
      this.showToast('Prompt deleted', 'success');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      this.showToast('Error deleting prompt', 'error');
    }
  }

  filterPrompts(searchTerm) {
    const items = document.querySelectorAll('.pn-prompt-item');
    const term = searchTerm.toLowerCase();

    items.forEach(item => {
      const title = item.querySelector('.pn-prompt-title').textContent.toLowerCase();
      const preview = item.querySelector('.pn-prompt-preview').textContent.toLowerCase();
      const matches = title.includes(term) || preview.includes(term);
      item.style.display = matches ? 'block' : 'none';
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + P to toggle panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        if (this.navigationPanel.style.display === 'none') {
          this.navigationPanel.style.display = 'flex';
        } else {
          this.navigationPanel.style.display = 'none';
        }
      }

      // Escape to close panel
      if (e.key === 'Escape' && this.navigationPanel.style.display !== 'none') {
        this.navigationPanel.style.display = 'none';
      }
    });
  }

  observePageChanges() {
    // Watch for dynamic content changes on SPA platforms
    const observer = new MutationObserver(() => {
      if (!document.getElementById('prompt-navigator-panel')) {
        this.createNavigationPanel();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  generateTitle(prompt) {
    const words = prompt.trim().split(' ');
    let title = words.slice(0, 8).join(' ');
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'Untitled Prompt';
  }

  categorizePrompt(prompt) {
    const categories = {
      'Writing': ['write', 'content', 'article', 'blog', 'copy'],
      'Code': ['code', 'program', 'function', 'script', 'debug'],
      'Research': ['research', 'analyze', 'study', 'investigate'],
      'Learning': ['explain', 'teach', 'learn', 'understand'],
      'Business': ['business', 'strategy', 'market', 'analysis'],
      'Creative': ['creative', 'story', 'design', 'brainstorm']
    };

    const lowerPrompt = prompt.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showToast(message, type = 'success') {
    const existingToast = document.querySelector('.pn-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `pn-toast pn-toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('pn-toast-show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('pn-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.promptNavigator = new PromptNavigator();
  });
} else {
  window.promptNavigator = new PromptNavigator();
}

// Handle dynamic page changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      if (!window.promptNavigator || !window.promptNavigator.isInitialized) {
        window.promptNavigator = new PromptNavigator();
      }
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });