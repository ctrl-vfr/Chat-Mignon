// Service Worker for Cute Cats extension (Firefox)
// Handles installation and initial configuration

// Use browser API for Firefox, with fallback to chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// On installation or update
browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    browserAPI.storage.sync.set({
      selectedSkin: 'whiteeyes',
      chatDisabled: false,
      catPosition: null,
      bedPosition: null,
      toyPosition: null,
      firstTimeOpened: false
    }).catch(error => {
      console.error('[CuteCat] Failed to initialize storage:', error);
    });
  }
  // You can also handle migrations here if needed (details.reason === 'update')
});

// Respond to messages from content scripts or popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCatSettings') {
    browserAPI.storage.sync.get(['selectedSkin', 'chatDisabled'])
      .then((result) => {
        sendResponse({
          selectedSkin: result.selectedSkin ?? 'whiteeyes',
          chatDisabled: result.chatDisabled ?? false
        });
      })
      .catch(error => {
        console.error('[CuteCat] Failed to get settings:', error);
        sendResponse({ error: 'Failed to get settings' });
      });
    return true; // Asynchronous response
  }
});

// Listen for storage changes and let content scripts handle them directly
browserAPI.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    // Storage changes are automatically propagated to content scripts
    // Content scripts will listen to storage.onChanged directly
    console.log('[CuteCat] Settings changed:', Object.keys(changes));
  }
});