import React from 'react';
import EmptyState from './EmptyState';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  onRetry,
}) => (
  <EmptyState
    variant="error"
    title={title || '\uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4'}
    description={description || '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694'}
    actionLabel={onRetry ? '\uB2E4\uC2DC \uC2DC\uB3C4' : undefined}
    onAction={onRetry}
  />
);

export default ErrorState;
