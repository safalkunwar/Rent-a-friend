import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  className = '',
  wrapperClassName = '',
  disabled = false,
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${wrapperClassName}`}>
      {label && (
        <label className="text-xs font-medium text-text-secondary tracking-wide select-none">
          {label}
        </label>
      )}
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-surface border border-border-token-light rounded-2xl text-text-primary text-sm placeholder-placeholder transition-all duration-200 outline-none hover:border-border-token focus:border-primary-action focus:ring-1 focus:ring-primary-action disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-danger-token focus:border-danger-token focus:ring-danger-token' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-danger-token mt-0.5 select-none">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
