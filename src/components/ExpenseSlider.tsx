import { useRef, useState } from 'react'
import { formatEur } from '../lib/money'

interface Props {
  count: number
  runningExpenses: number[]
  listHeight: number
}

const MAX_SLIDER_HEIGHT = 400

export function ExpenseSlider({ count, runningExpenses, listHeight }: Props) {
  const sliderHeight = Math.min(listHeight, MAX_SLIDER_HEIGHT)
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const fraction = count > 1 ? index / (count - 1) : 0
  const value = runningExpenses[index] ?? 0

  const indexFromClientY = (clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height))
    return Math.round((y / rect.height) * (count - 1))
  }

  return (
    <div className="sticky top-4 w-4 shrink-0">
      <div
        ref={trackRef}
        className="relative cursor-pointer select-none"
        style={{ height: sliderHeight }}
        onClick={(e) => setIndex(indexFromClientY(e.clientY))}
      >
        {/* Track */}
        <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />

        {/* Progress fill */}
        <div
          className="absolute left-1/2 top-0 w-px -translate-x-1/2 rounded-full bg-brand-400 dark:bg-brand-500"
          style={{ height: `${fraction * 100}%` }}
        />

        {/* Circle — centered on the track line */}
        <div
          className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-brand-500 bg-white dark:bg-slate-800 shadow active:cursor-grabbing"
          style={{ top: `${fraction * 100}%` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            e.stopPropagation()
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0) return
            e.stopPropagation()
            setIndex(indexFromClientY(e.clientY))
          }}
        />

        {/* Label — to the left of the circle, grows leftward, never clips right */}
        <div
          className="pointer-events-none absolute right-full -translate-y-1/2 pr-3"
          style={{ top: `${fraction * 100}%` }}
        >
          <span className="money-blur whitespace-nowrap rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-brand-700 ring-1 ring-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900">
            {formatEur(value)}
          </span>
        </div>
      </div>
    </div>
  )
}
