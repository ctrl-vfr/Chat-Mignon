(function (NS) {
  const { StyleManager } = NS;
  
  class CatBed {
    constructor(browserAPI, storageManager, savedPosition = null) {
      this.browserAPI = browserAPI;
      this.storageManager = storageManager;
      this.styleManager = new StyleManager();
      this.bedElement = null;
      
      this.createBed(savedPosition);
    }

    createBed(savedPosition = null) {
      // Check if bed already exists
      const existingBed = document.getElementById('cute-cat-bed');
      if (existingBed) {
        this.bedElement = existingBed;
        return;
      }
      
      // Calculate bed position
      let bedPixelPosition;
      if (savedPosition !== null) {
        // Use saved position
        bedPixelPosition = savedPosition;
      } else {
        // Default position (at 2/3 of screen)
        bedPixelPosition = (window.innerWidth * 2 / 3) - 64;
      }
      
      // Create bed element
      const bed = document.createElement('div');
      bed.id = 'cute-cat-bed';
      
      // Apply base styles
      this.styleManager.applyStyles(bed, this.styleManager.getBaseBedStyles());
      
      // Add background image
      bed.style.backgroundImage = `url(${this.browserAPI.runtime.getURL('assets/materials/catBed.png')})`;
      
      // Position the bed
      bed.style.left = `${Math.max(0, bedPixelPosition)}px`;
      
      // Add event listeners for drag
      this.makeDraggable(bed);
      
      // Add to body
      document.body.appendChild(bed);
      this.bedElement = bed;
    }

    makeDraggable(bedElement) {
      let isDragging = false;
      let startX = 0;
      let startLeft = 0;
      
      bedElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startLeft = parseInt(bedElement.style.left) || 0;
        bedElement.style.cursor = 'grabbing';
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const newLeft = Math.max(0, Math.min(window.innerWidth - 128, startLeft + deltaX)); // 128 = bed width × 2
        bedElement.style.left = `${newLeft}px`;
      });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          bedElement.style.cursor = 'grab';
          // Save new bed position
          this.savePosition();
        }
      });
    }

    async savePosition() {
      if (!this.bedElement) return;
      const bedLeft = parseInt(this.bedElement.style.left) || 0;
      await this.storageManager.saveBedPosition(bedLeft);
    }

    getElement() {
      return this.bedElement;
    }

    destroy() {
      if (this.bedElement) {
        this.bedElement.remove();
        this.bedElement = null;
      }
    }
  }

  NS.CatBed = CatBed;
})(window.CC); 