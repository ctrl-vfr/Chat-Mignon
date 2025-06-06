(function (NS) {
  const { StyleManager } = NS;
  
  class CatToy {
    constructor(browserAPI, storageManager, savedPosition = null, bedElement = null) {
      this.browserAPI = browserAPI;
      this.storageManager = storageManager;
      this.styleManager = new StyleManager();
      this.toyElement = null;
      this.bedElement = bedElement; // Reference to bed for calculating initial position
      
      this.createToy(savedPosition);
    }

    createToy(savedPosition = null) {
      // Check if toy already exists
      const existingToy = document.getElementById('cute-cat-toy');
      if (existingToy) {
        this.toyElement = existingToy;
        return;
      }
      
      // Calculate toy position
      let toyPixelPosition;
      if (savedPosition !== null) {
        // Use saved position
        toyPixelPosition = savedPosition;
      } else {
        // NEW RULE: Initial position near bed
        toyPixelPosition = this.styleManager.calculateToyPositionNearBed(this.bedElement);
      }
      
      // Create toy element
      const toy = document.createElement('div');
      toy.id = 'cute-cat-toy';
      
      // Apply base styles
      this.styleManager.applyStyles(toy, this.styleManager.getBaseToyStyles());
      
      // Add background image
      toy.style.backgroundImage = `url(${this.browserAPI.runtime.getURL('assets/materials/toy.png')})`;
      
      // Position the toy
      toy.style.left = `${Math.max(0, toyPixelPosition)}px`;
      
      // Add event listeners for drag
      this.makeDraggable(toy);
      
      // Add to body
      document.body.appendChild(toy);
      this.toyElement = toy;
    }

    makeDraggable(toyElement) {
      let isDragging = false;
      let startX = 0;
      let startLeft = 0;
      
      toyElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startLeft = parseInt(toyElement.style.left) || 0;
        toyElement.style.cursor = 'grabbing';
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const newLeft = Math.max(0, Math.min(window.innerWidth - 64, startLeft + deltaX)); // 64 = toy width × 2
        toyElement.style.left = `${newLeft}px`;
      });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          toyElement.style.cursor = 'grab';
          // Save new toy position
          this.savePosition();
        }
      });
    }

    async savePosition() {
      if (!this.toyElement) return;
      const toyLeft = parseInt(this.toyElement.style.left) || 0;
      await this.storageManager.saveToyPosition(toyLeft);
    }

    getElement() {
      return this.toyElement;
    }

    destroy() {
      if (this.toyElement) {
        this.toyElement.remove();
        this.toyElement = null;
      }
    }
  }

  NS.CatToy = CatToy;
})(window.CC); 