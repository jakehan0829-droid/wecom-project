import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  text = '加载中...',
  fullScreen = false
}) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-12 h-12 border-3',
    large: 'w-16 h-16 border-4'
  };

  const content = (
    <div role="status" className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-t-primary border-r-transparent border-b-primary border-l-transparent rounded-full animate-spin`}
        style={{
          borderTopColor: 'var(--primary-color)',
          borderBottomColor: 'var(--primary-color)'
        }}
      />
      {text && (
        <p className="text-sm text-text-secondary">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
};

export default Loading;