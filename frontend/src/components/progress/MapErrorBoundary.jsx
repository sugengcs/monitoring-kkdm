import { Component } from 'react';

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(17,24,39,0.6)',
            border: '1px solid rgba(239,68,68,0.3)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="text-red-400 font-semibold mb-2">Terjadi error pada peta</p>
          <p className="text-slate-400 text-sm mb-4">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
