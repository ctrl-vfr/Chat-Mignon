(function (NS) {
  const { StorageManager, SpriteManager, PositionManager, CatBed, CatToy, StyleManager } = NS;

  class CuteCat {
    constructor() {
      this.browserAPI = typeof browser !== "undefined" ? browser : chrome;
      
      this.storageManager = new StorageManager(this.browserAPI);
      this.spriteManager = new SpriteManager(this.browserAPI);
      this.positionManager = new PositionManager();
      this.styleManager = new StyleManager();
      
      // Main cat variables
      this.currentSkin = 'whiteeyes';
      this.currentAnimation = 'idle';
      this.catElement = null;
      this.currentDirection = 'right';
      this.currentPosition = null;
      
      // Control variables
      this.isMoving = false;
      this.isOnBed = false;
      this.isHurt = false;
      this.isDead = false;
      this.isAttacking = false;
      
      // Click interaction variables
      this.clickCount = 0;
      this.clickResetTimeout = null;
      this.hurtTimeout = null;
      
      // Timer variables
      this.animationTimeout = null;
      this.movementTimeout = null;
      
      // Movement/animation synchronization variables
      this.movementStartTime = null;
      this.movementStartPosition = null;
      this.movementTargetPosition = null;
      this.movementDuration = null;
      
      // Element objects
      this.catBed = null;
      this.catToy = null;
      
      // Scenarios with their probabilities (higher = more likely)
      this.scenarioWeights = {
        'run': 30,        // Running - typical cat behavior
        'sitting': 25,    // Sitting position - classic pose
        'idle': 20,       // Normal idle
        'idle2': 15,      // Alternative idle
        'jump': 10        // Jump - less frequent
      };
      
      // Scenarios that involve movement
      this.movementScenarios = ['run', 'jump'];
      
      // Movement distances by type
      this.movementRanges = {
        'run': { min: 2, max: 8 },    // Run: 2 to 8 cases
        'jump': { min: 1, max: 2 }    // Jump: 1 to 2 cases
      };
      
      this.init().catch(error => {
        console.error('[CuteCat] Failed to initialize cat:', error);
      });
    }
    
    async init() {
      try {
        // Get settings from storage
        const settings = await this.storageManager.getSettings();
        
        // Don't initialize if cat is completely disabled
        if (settings.chatDisabled) {
          return;
        }
        
        this.currentSkin = settings.selectedSkin || 'whiteeyes';
        
        // Create elements
        this.createCatElement();
        this.catBed = new CatBed(this.browserAPI, this.storageManager, settings.bedPosition);
        this.catToy = new CatToy(this.browserAPI, this.storageManager, settings.toyPosition, this.catBed.getElement());
        
        // Position cat according to saved position or on bed
        if (settings.catPosition !== null) {
          // Restore saved cat position
          this.currentPosition = settings.catPosition;
          this.isOnBed = this.positionManager.checkIfOnBed(this.currentPosition, this.catBed.getElement());
        } else {
          // Original logic: position on bed or center
          const bedPixelPos = this.positionManager.getBedPixelPosition(this.catBed.getElement());
          if (bedPixelPos !== null) {
            this.currentPosition = this.positionManager.pixelsToCase(bedPixelPos);
            this.isOnBed = true;
          } else {
            this.currentPosition = this.positionManager.maxPosition / 2;
            this.isOnBed = false;
          }
        }
        
        this.positionManager.updateCatPosition(this.catElement, this.currentPosition);
        
        // Make cat sleep on bed with pop effect (if on bed)
        setTimeout(() => {
          if (this.isOnBed) {
            this.sleepOnBed();
          } else {
            this.setAnimation('idle');
          }
        }, 100);
        
        this.startRandomScenarios();
        this.setupEventListeners();
      } catch (error) {
        console.error('[CuteCat] Failed during initialization:', error);
      }
    }

    setupEventListeners() {
      // Listen for skin and settings changes
      this.storageManager.onSettingsChanged((changes, areaName) => {
        if (changes.selectedSkin) {
          this.currentSkin = changes.selectedSkin.newValue;
          this.spriteManager.updateCatSprite(this.catElement, this.currentSkin, this.currentAnimation);
        }
        
        // If chatDisabled is enabled, remove cat
        if (changes.chatDisabled && changes.chatDisabled.newValue) {
          this.destroyAll();
        }
        
        // If chatDisabled is disabled, recreate cat
        if (changes.chatDisabled && changes.chatDisabled.newValue === false) {
          setTimeout(() => {
            new CuteCat();
          }, 100);
        }
      });
      
      // Recalculate positions if window is resized
      window.addEventListener('resize', () => {
        this.positionManager.updateCatPosition(this.catElement, this.currentPosition);
        
        // Check and reset positions if necessary
        this.checkElementPositions();
      });
    }
    
    // New method to check element positions
    checkElementPositions() {
      // Check bed
      if (this.catBed && this.catBed.getElement()) {
        const bedReset = this.styleManager.checkAndResetPosition(
          this.catBed.getElement(),
          () => (window.innerWidth * 2 / 3) - 64
        );
        if (bedReset) {
          this.catBed.savePosition();
        }
      }
      
      // Check toy
      if (this.catToy && this.catToy.getElement()) {
        const toyReset = this.styleManager.checkAndResetPosition(
          this.catToy.getElement(),
          () => this.styleManager.calculateToyPositionNearBed(this.catBed ? this.catBed.getElement() : null)
        );
        if (toyReset) {
          this.catToy.savePosition();
        }
      }
    }
    
    // Get toy pixel position for collision detection
    getToyPixelPosition() {
      if (!this.catToy || !this.catToy.getElement()) return null;
      
      const toyLeft = parseInt(this.catToy.getElement().style.left) || 0;
      return toyLeft + 32; // +32 to get toy center (32px width after scale)
    }
    
    // Schedule next random scenario execution
    scheduleNextScenario(delay = null) {
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
      }
      
      const executeScenario = async () => {
        try {
          // Don't start new scenario if cat is moving, hurt, dead, or attacking
          if (this.isMoving || this.isHurt || this.isDead || this.isAttacking) {
            this.animationTimeout = setTimeout(executeScenario, 500);
            return;
          }
          
          // Check element positions periodically
          this.checkElementPositions();
          
          // Choose scenario according to weighted probabilities
          const scenario = this.selectWeightedScenario();
          
          // NEW RULE: Cat sleeps ONLY if on bed
          let finalScenario = scenario;
          if (this.isOnBed) {
            // If cat is on bed, 70% chance to sleep, 30% chance to wake up and move
            if (Math.random() < 0.7) {
              finalScenario = 'sleep';
            } else if (this.movementScenarios.includes(scenario)) {
              finalScenario = scenario; // Keep original movement scenario
            } else {
              finalScenario = 'sleep'; // Stay asleep if no movement selected
            }
          } else {
            // If cat is NOT on bed, it can NOT sleep
            if (scenario === 'sleep') {
              finalScenario = 'idle'; // Replace sleep with idle
            }
          }
          
          let movementData = null;
          if (this.movementScenarios.includes(finalScenario)) {
            movementData = this.positionManager.selectMovement(finalScenario, this.currentPosition, this.movementRanges);
            this.isOnBed = false; // Cat leaves bed when moving
          }
          
          await this.setAnimation(finalScenario, movementData);
          
          // Scenario duration according to type (pause time after action)
          let duration = 2000; // default duration
          
          switch(finalScenario) {
            case 'run':
              duration = 1000; // Short pause after run
              break;
            case 'jump':
              duration = 800; // Short pause after jump
              break;
            case 'sleep':
              duration = 5000; // Sleep on the bed
              break;
            case 'sitting':
              duration = 8000; // Long enough for sitting position
              break;
            case 'idle':
            case 'idle2':
              duration = 3000; // Moderate duration for idle
              break;
          }
          
          // Schedule next scenario with random delay
          const nextDelay = duration + Math.random() * 2000 + 1000; // 1-3 seconds more
          this.animationTimeout = setTimeout(executeScenario, nextDelay);
        } catch (error) {
          console.error('[CuteCat] Error in random scenario execution:', error);
          // Retry after error
          this.animationTimeout = setTimeout(executeScenario, 2000);
        }
      };
      
      // Start scenario after specified delay
      const scheduleDelay = delay || (Math.random() * 2000 + 1000);
      this.animationTimeout = setTimeout(executeScenario, scheduleDelay);
    }

    // Attack toy animation sequence
    async attackToy() {
      this.isAttacking = true;
      
      // Position cat exactly at toy center
      const toyPixelPos = this.getToyPixelPosition();
      if (toyPixelPos !== null) {
        this.currentPosition = this.positionManager.pixelsToCase(toyPixelPos);
        this.positionManager.updateCatPosition(this.catElement, this.currentPosition);
      }
      
      // Perform 2 attacks
      for (let i = 0; i < 2; i++) {
        await this.setAnimation('attack');
        // Wait between attacks 
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.isAttacking = false;
      
      // Resume normal behavior after attacking
      await this.setAnimation('idle');
      
      // Ensure the scenario cycle is active - if no timeout is set, start one
      if (!this.animationTimeout) {
        this.scheduleNextScenario(1000);
      }
      // Otherwise, the existing executeScenario cycle will automatically resume
      // when it detects isAttacking = false in its next 500ms check
    }
    
    createCatElement() {
      // Check if cat already exists
      if (document.getElementById('cute-cat-overlay')) {
        return;
      }
      
      // Create overlay container
      const overlay = document.createElement('div');
      overlay.id = 'cute-cat-overlay';
      this.styleManager.applyStyles(overlay, this.styleManager.getOverlayStyles());
      
      // Create cat element (now a div with background)
      const cat = document.createElement('div');
      cat.id = 'cute-cat-sprite';
      this.styleManager.applyStyles(cat, this.styleManager.getBaseCatStyles());
      
      overlay.appendChild(cat);
      document.body.appendChild(overlay);
      
      this.catElement = cat;
      
      // Add event listener for clicks
      this.catElement.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.handleCatClick();
      });
      
      // Load initial animation
      this.setAnimation('idle');
    }

    // Method called when cat arrives on bed
    sleepOnBed() {
      if (this.isDead || this.isHurt) return;
      
      // Position cat exactly at bed center (based on real bed position)
      const bedPixelPos = this.positionManager.getBedPixelPosition(this.catBed.getElement());
      if (bedPixelPos !== null) {
        // Convert bed position to case position for cat
        this.currentPosition = this.positionManager.pixelsToCase(bedPixelPos);
      }
      
      this.isOnBed = true;
      this.positionManager.updateCatPosition(this.catElement, this.currentPosition);
      
      // Save cat position on bed
      this.storageManager.saveCatPosition(this.currentPosition);
      
      // Update styles for sleep (margin +5)
      this.styleManager.updateCatStyles(this.catElement, true);
      
      // "Pop" effect when cat arrives on bed
      if (this.catElement) {
        // Preserve current direction
        const currentDirection = this.currentDirection;
        const baseTransform = currentDirection === 'left' ? 'scale(2.3) scaleX(-1)' : 'scale(2.3)';
        const normalTransform = currentDirection === 'left' ? 'scale(2) scaleX(-1)' : 'scale(2)';
        
        this.catElement.style.transform = baseTransform;
        this.catElement.style.transition = 'transform 0.2s ease-out';
        
        // Return to normal size after effect
        setTimeout(() => {
          if (this.catElement) {
            this.catElement.style.transform = normalTransform;
          }
        }, 200);
      }
      
      this.setAnimation('sleep');
    }

    handleCatClick() {
      // If cat is dead, do nothing
      if (this.isDead) return;
      
      // Increment click counter
      this.clickCount++;
      
      // Reset previous timeout
      if (this.clickResetTimeout) {
        clearTimeout(this.clickResetTimeout);
      }
      
      // Reset recovery timeout after injury
      if (this.hurtTimeout) {
        clearTimeout(this.hurtTimeout);
      }
      
      // If 5 rapid clicks, cat dies
      if (this.clickCount >= 5) {
        this.isDead = true;
        this.isHurt = false;
        this.setAnimation('die');
        
        // Make cat disappear after 3 seconds
        setTimeout(() => {
          if (this.catElement) {
            this.catElement.style.opacity = '0';
            this.catBed.getElement().style.opacity = '0';
            this.catElement.style.transition = 'opacity 1s ease-out';
            this.catBed.getElement().style.transition = 'opacity 1s ease-out';
            
            // Make toy disappear too
            if (this.catToy.getElement()) {
              this.catToy.getElement().style.opacity = '0';
              this.catToy.getElement().style.transition = 'opacity 1s ease-out';
            }
          
            // Remove completely after transition
            setTimeout(() => {
              if (this.catElement) {
                this.catElement.remove();
                this.catElement = null;
              }
              
              // Recreate new cat after 5 seconds
              setTimeout(() => {
                if (document.getElementById('cute-cat-bed')) {
                  new CuteCat();
                }
              }, 5000);
            }, 1000);
          }
        }, 3000);
        
        return;
      }
      
      // Play Hurt animation
      this.isHurt = true;
      this.isOnBed = false; // Cat leaves bed when hurt
      this.setAnimation('hurt');
      
      // Schedule movement after 1 second (if not dead in between)
      this.hurtTimeout = setTimeout(() => {
        if (!this.isDead && this.isHurt) {
          this.isHurt = false;
          // Choose direction and distance for escape
          const movementData = this.positionManager.selectMovement('run', this.currentPosition, this.movementRanges);
          this.setAnimation('run', movementData);
        }
      }, 1000);
      
      // Reset click counter after 2 seconds
      this.clickResetTimeout = setTimeout(() => {
        this.clickCount = 0;
      }, 2000);
    }
    
    // Weighted scenario selection according to probabilities
    selectWeightedScenario() {
      const scenarios = Object.keys(this.scenarioWeights);
      const weights = Object.values(this.scenarioWeights);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      
      let random = Math.random() * totalWeight;
      
      for (let i = 0; i < scenarios.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return scenarios[i];
        }
      }
      
      // Fallback (should never happen)
      return 'idle';
    }

    applyDirection() {
      if (!this.catElement) return;
      
      // Apply transformation for direction
      const baseTransform = 'scale(2)';
      if (this.currentDirection === 'left') {
        // Flip horizontally to go left
        this.catElement.style.transform = `${baseTransform} scaleX(-1)`;
      } else {
        // Normal direction to go right
        this.catElement.style.transform = baseTransform;
      }
    }

    // Movement synchronized with animation
    async startSynchronizedMovement(spriteInfo, targetPosition, totalDuration) {
      // Stop previous animation if any
      this.spriteManager.stopAnimation();

      // If single frame, movement without animation
      if (spriteInfo.frameCount <= 1) {
        this.spriteManager.currentFrame = 0;
        this.spriteManager.updateCatFrame(this.catElement, spriteInfo);
        
        // Simple movement for single frame sprites
        this.currentPosition = targetPosition;
        this.positionManager.updateCatPosition(this.catElement, this.currentPosition);
        this.storageManager.saveCatPosition(this.currentPosition);
        
        return Promise.resolve();
      }

      // Calculate timing to synchronize frames and movement
      const distance = Math.abs(targetPosition - this.currentPosition);
      const frameCount = spriteInfo.frameCount;

      // Frame duration = total duration / (distance × frames per case)
      const framesPerCase = frameCount; // 1 complete cycle per case
      const totalFrames = distance * framesPerCase;
      const frameInterval = totalDuration / totalFrames;

      // Movement variables
      this.movementStartTime = Date.now();
      this.movementStartPosition = this.currentPosition;
      this.movementTargetPosition = targetPosition;
      this.movementDuration = totalDuration;

      // Start synchronized frame-by-frame animation
      this.spriteManager.currentFrame = 0;
      this.spriteManager.updateCatFrame(this.catElement, spriteInfo);

      let frameCounter = 0;
      let lastPosition = this.currentPosition;

      return new Promise((resolve) => {
        this.spriteManager.frameTimeout = setInterval(() => {
          // Advance frame
          this.spriteManager.currentFrame = (this.spriteManager.currentFrame + 1) % frameCount;
          this.spriteManager.updateCatFrame(this.catElement, spriteInfo);
          frameCounter++;

          // Update cat position
          const elapsed = Date.now() - this.movementStartTime;
          const progress = Math.min(elapsed / this.movementDuration, 1);

          // Linear interpolation for position
          const currentPos = this.movementStartPosition + (this.movementTargetPosition - this.movementStartPosition) * progress;
          
          // Check if cat crosses TOY DURING movement (NEW FEATURE)
          const toyPixelPos = this.getToyPixelPosition();
          if (toyPixelPos !== null && !this.isAttacking) {
            // Convert positions to pixels for verification
            const lastPixelPos = this.positionManager.getCatPixelPosition(lastPosition);
            const currentPixelPos = this.positionManager.getCatPixelPosition(currentPos);
            
            // Define toy zone
            const toyZoneStart = toyPixelPos - 32;
            const toyZoneEnd = toyPixelPos + 32;
            
            // Check if cat just crossed toy zone
            const wasOutside = lastPixelPos < toyZoneStart || lastPixelPos > toyZoneEnd;
            const isInside = currentPixelPos >= toyZoneStart && currentPixelPos <= toyZoneEnd;
            
            if (wasOutside && isInside) {
              // 1/3 chance to attack toy
              if (Math.random() < 0.33) {
                // Stop current movement animation
                this.spriteManager.stopAnimation();
                
                // Attack toy immediately
                setTimeout(async () => {
                  await this.attackToy();
                }, 100);
                
                resolve();
                return;
              }
            }
          }
          
          // Check if cat crosses bed DURING movement
          const bedPixelPos = this.positionManager.getBedPixelPosition(this.catBed.getElement());
          if (bedPixelPos !== null) {
            // Convert positions to pixels for verification
            const lastPixelPos = this.positionManager.getCatPixelPosition(lastPosition);
            const currentPixelPos = this.positionManager.getCatPixelPosition(currentPos);
            
            // Define bed zone
            const bedZoneStart = bedPixelPos - 64;
            const bedZoneEnd = bedPixelPos + 64;
            
            // Check if cat just crossed bed zone
            const wasOutside = lastPixelPos < bedZoneStart || lastPixelPos > bedZoneEnd;
            const isInside = currentPixelPos >= bedZoneStart && currentPixelPos <= bedZoneEnd;
            
            if (wasOutside && isInside) {
              // Stop animation immediately
              this.spriteManager.stopAnimation();
              
              // Position cat exactly on bed
              const bedPixelPos = this.positionManager.getBedPixelPosition(this.catBed.getElement());
              if (bedPixelPos !== null) {
                this.currentPosition = this.positionManager.pixelsToCase(bedPixelPos);
              }
              this.positionManager.updateCatPosition(this.catElement, this.currentPosition);
              
              // End on first frame for clean stop
              this.spriteManager.currentFrame = 0;
              this.spriteManager.updateCatFrame(this.catElement, spriteInfo);
              
              // Save new cat position
              this.storageManager.saveCatPosition(this.currentPosition);
              
              // Make cat sleep on bed immediately
              setTimeout(() => {
                this.sleepOnBed();
              }, 100);
              
              resolve();
              return;
            }
          }
          
          // Update positions
          lastPosition = this.currentPosition;
          this.currentPosition = currentPos;
          this.positionManager.updateCatPosition(this.catElement, this.currentPosition);

          // Stop when destination is reached (without crossing)
          if (progress >= 1) {
            this.spriteManager.stopAnimation();
            this.currentPosition = this.movementTargetPosition;
            this.positionManager.updateCatPosition(this.catElement, this.currentPosition);

            // End on first frame for clean stop
            this.spriteManager.currentFrame = 0;
            this.spriteManager.updateCatFrame(this.catElement, spriteInfo);

            // Save new cat position
            this.storageManager.saveCatPosition(this.currentPosition);

            resolve();
          }
        }, frameInterval);
      });
    }
    
    async setAnimation(scenario, movementData = null) {
      if (!this.catElement) return;
      
      try {
        this.currentAnimation = scenario;
        
        // Remove all CSS animation classes
        this.catElement.className = '';
        this.catElement.style.animation = '';
        
        // Update styles according to animation
        const isSleeping = (scenario === 'sleep');
        this.styleManager.updateCatStyles(this.catElement, isSleeping);
        
        // Update sprite
        const spriteInfo = await this.spriteManager.updateCatSprite(this.catElement, this.currentSkin, this.currentAnimation);
        
        // For movements, handle synchronized displacement
        if (movementData && movementData.distance > 0) {
          this.currentDirection = movementData.direction;
          this.applyDirection();
          
          // Calculate target position
          const targetPosition = movementData.direction === 'left' 
            ? this.currentPosition - movementData.distance
            : this.currentPosition + movementData.distance;
          
          // Calculate duration according to movement type and distance
          const baseSpeedPerCase = scenario === 'jump' ? 800 : 1200; // Jump faster but slowed, run slower
          const movementDuration = movementData.distance * baseSpeedPerCase;
          
          // Animate synchronized displacement with frames
          this.isMoving = true;
          await this.startSynchronizedMovement(spriteInfo, targetPosition, movementDuration);
          this.isMoving = false;
          
          // After movement, restore normal styles (margin -5)
          this.styleManager.updateCatStyles(this.catElement, false);
          
        } else {
          // Static animation
          this.applyDirection();
          this.spriteManager.startStaticFrameAnimation(this.catElement, spriteInfo);
        }
      } catch (error) {
        console.error('[CuteCat] Failed to set animation:', scenario, error);
      }
    }
    
    startRandomScenarios() {
      this.scheduleNextScenario();
    }
    
    destroy() {
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
      }
      if (this.movementTimeout) {
        clearTimeout(this.movementTimeout);
      }
      if (this.clickResetTimeout) {
        clearTimeout(this.clickResetTimeout);
      }
      if (this.hurtTimeout) {
        clearTimeout(this.hurtTimeout);
      }
      
      this.spriteManager.destroy();
      
      const overlay = document.getElementById('cute-cat-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
    
    // New method to destroy everything (cat, bed, toy)
    destroyAll() {
      // Destroy cat first
      this.destroy();
      
      // Remove bed and toy
      if (this.catBed) {
        this.catBed.destroy();
      }
      if (this.catToy) {
        this.catToy.destroy();
      }
    }
  }

  NS.CuteCat = CuteCat;
})(window.CC);
