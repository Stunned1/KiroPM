import React, { useState, useEffect } from 'react';
import { settingsStore } from '../settings/SettingsManager';
import { supabase } from '../supabase';

export default function SettingsUI() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState(settingsStore.get());
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(newSettings => {
      setSettings(newSettings);
    });
    checkSlackConnection();
    return unsubscribe;
  }, []);

  const checkSlackConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('slack_integrations')
        .select('team_name')
        .limit(1)
        .single();
      
      if (data) {
        setSlackConnected(true);
        setSlackTeam(data.team_name);
      }
    } catch (err) {
      console.log('Slack not connected');
    }
  };

  const connectSlack = () => {
    const clientId = import.meta.env.VITE_SLACK_CLIENT_ID;
    const redirectUri = encodeURIComponent('aipm://auth/slack');
    const scopes = encodeURIComponent('chat:write,channels:read,groups:read,history:read,users:read');
    const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
    window.electronAI?.openExternal(url);
  };

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

  const renderIntegrationsTab = () => (
    <div className="settings-panel">
      <h3>Integrations</h3>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', marginTop: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '40px', height: '40px', background: '#4A154B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>#</div>
            <div>
              <h4 style={{ margin: 0 }}>Slack</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                {slackConnected ? `Connected to ${slackTeam}` : 'Not connected'}
              </p>
            </div>
          </div>
          <button 
            onClick={connectSlack}
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              background: slackConnected ? 'transparent' : 'var(--accent)', 
              color: slackConnected ? 'var(--text)' : 'white',
              border: slackConnected ? '1px solid var(--border)' : 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {slackConnected ? 'Reconnect' : 'Connect'}
          </button>
        </div>
        {slackConnected && (
          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Mira is currently ingesting messages from your public channels to improve project synthesis.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="settings-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', color: 'var(--text)' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 600 }}>Settings</h2>
      
      <div className="settings-body" style={{ display: 'flex', flexGrow: 1, borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <div className="settings-sidebar" style={{ width: '200px', borderRight: '1px solid var(--border)', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button 
            style={{ display: 'block', width: '100%', padding: '10px 15px', textAlign: 'left', background: activeTab === 'appearance' ? 'var(--border)' : 'transparent', border: 'none', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }} 
            onClick={() => setActiveTab('appearance')}
          >Appearance</button>
          <button 
            style={{ display: 'block', width: '100%', padding: '10px 15px', textAlign: 'left', background: activeTab === 'editor' ? 'var(--border)' : 'transparent', border: 'none', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }} 
            onClick={() => setActiveTab('editor')}
          >Editor</button>
          <button 
            style={{ display: 'block', width: '100%', padding: '10px 15px', textAlign: 'left', background: activeTab === 'fileBrowser' ? 'var(--border)' : 'transparent', border: 'none', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }} 
            onClick={() => setActiveTab('fileBrowser')}
          >File Browser</button>
          <button 
            style={{ display: 'block', width: '100%', padding: '10px 15px', textAlign: 'left', background: activeTab === 'integrations' ? 'var(--border)' : 'transparent', border: 'none', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }} 
            onClick={() => setActiveTab('integrations')}
          >Integrations</button>
        </div>
        
        <div className="settings-content" style={{ flexGrow: 1, paddingLeft: '40px', overflowY: 'auto' }}>
          {activeTab === 'appearance' && renderAppearanceTab()}
          {activeTab === 'editor' && renderEditorTab()}
          {activeTab === 'fileBrowser' && renderFileBrowserTab()}
          {activeTab === 'integrations' && renderIntegrationsTab()}
        </div>
      </div>
    </div>
  );
}
