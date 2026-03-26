import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorCard } from '../error-card/ErrorCard';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('App render failed', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="content">
          <div className="auth-card">
            <ErrorCard message="Интерфейс столкнулся с ошибкой рендера. Страница не должна падать в белый экран." />
            <button type="button" className="btn btn-primary" onClick={this.handleReload}>
              Перезагрузить страницу
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
