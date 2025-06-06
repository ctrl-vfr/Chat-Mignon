(function (NS) {
  class StyleManager {
    constructor() {
      this.baseScale = 2;
      this.defaultMarginBottom = -5; // New default margin
      this.sleepMarginBottom = 5;    // Margin when cat sleeps
    }

    // Base styles for cat
    getBaseCatStyles() {
      return {
        position: 'absolute',
        bottom: `${this.defaultMarginBottom}px`,
        width: '32px',
        height: '32px',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        transform: `scale(${this.baseScale})`,
        transformOrigin: 'bottom center',
        pointerEvents: 'auto',
        cursor: 'pointer'
      };
    }

    // Styles for sleeping cat
    getSleepingCatStyles() {
      return {
        ...this.getBaseCatStyles(),
        bottom: `${this.sleepMarginBottom}px`
      };
    }

    // Base styles for bed
    getBaseBedStyles() {
      return {
        position: 'fixed',
        bottom: '-25px',
        width: '64px',
        height: '32px',
        backgroundSize: '64px 32px',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        zIndex: '999998',
        pointerEvents: 'auto',
        transform: `scale(${this.baseScale})`,
        transformOrigin: 'bottom center',
        cursor: 'grab'
      };
    }

    // Base styles for toy
    getBaseToyStyles() {
      return {
        position: 'fixed',
        bottom: '0px',
        width: '32px',
        height: '32px',
        backgroundSize: '32px 32px',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        zIndex: '999997',
        pointerEvents: 'auto',
        transform: `scale(${this.baseScale})`,
        transformOrigin: 'bottom center',
        cursor: 'grab'
      };
    }

    // Styles for cat overlay
    getOverlayStyles() {
      return {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '999999'
      };
    }

    // Apply styles to an element
    applyStyles(element, styles) {
      if (!element) return;
      
      Object.keys(styles).forEach(property => {
        element.style[property] = styles[property];
      });
    }

    // Update cat styles according to its state
    updateCatStyles(catElement, isSleeping = false) {
      if (!catElement) return;
      
      const styles = isSleeping ? this.getSleepingCatStyles() : this.getBaseCatStyles();
      this.applyStyles(catElement, styles);
    }

    // Check if element is off-screen and reset if necessary
    checkAndResetPosition(element, getDefaultPosition) {
      if (!element) return false;
      
      const elementLeft = parseInt(element.style.left) || 0;
      const elementWidth = element.offsetWidth || 64; // Default width
      
      // Check if element is completely off-screen
      if (elementLeft < -elementWidth || elementLeft > window.innerWidth) {
        const defaultPosition = getDefaultPosition();
        element.style.left = `${defaultPosition}px`;
        return true; // Position reset
      }
      
      return false; // Position OK
    }

    // Calculate default toy position near bed
    calculateToyPositionNearBed(bedElement) {
      if (!bedElement) {
        // Default position if no bed
        return (window.innerWidth / 3) - 32;
      }
      
      const bedLeft = parseInt(bedElement.style.left) || 0;
      const bedWidth = 128; // 64px * 2 (scale)
      
      // Place toy next to bed (left side with small gap)
      const toyPosition = Math.max(32, bedLeft - 80); // -80 to leave space
      
      // Ensure toy stays on screen
      return Math.min(toyPosition, window.innerWidth - 64);
    }
  }

  NS.StyleManager = StyleManager;
})(window.CC); 