import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Você pode enviar logs para um serviço aqui
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-600">Erro na interface</h2>
          <p className="mt-2 text-sm text-gray-700">Ocorreu um problema ao renderizar esta página. Veja o console para mais detalhes.</p>
          <pre className="mt-3 text-xs text-gray-600 bg-white p-3 rounded border">{String(this.state.error)}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
