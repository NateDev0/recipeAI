import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={twMerge(
          'inline-flex items-center justify-center rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:shadow-lg active:scale-95',
          variant === 'primary' &&
            'bg-primary text-primary-foreground hover:bg-primary/90',
          variant === 'secondary' &&
            'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          variant === 'outline' &&
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
          variant === 'ghost' &&
            'hover:bg-accent hover:text-accent-foreground',
          size === 'sm' && 'h-8 px-4 text-sm',
          size === 'md' && 'h-10 px-6 py-2',
          size === 'lg' && 'h-12 px-8 text-lg',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };