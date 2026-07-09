export default function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-sage-dark)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  )
}
