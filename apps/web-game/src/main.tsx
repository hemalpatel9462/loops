import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppShell from './app/AppShell';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('The Loops application root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
