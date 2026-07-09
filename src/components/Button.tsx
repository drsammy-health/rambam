import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'nav'
  active?: boolean
}

export default function Button({
  variant = 'secondary',
  active = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'nav'
        ? `btn-secondary ${active ? 'active-nav' : ''}`
        : 'btn-secondary'

  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  )
}
