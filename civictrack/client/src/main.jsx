import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (this.state.failed) return <div role="alert" className="mx-auto max-w-md p-12 text-center"><h1 className="text-xl font-bold">Something went wrong</h1><p className="mt-2 text-slate-600">Please reload the page.</p><button className="btn-primary mt-4" onClick={() => window.location.reload()}>Reload</button></div>;
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);
