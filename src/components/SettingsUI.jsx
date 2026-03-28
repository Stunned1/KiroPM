import React, { useState, useEffect } from 'react';
import { settingsStore } from '../settings/SettingsManager';

export default function SettingsUI() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState(settingsStore.get());

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(newSettings => {
      setSettings(newSettings);
    });
    return unsubscribe;
  }, []);

  const handleChange = (category, key, value) => {
    settingsStore.updateCategory(category, key, value);
  };

  const renderAppearanceTab = () => (
    <div className="settings-panel">
      <h3>Appearance</h3>
      <label style={{ display: 'block', marginBottom: '15px' }}>
        Interface Theme
        <select 
          value={settings.appearance?.theme || 'dark'} 
          onChange={e => handleChange('appearance', 'theme', e.target.value)}
          style={{ display: 'block', width: '300px', padding: '6px', marginTop: '6px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: '15px' }}>
        App Zoom (%)
        <input 
          type="number" 
          value={settings.appearance?.uiZoom || 100} 
          step={5}
          onChange={e => handleChange('appearance', 'uiZoom', Number(e.target.value))} 
          style={{ display: 'block', width: '300px', padding: '6px', marginTop: '6px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
        />
      </label>

      <div style={{ marginBottom: '15px' }}>
        <span style={{ display: 'block', marginBottom: '8px' }}>Accent Color</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { id: 'purple', hex: '#7c6af7' },
            { id: 'blue', hex: '#3b82f6' },
            { id: 'green', hex: '#10b981' },
            { id: 'orange', hex: '#f59e0b' },
            { id: 'rose', hex: '#e11d48' },
          ].map(color => (
            <button
              key={color.id}
              onClick={() => handleChange('appearance', 'accentColor', color.id)}
              title={color.id}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: color.hex,
                border: settings.appearance?.accentColor === color.id ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderEditorTab = () => (
    <div className="settings-panel">
      <h3>Editor</h3>
      <label style={{ display: 'block', marginBottom: '10px' }}>
        Font Size (px)
        <input 
          type="number" 
          value={settings.editor?.fontSize || 14} 
          onChange={e => handleChange('editor', 'fontSize', Number(e.target.value))} 
          style={{ display: 'block', width: '300px', padding: '6px', marginTop: '4px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: '10px' }}>
        Tab Size
        <input 
          type="number" 
          value={settings.editor?.tabSize || 2} 
          onChange={e => handleChange('editor', 'tabSize', Number(e.target.value))} 
          style={{ display: 'block', width: '300px', padding: '6px', marginTop: '4px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
        <input 
          type="checkbox" 
          checked={settings.editor?.minimap || false} 
          onChange={e => handleChange('editor', 'minimap', e.target.checked)} 
        />
        Enable Minimap
      </label>
      <label style={{ display: 'block', marginBottom: '10px' }}>
        Word Wrap
        <select 
          value={settings.editor?.wordWrap || 'on'} 
          onChange={e => handleChange('editor', 'wordWrap', e.target.value)}
          style={{ display: 'block', width: '300px', padding: '6px', marginTop: '4px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
        >
          <option value="on">On</option>
          <option value="off">Off</option>
          <option value="wordWrapColumn">Column</option>
        </select>
      </label>
    </div>
  );

  const renderFileBrowserTab = () => (
    <div className="settings-panel">
      <h3>File Browser</h3>
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
        <input 
          type="checkbox" 
          checked={settings.fileBrowser?.showHiddenFiles || false} 
          onChange={e => handleChange('fileBrowser', 'showHiddenFiles', e.target.checked)} 
        />
        Show Hidden Dotfiles (e.g. .git, .env)
      </label>
    </div>
  );

  return (
    <div className="settings-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', color: 'var(--text)' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' }}>Settings</h2>
      
      <div className="settings-body" style={{ display: 'flex', flexGrow: 1, borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <div className="settings-sidebar" style={{ width: '180px', borderRight: '1px solid var(--border)', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { id: 'appearance', label: 'Appearance' },
            { id: 'editor', label: 'Editor' },
            { id: 'fileBrowser', label: 'File Browser' },
          ].map(tab => (
            <button
              key={tab.id}
              style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: activeTab === tab.id ? 'rgba(124,106,247,0.12)' : 'transparent', border: 'none', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s' }}
              onClick={() => setActiveTab(tab.id)}
            >{tab.label}</button>
          ))}
        </div>
        
        <div className="settings-content" style={{ flexGrow: 1, paddingLeft: '40px', overflowY: 'auto' }}>
          {activeTab === 'appearance' && renderAppearanceTab()}
          {activeTab === 'editor' && renderEditorTab()}
          {activeTab === 'fileBrowser' && renderFileBrowserTab()}
        </div>
      </div>
    </div>
  );
}
