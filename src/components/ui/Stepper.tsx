import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  key: string
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: string
  onStepClick?: (key: string) => void
}

export default function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => onStepClick?.(step.key)}
              className={cn('flex items-center gap-3 group', onStepClick && 'cursor-pointer')}
              disabled={!onStepClick}
            >
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all flex-shrink-0',
                isComplete ? 'bg-primary text-white' :
                isCurrent ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-slate-100 text-slate-400'
              )}>
                {isComplete ? <Check size={16} /> : i + 1}
              </div>
              <div className="hidden sm:block">
                <p className={cn('text-sm font-medium', isCurrent ? 'text-navy' : 'text-slate-400')}>{step.label}</p>
                {step.description && <p className="text-[11px] text-slate-400">{step.description}</p>}
              </div>
            </button>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-[2px] mx-3', isComplete ? 'bg-primary' : 'bg-slate-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
