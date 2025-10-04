import * as React from 'react';

/**
 * AuthLayout
 *  - Full-screen gradient background (using your Carbon tokens)
 *  - Centers whatever you render as children
 *  - Keeps spacing responsive and consistent with the rest of the app
 *
 * Usage:
 *   <AuthLayout>
 *     { /* your existing auth content (forms, toggles, etc.) *\/ }
 *   </AuthLayout>
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        // Soft, neutral gradient that plays nicely with your Carbon palette
        background:
          `radial-gradient(1200px 600px at 50% -200px, color-mix(in srgb, var(--fb-accent-1) 55%, #ffffff), transparent 60%),
           linear-gradient(180deg, #f8fafc 0%, var(--fb-page-bg) 100%)`,
        padding: '32px 16px',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,              // generous stage width for the auth card
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
