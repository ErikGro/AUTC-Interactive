type Props = {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

export const OffsetSlider = ({ value, onChange, min = -200, max = 200 }: Props) => {
  return (
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range range-neutral [--range-bg:theme('colors.base-100')] [--range-fill:false] w-full"
      />
  )
}
