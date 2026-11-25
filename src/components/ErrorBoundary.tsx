import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'Произошла непредвиденная ошибка';
    try {
      const parsed = JSON.parse(message) as { error?: string; operationType?: string };
      if (parsed && parsed.error) {
        message = parsed.error.includes('PERMISSION_DENIED') || parsed.error.includes('Missing or insufficient permissions')
          ? 'Недостаточно прав для выполнения операции в базе данных.'
          : parsed.error;
      }
    } catch {
      // plain string error
    }
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F3FBF7] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-emerald-950/10 rounded-2xl p-6 shadow-xs text-center space-y-4">
            <h1 className="text-lg font-extrabold text-slate-900">Ошибка отображения</h1>
            <p className="text-sm text-slate-600 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 cursor-pointer"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
