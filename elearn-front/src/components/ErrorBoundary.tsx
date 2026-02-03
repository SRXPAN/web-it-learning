// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

interface ErrorViewProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  onReset: () => void
}

/**
 * Functional component for rendering the error UI.
 * Allows usage of hooks like useTranslation inside the class-based boundary.
 */
function ErrorView({ error, errorInfo, onReset }: ErrorViewProps) {
  const { t } = useTranslation()

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="card max-w-md w-full text-center shadow-2xl border-red-100 dark:border-red-900/30">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-2">
          {t('error.title', 'Something went wrong')}
        </h1>
        
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          {t('error.description', 'An unexpected error occurred. Please try again or return to the dashboard.')}
        </p>

        {import.meta.env.DEV && error && (
          <details className="mb-8 text-left group">
            <summary className="cursor-pointer text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors list-none flex items-center gap-2">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              Developer Details
            </summary>
            <div className="mt-2 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-xs overflow-auto max-h-60 border border-neutral-200 dark:border-neutral-800 font-mono">
              <p className="font-bold text-red-600 mb-2">{error.message}</p>
              <pre className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">
                {errorInfo?.componentStack}
              </pre>
            </div>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onReset}
            className="btn-outline flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            {t('common.tryAgain', 'Try Again')}
          </button>
          
          <button
            onClick={handleGoHome}
            className="btn bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 border-transparent"
          >
            <Home size={18} />
            {t('nav.dashboard', 'Go Home')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in their child component tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Ignore DOM insertion errors - they're usually recoverable race conditions
    if (error.message?.includes('insertBefore') || error.message?.includes('Node')) {
      console.warn('[ErrorBoundary] Suppressed recoverable DOM error:', error.message)
      return // Don't propagate to error UI
    }
    
    this.setState({ errorInfo })
    
    // Log to console in development
    console.error('Uncaught error:', error, errorInfo)
    
    // Future: Integrate Sentry or other logging service here
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorView 
          error={this.state.error} 
          errorInfo={this.state.errorInfo} 
          onReset={this.handleReset} 
        />
      )
    }

    return this.props.children
  }
}

/**
 * Helper hook to trigger an error for testing purposes
 */
export function useErrorTrigger(): () => void {
  return () => {
    throw new Error('Test error triggered manually')
  }
}

export default ErrorBoundary