import React from 'react';

interface ErrorDisplayProps {
  error: string | Error;
  title?: string;
  onRetry?: () => void;
  showDetails?: boolean;
  variant?: 'info' | 'warning' | 'danger' | 'success';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = '出错了',
  onRetry,
  showDetails = false,
  variant = 'danger'
}) => {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const variantClasses = {
    info: 'bg-info-light border-info-color text-info-color',
    warning: 'bg-warning-light border-warning-color text-warning-color',
    danger: 'bg-danger-light border-danger-color text-danger-color',
    success: 'bg-success-light border-success-color text-success-color'
  };

  const variantIcons = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '❌',
    success: '✅'
  };

  return (
    <div role="alert" className={`rounded-lg border p-4 ${variantClasses[variant]}`}>
      <div className="flex items-start gap-3">
        <div className="text-lg mt-0.5">{variantIcons[variant]}</div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm mb-3">{errorMessage}</p>

          {showDetails && errorStack && (
            <details className="mb-3">
              <summary className="text-sm cursor-pointer text-opacity-80 hover:text-opacity-100">
                查看详情
              </summary>
              <pre className="mt-2 text-xs bg-black bg-opacity-5 p-3 rounded overflow-auto max-h-40">
                {errorStack}
              </pre>
            </details>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-white border border-current rounded-lg text-sm font-medium hover:bg-opacity-10 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;