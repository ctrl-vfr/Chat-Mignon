class CatPopup {
  constructor() {
    this.selectedSkin = 'whiteeyes';
    this.chatDisabled = false;
    
    // Use browser API for Firefox, with fallback to chrome
    this.browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    
    // Check storage API availability
    if (!this.browserAPI || !this.browserAPI.storage) {
      console.error('[CuteCat] Storage API not available');
      this.showError('Storage API not available. Please reload the extension.');
      return;
    }
    
    // List of available skins with their display names
    this.availableSkins = {
      'whiteeyes': 'White Cat',
      'black': 'Black Cat',
      'brown': 'Brown Cat',
      'siamese': 'Siamese',
      'blackcollar': 'Black Collar',
      'blue': 'Blue Collar',
      'green': 'Green Collar',
      'orange': 'Orange Collar',
      'pink': 'Pink Collar',
      'purple': 'Purple Collar',
      'red': 'Red Collar',
      'yellow': 'Yellow Collar',
      'ninja': 'Ninja Cat',
      'bunny': 'Bunny',
      'batman': 'Batman',
      'christmas': 'Christmas',
      'demonic': 'Demonic',
      'egypt': 'Egyptian',
      'threecolor': 'Three Color',
      'tiger': 'Tiger'
    };
    
    this.init();
  }
  
  showError(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = '#f44336';
    }
  }
  
  async init() {
    try {
      await this.loadSettings();
      this.setupUI();
      this.bindEvents();
    } catch (error) {
      console.error('[CuteCat] Initialization error:', error);
      this.showError('Initialization error: ' + error.message);
    }
  }
  
  async loadSettings() {
    try {
      // Check if storage.sync is available
      if (!this.browserAPI.storage.sync) {
        console.warn('[CuteCat] Storage.sync not available, using storage.local');
        
        const result = await this.browserAPI.storage.local.get([
          'selectedSkin', 
          'chatDisabled',
          'firstTimeOpened'
        ]);
        
        this.selectedSkin = result.selectedSkin || 'whiteeyes';
        this.chatDisabled = result.chatDisabled || false;
        this.checkAndShowFirstTimeMessage(result.firstTimeOpened);
        return;
      }
      
      const result = await this.browserAPI.storage.sync.get([
        'selectedSkin', 
        'chatDisabled',
        'firstTimeOpened'
      ]);
      
      this.selectedSkin = result.selectedSkin || 'whiteeyes';
      this.chatDisabled = result.chatDisabled || false; // false by default
      this.checkAndShowFirstTimeMessage(result.firstTimeOpened);
      
    } catch (error) {
      console.error('[CuteCat] Error loading settings:', error);
      // Use default values on error
      this.selectedSkin = 'whiteeyes';
      this.chatDisabled = false;
    }
  }
  
  setupUI() {
    this.createSkinGrid();
    this.updateToggles();
  }
  
  checkAndShowFirstTimeMessage(firstTimeOpened) {
    if (firstTimeOpened === false) {
      // First time opening popup after installation
      this.showFirstTimeMessage();
      
      // Mark as opened
      const storageAPI = this.browserAPI.storage.sync || this.browserAPI.storage.local;
      storageAPI.set({ firstTimeOpened: true }).catch(error => {
        console.error('[CuteCat] Failed to update firstTimeOpened:', error);
      });
    }
  }
  
  showFirstTimeMessage() {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.innerHTML = '🐱 <strong>Welcome to CuteCat!</strong><br/>Please refresh your browser tabs to see your cute cat companion!';
      statusElement.style.color = '#4CAF50';
      statusElement.style.fontSize = '14px';
      statusElement.style.textAlign = 'center';
      statusElement.style.padding = '10px';
      statusElement.style.backgroundColor = '#f0f8f0';
      statusElement.style.border = '1px solid #4CAF50';
      statusElement.style.borderRadius = '5px';
      statusElement.style.marginBottom = '10px';
    }
  }
  
  createSkinGrid() {
    const skinGrid = document.getElementById('skinGrid');
    if (!skinGrid) {
      console.error('[CuteCat] skinGrid element not found');
      return;
    }
    
    skinGrid.innerHTML = '';
    
    Object.entries(this.availableSkins).forEach(([skinId, displayName]) => {
      const skinOption = document.createElement('div');
      skinOption.className = 'skin-option';
      skinOption.dataset.skin = skinId;
      
      if (skinId === this.selectedSkin) {
        skinOption.classList.add('selected');
      }
      
      // Create preview animation
      const preview = document.createElement('div');
      preview.className = 'skin-preview animated-preview';
      preview.style.width = '32px';
      preview.style.height = '32px';
      preview.style.margin = '0 auto 5px auto';
      preview.style.imageRendering = 'pixelated';
      preview.style.transform = 'scale(1.5)';
      preview.style.backgroundRepeat = 'no-repeat';
      preview.style.backgroundSize = 'auto 32px';
      
      
      const imageUrl = this.browserAPI.runtime.getURL(`assets/cats/${skinId}/idlecat.png`);
      
      // Try to load image and handle Firefox specific issues
      this.loadImageWithFallback(preview, imageUrl, skinId);
      
      const nameElement = document.createElement('div');
      nameElement.className = 'skin-name';
      nameElement.textContent = displayName;
      
      skinOption.appendChild(preview);
      skinOption.appendChild(nameElement);
      
      skinOption.addEventListener('click', () => {
        this.selectSkin(skinId);
      });
      
      skinGrid.appendChild(skinOption);
    });
  }
  
  async loadImageWithFallback(preview, imageUrl, skinId) {
    try {
      // First, try to load the image to check if it's accessible
      const testImg = new Image();
      
      testImg.onload = () => {
        // Image loaded successfully, use it as background
        preview.style.backgroundImage = `url(${imageUrl})`;
        this.startPreviewAnimation(preview, imageUrl);
      };
      
      testImg.onerror = () => {
        console.warn(`[CuteCat] Could not load preview image: ${imageUrl}`);
        // Fallback: show a colored square with the first letter of the skin name
        this.showFallbackPreview(preview, skinId);
      };
      
      testImg.src = imageUrl;
      
      // Timeout fallback after 2 seconds
      setTimeout(() => {
        if (!preview.style.backgroundImage || preview.style.backgroundImage === 'none') {
          console.warn(`[CuteCat] Timeout loading image, using fallback for: ${skinId}`);
          this.showFallbackPreview(preview, skinId);
        }
      }, 2000);
      
    } catch (error) {
      console.error('[CuteCat] Error loading image:', error);
      this.showFallbackPreview(preview, skinId);
    }
  }
  
  showFallbackPreview(preview, skinId) {
    // Show a colored square with the first letter as fallback
    const colors = {
      'whiteeyes': '#ffffff',
      'black': '#000000',
      'brown': '#8B4513',
      'siamese': '#F5DEB3',
      'blackcollar': '#2F2F2F',
      'blue': '#4169E1',
      'green': '#228B22',
      'orange': '#FF8C00',
      'pink': '#FF69B4',
      'purple': '#800080',
      'red': '#DC143C',
      'yellow': '#FFD700',
      'ninja': '#1C1C1C',
      'bunny': '#FFB6C1',
      'batman': '#000080',
      'christmas': '#DC143C',
      'demonic': '#8B0000',
      'egypt': '#DAA520',
      'threecolor': '#8B4513',
      'tiger': '#FF8C00'
    };
    
    const color = colors[skinId] || '#808080';
    const letter = this.availableSkins[skinId] ? this.availableSkins[skinId].charAt(0).toUpperCase() : '?';
    
    preview.style.background = color;
    preview.style.color = color === '#ffffff' || color === '#FFD700' || color === '#FFB6C1' ? '#000000' : '#ffffff';
    preview.style.display = 'flex';
    preview.style.alignItems = 'center';
    preview.style.justifyContent = 'center';
    preview.style.fontSize = '14px';
    preview.style.fontWeight = 'bold';
    preview.textContent = letter;
  }
  
  async startPreviewAnimation(element, imageUrl) {
    try {
      // Load image to determine frame count
      const img = new Image();
      img.onload = () => {
        const frameCount = Math.floor(img.width / 32);
        if (frameCount > 1) {
          let currentFrame = 0;
          
          // Start frame-by-frame animation
          setInterval(() => {
            const xPos = -currentFrame * 32;
            element.style.backgroundPosition = `${xPos}px 0px`;
            currentFrame = (currentFrame + 1) % frameCount;
          }, 600); // Slow animation for preview
        }
      };
      
      img.onerror = () => {
        console.error('[CuteCat] Failed to load preview image:', imageUrl);
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.error('[CuteCat] Error in preview animation:', error);
    }
  }
  
  selectSkin(skinId) {
    // Remove previous selection
    document.querySelectorAll('.skin-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    // Add selection to new option
    const selectedOption = document.querySelector(`[data-skin="${skinId}"]`);
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
    
    this.selectedSkin = skinId;
  }
  
  updateToggles() {
    const chatDisabledToggle = document.getElementById('chatDisabledToggle');
    
    if (chatDisabledToggle) {
      chatDisabledToggle.classList.toggle('active', this.chatDisabled);
    }
  }
  
  bindEvents() {
    // Toggle to disable cat
    const chatDisabledToggle = document.getElementById('chatDisabledToggle');
    if (chatDisabledToggle) {
      chatDisabledToggle.addEventListener('click', () => {
        this.chatDisabled = !this.chatDisabled;
        this.updateToggles();
      });
    }
    
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveSettings();
      });
    }
  }
  
  async saveSettings() {
    const statusElement = document.getElementById('status');
    
    if (!statusElement) {
      console.error('[CuteCat] status element not found');
      return;
    }
    
    try {
      const settings = {
        selectedSkin: this.selectedSkin,
        chatDisabled: this.chatDisabled
      };
      
      // Use storage.sync if available, otherwise storage.local
      const storageAPI = this.browserAPI.storage.sync || this.browserAPI.storage.local;
      
      await storageAPI.set(settings);
      
      statusElement.textContent = '✅ Settings saved!';
      statusElement.style.color = '#4CAF50';
      
      // Clear message after 2 seconds
      setTimeout(() => {
        statusElement.textContent = '';
      }, 2000);
      
    } catch (error) {
      console.error('[CuteCat] Error saving settings:', error);
      statusElement.textContent = '❌ Save error: ' + error.message;
      statusElement.style.color = '#f44336';
    }
  }
}

// Initialize popup when page is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CatPopup();
}); 