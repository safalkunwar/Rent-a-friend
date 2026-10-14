import React from 'react';
import { createRoot } from 'react-dom/client';
import { PeopleStagePreview } from './PeopleStagePreview';
import '../index.css';
import './people-preview.css';

// Separate Vite development entry: never imported by the application or its providers.
if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')!).render(<PeopleStagePreview />);
}
