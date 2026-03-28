export const DEFAULT_SETTINGS = {
  appearance: {
    theme: 'dark',
    accentColor: 'purple',
    uiZoom: 100
  },
  editor: {
    fontSize: 14,
    wordWrap: 'on',
    minimap: false,
    tabSize: 2
  },
  fileBrowser: {
    showHiddenFiles: false
  }
};

export class SettingsManager {
  constructor() {
    this.key = 'aipm-settings';
    this.settings = this.load();
    this.subscribers = new Set();
    this.applyTheme();
  }

  applyTheme() {
    const theme = this.settings.appearance?.theme || 'dark';
    const accent = this.settings.appearance?.accentColor || 'purple';
    const uiZoom = this.settings.appearance?.uiZoom || 100;
    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
    
    if (document.body) {
      document.body.style.zoom = `${uiZoom}%`;
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.style.zoom = `${uiZoom}%`;
      });
    }
  }

  load() {
    try {
      const json = localStorage.getItem(this.key);
      if (!json) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(json);
      return { 
        appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
        editor: { ...DEFAULT_SETTINGS.editor, ...parsed.editor },
        fileBrowser: { ...DEFAULT_SETTINGS.fileBrowser, ...parsed.fileBrowser }
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.settings));
      this.notifySubscribers();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  get(category) {
    if (!category) return this.settings;
    return this.settings[category] || {};
  }

  updateCategory(category, key, value) {
    if (!this.settings[category]) this.settings[category] = {};
    const updatedCategory = { ...this.settings[category], [key]: value };
    this.settings = { ...this.settings, [category]: updatedCategory };
    this.save();
    
    if (category === 'appearance') {
      this.applyTheme();
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.settings));
  }
}

export const settingsStore = new SettingsManager();
