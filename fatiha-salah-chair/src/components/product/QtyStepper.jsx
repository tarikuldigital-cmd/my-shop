import Icon from '../common/Icon'

export default function QtyStepper({ value, onChange, small = false, min = 1 }) {
  const size = small ? 'h-7 w-7' : 'h-10 w-10'
  return (
    <div className="inline-flex items-center overflow-hidden rounded-md border border-line bg-white">
      <button type="button" className={`${size} flex items-center justify-center hover:bg-surface disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity"><Icon name="minus" className="h-4 w-4" /></button>
      <span className={`${small ? 'w-8 text-sm' : 'w-12'} text-center font-semibold`} aria-live="polite">{value}</span>
      <button type="button" className={`${size} flex items-center justify-center hover:bg-surface`} onClick={() => onChange(value + 1)} aria-label="Increase quantity"><Icon name="plus" className="h-4 w-4" /></button>
    </div>
  )
}
