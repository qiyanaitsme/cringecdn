'use client';

import { Toaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        styling: {
          borderRadius: '8px',
          backgroundColor: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
      }}
    />
  );
}