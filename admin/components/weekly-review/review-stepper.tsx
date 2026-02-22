'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WmeerReviewStep } from './wmeer-review-step'
import { PromptReviewStep } from './prompt-review-step'
import { CohortReviewStep } from './cohort-review-step'
import { SummaryStep } from './summary-step'

const steps = ['WMEER Review', 'Prompt Review', 'Cohort Review', 'Summary']

interface ReviewStepperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReviewStepper({ open, onOpenChange }: ReviewStepperProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const progress = ((currentStep + 1) / steps.length) * 100

  function handleClose(value: boolean) {
    if (!value) {
      setCurrentStep(0)
    }
    onOpenChange(value)
  }

  function renderStep() {
    switch (currentStep) {
      case 0: return <WmeerReviewStep />
      case 1: return <PromptReviewStep />
      case 2: return <CohortReviewStep />
      case 3: return <SummaryStep />
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Weekly Review</SheetTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{steps[currentStep]}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </SheetHeader>

        <div className="mt-6 min-h-[400px] px-4">
          {renderStep()}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t px-4 pb-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(s => s + 1)}>
              Next
            </Button>
          ) : (
            <Button onClick={() => handleClose(false)}>
              Done
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
