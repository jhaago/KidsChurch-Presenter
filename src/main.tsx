import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import './styles/app.css';
import './styles/media-playback.css';
import './styles/audio-cues.css';
import './styles/cue-deck.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
