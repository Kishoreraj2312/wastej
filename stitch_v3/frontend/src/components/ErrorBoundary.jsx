import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
        padding: 32,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,59,48,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#ff3b30' }}>error</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1d1d1f' }}>Something went wrong</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#6e6e73', maxWidth: 400, textAlign: 'center' }}>
          An unexpected error occurred in this section. Your data is safe.
        </p>
        <details style={{ fontSize: 11, color: '#aeaeb2', maxWidth: 480, wordBreak: 'break-all' }}>
          <summary style={{ cursor: 'pointer', marginBottom: 6 }}>Error details</summary>
          {this.state.error?.message}
        </details>
        <button
          onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          style={{
            padding: '10px 24px', background: '#0071e3', color: '#fff',
            border: 'none', borderRadius: 980, cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }
}
