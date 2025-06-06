(function (NS) {
  class SpriteManager {
    constructor(browserAPI) {
      this.browserAPI = browserAPI;
      this.spriteCache = new Map();
      this.currentFrame = 0;
      this.frameInterval = 400; // 400ms per frame by default
      this.frameTimeout = null;
      
      // Animation mapping by skin
      this.animationMappings = {
        idle: 'idlecat.png',
        idle2: 'idle2cat.png',
        run: 'runcat.png',
        jump: 'jumpcat.png',
        sleep: 'sleepcat.png',
        sitting: 'sittingcat.png',
        attack: 'attackcat.png',
        hurt: 'hurtcat.png',
        die: 'diecat.png'
      };
      
      // Custom frame intervals for specific animations (in ms)
      this.customFrameIntervals = {
        attack: 800,  // Slower attack animation
        hurt: 600,    // Slightly slower hurt animation
        die: 700      // Slower death animation
      };
    }

    async loadSpriteInfo(spriteUrl) {
      // Return cached info if available
      if (this.spriteCache.has(spriteUrl)) {
        return this.spriteCache.get(spriteUrl);
      }
      
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const frameCount = Math.floor(img.width / 32);
          const spriteInfo = {
            width: img.width,
            height: img.height,
            frameCount: frameCount,
            frameWidth: 32,
            frameHeight: 32
          };
          
          // Cache the sprite info
          this.spriteCache.set(spriteUrl, spriteInfo);
          resolve(spriteInfo);
        };
        
        img.onerror = () => {
          console.error('[CuteCat] Failed to load sprite:', spriteUrl);
          // Return default values on error
          const defaultInfo = { frameCount: 1, frameWidth: 32, frameHeight: 32 };
          this.spriteCache.set(spriteUrl, defaultInfo);
          resolve(defaultInfo);
        };
        
        img.src = spriteUrl;
      });
    }

    updateCatFrame(catElement, spriteInfo) {
      if (!catElement || !spriteInfo) return;
      
      // Calculate X position of current frame
      const xPos = -this.currentFrame * 32;
      catElement.style.backgroundPosition = `${xPos}px 0px`;
    }

    async updateCatSprite(catElement, currentSkin, currentAnimation) {
      if (!catElement) return;
      const spriteUrl = this.browserAPI.runtime.getURL(`assets/cats/${currentSkin}/${this.animationMappings[currentAnimation]}`);
      
      // Load sprite information
      const spriteInfo = await this.loadSpriteInfo(spriteUrl);
      
      // Add custom frame interval if available
      spriteInfo.customFrameInterval = this.customFrameIntervals[currentAnimation] || this.frameInterval;
      spriteInfo.animationType = currentAnimation;
      
      // Update background
      catElement.style.backgroundImage = `url(${spriteUrl})`;
      catElement.style.backgroundSize = `${spriteInfo.width}px 32px`;
      
      return spriteInfo;
    }

    // Static animation (no movement)
    startStaticFrameAnimation(catElement, spriteInfo) {
      // Stop previous animation if any
      if (this.frameTimeout) {
        clearInterval(this.frameTimeout);
      }
      
      // No animation needed for single frame
      if (spriteInfo.frameCount <= 1) {
        this.currentFrame = 0;
        this.updateCatFrame(catElement, spriteInfo);
        return;
      }
      
      // Use custom frame interval if available, otherwise use default
      const frameInterval = spriteInfo.customFrameInterval || this.frameInterval;
      
      // Start classic frame-by-frame animation
      this.currentFrame = 0;
      this.updateCatFrame(catElement, spriteInfo);
      
      this.frameTimeout = setInterval(() => {
        this.currentFrame = (this.currentFrame + 1) % spriteInfo.frameCount;
        this.updateCatFrame(catElement, spriteInfo);
      }, frameInterval);
    }

    stopAnimation() {
      if (this.frameTimeout) {
        clearInterval(this.frameTimeout);
        this.frameTimeout = null;
      }
    }

    destroy() {
      this.stopAnimation();
      this.spriteCache.clear();
    }
  }

  NS.SpriteManager = SpriteManager;
})(window.CC); 