(function (NS) {
  class StorageManager {
    constructor(browserAPI) {
      this.browserAPI = browserAPI;
    }

    async getSettings() {
      try {
        const storageAPI = this.browserAPI.storage.sync || this.browserAPI.storage.local;
        return await storageAPI.get(['selectedSkin', 'chatDisabled', 'catPosition', 'bedPosition', 'toyPosition']);
      } catch (error) {
        console.error('[CuteCat] Failed to get settings:', error);
        return {
          selectedSkin: 'whiteeyes',
          chatDisabled: false,
          catPosition: null,
          bedPosition: null,
          toyPosition: null
        };
      }
    }

    async saveCatPosition(position) {
      try {
        const storageAPI = this.browserAPI.storage.sync || this.browserAPI.storage.local;
        await storageAPI.set({ catPosition: position });
      } catch (error) {
        console.error('[CuteCat] Failed to save cat position:', error);
      }
    }

    async saveBedPosition(position) {
      try {
        const storageAPI = this.browserAPI.storage.sync || this.browserAPI.storage.local;
        await storageAPI.set({ bedPosition: position });
      } catch (error) {
        console.error('[CuteCat] Failed to save bed position:', error);
      }
    }

    async saveToyPosition(position) {
      try {
        const storageAPI = this.browserAPI.storage.sync || this.browserAPI.storage.local;
        await storageAPI.set({ toyPosition: position });
      } catch (error) {
        console.error('[CuteCat] Failed to save toy position:', error);
      }
    }

    onSettingsChanged(callback) {
      if (this.browserAPI.storage && this.browserAPI.storage.onChanged) {
        this.browserAPI.storage.onChanged.addListener(callback);
      }
    }
  }

  NS.StorageManager = StorageManager;
})(window.CC); 