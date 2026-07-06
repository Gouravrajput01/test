// app/page.js
// Exam Closed - Simple Version

'use client';

export default function Home() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0a0e14 0%, #1a2536 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: '#141b26',
        padding: '60px 48px',
        borderRadius: '24px',
        border: '1px solid #2d3a4f',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
      }}>
        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🔒</div>
        <h1 style={{ color: '#f7b731', fontSize: '2.5rem', fontWeight: '700', marginBottom: '16px' }}>
          Exam Closed
        </h1>
        <p style={{ color: '#ff6b6b', fontSize: '1.2rem', marginBottom: '20px' }}>
          ⛔ This exam has been closed.
        </p>
        <div style={{
          background: '#0a0f18',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #2d3a4f',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#b6ceff', fontSize: '1rem' }}>
            <strong style={{ color: '#f0f4ff' }}>Assessment:</strong> Softmax Requirement Test
          </p>
          <p style={{ color: '#b6ceff', fontSize: '1rem' }}>
            <strong style={{ color: '#f0f4ff' }}>Status:</strong> <span style={{ color: '#e06060' }}>Closed</span>
          </p>
        </div>
        <p style={{ color: '#5d739b', fontSize: '0.85rem' }}>
          Please contact the administrator.
        </p>
      </div>
    </div>
  );
}