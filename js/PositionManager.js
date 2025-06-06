(function (NS) {
  class PositionManager {
    constructor() {
      this.maxPosition = 20; // Total number of grid positions on screen
      this.caseWidth = null; // Will be calculated based on screen width
      this.caseSize = 8; // Size of one grid case in pixels
      
      this.calculateCaseWidth();
      
      // Recalculate case width if window is resized
      window.addEventListener('resize', () => {
        this.calculateCaseWidth();
      });
    }

    calculateCaseWidth() {
      // Calculate case width based on window width
      const screenWidth = window.innerWidth;
      this.caseWidth = screenWidth / this.maxPosition;
    }

    // Convert case position to pixels (centered on case)
    caseToPixels(casePosition) {
      return (casePosition * this.caseWidth) - (this.caseWidth / 2) - 32; // -32 to center 64px sprite
    }

    // Convert pixel position to case position
    pixelsToCase(pixelPosition) {
      return (pixelPosition + (this.caseWidth / 2)) / this.caseWidth;
    }

    // Get current cat position in pixels
    getCatPixelPosition(currentPosition) {
      if (!this.caseWidth) return 0;
      return (currentPosition * this.caseWidth) - (this.caseWidth / 2);
    }

    // Get current bed position in pixels (center of bed)
    getBedPixelPosition(bedElement) {
      // First verify that element exists and is in DOM
      if (!bedElement || !document.body.contains(bedElement)) {
        return null;
      }
      
      const bedLeft = parseInt(bedElement.style.left);
      if (isNaN(bedLeft)) {
        return null;
      }
      
      return bedLeft + 64; // +64 to get bed center (64px width after scale)
    }

    // Check if cat is close to bed (based on real pixel positions)
    checkIfOnBed(currentPosition, bedElement) {
      const catPixelPos = this.getCatPixelPosition(currentPosition);
      const bedPixelPos = this.getBedPixelPosition(bedElement);
      
      if (bedPixelPos === null) {
        return false;
      }
      
      // Cat is considered on bed if within 128px zone centered on bed
      // (64px on each side of bed center, which is the bed width after scale)
      const distance = Math.abs(catPixelPos - bedPixelPos);
      const isOnBed = distance <= 64; // 64px = bed width after scale / 2
      
      return isOnBed;
    }

    // Check if cat crosses bed zone during movement (based on pixels)
    checkIfCrossingBed(startPosition, endPosition, bedElement) {
      const bedPixelPos = this.getBedPixelPosition(bedElement);
      if (bedPixelPos === null) {
        return false;
      }
      
      // Convert case positions to pixels
      const startPixelPos = (startPosition * this.caseWidth) - (this.caseWidth / 2);
      const endPixelPos = (endPosition * this.caseWidth) - (this.caseWidth / 2);
      
      // Define bed zone in pixels (128px width centered on bed)
      const bedZoneStart = bedPixelPos - 64;
      const bedZoneEnd = bedPixelPos + 64;
      
      // Check if cat path intersects with bed zone
      const minPos = Math.min(startPixelPos, endPixelPos);
      const maxPos = Math.max(startPixelPos, endPixelPos);
      
      // There's intersection if intervals overlap
      const crossing = maxPos >= bedZoneStart && minPos <= bedZoneEnd;
      
      return crossing;
    }

    // Determine movement direction and distance
    selectMovement(scenario, currentPosition, movementRanges) {
      const range = movementRanges[scenario];
      if (!range) return { direction: 'right', distance: 0 };
      
      // Random distance within range
      const distance = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      
      // Calculate limits for each direction
      const canGoLeft = currentPosition - distance >= 0;
      const canGoRight = currentPosition + distance <= this.maxPosition;
      
      let direction;
      if (canGoLeft && canGoRight) {
        // Both directions are possible, choose randomly
        direction = Math.random() < 0.5 ? 'left' : 'right';
      } else if (canGoLeft) {
        direction = 'left';
      } else if (canGoRight) {
        direction = 'right';
      } else {
        // No direction possible with this distance, reduce distance
        const maxLeftDistance = currentPosition;
        const maxRightDistance = this.maxPosition - currentPosition;
        const maxDistance = Math.max(maxLeftDistance, maxRightDistance);
        
        if (maxDistance === 0) return { direction: 'right', distance: 0 };
        
        const adjustedDistance = Math.min(distance, maxDistance);
        direction = maxLeftDistance >= adjustedDistance ? 'left' : 'right';
        return { direction, distance: adjustedDistance };
      }
      
      return { direction, distance };
    }

    updateCatPosition(catElement, currentPosition) {
      if (!catElement || !this.caseWidth) return;
      
      // Convert position to pixels (centered on case)
      const pixelPosition = this.caseToPixels(currentPosition);
      catElement.style.left = `${Math.max(0, pixelPosition)}px`;
    }
  }

  NS.PositionManager = PositionManager;
})(window.CC); 