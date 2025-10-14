import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type WizardStep = 1 | 2 | 3

export function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState<WizardStep>(1)
  const [formData, setFormData] = useState({
    logo: null as File | null,
    industry: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    projectName: '',
    projectDescription: '',
    inviteEmails: '',
  })

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as WizardStep)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as WizardStep)
    }
  }

  const handleSkip = () => {
    if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      handleComplete()
    }
  }

  const handleComplete = () => {
    toast.success('Welcome to PipeTrak!')
    navigate('/')
  }

  const updateFormData = (field: string, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to PipeTrak
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Let's set up your organization
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full ${
                s === step
                  ? 'bg-blue-600'
                  : s < step
                  ? 'bg-blue-400'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Organization Settings */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Organization Settings</h3>

            <div>
              <Label htmlFor="logo">Organization Logo (optional)</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => updateFormData('logo', e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                type="text"
                placeholder="e.g., Oil & Gas, Mining, Construction"
                value={formData.industry}
                onChange={(e) => updateFormData('industry', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                type="text"
                value={formData.timezone}
                onChange={(e) => updateFormData('timezone', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
              >
                Skip Setup
              </Button>
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: First Project (Optional) */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Create Your First Project (Optional)</h3>

            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                type="text"
                placeholder="e.g., Pipeline Phase 1"
                value={formData.projectName}
                onChange={(e) => updateFormData('projectName', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="projectDescription">Description</Label>
              <Input
                id="projectDescription"
                type="text"
                placeholder="Brief project description"
                value={formData.projectDescription}
                onChange={(e) => updateFormData('projectDescription', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Invite Team (Optional) */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Invite Your Team (Optional)</h3>

            <div>
              <Label htmlFor="inviteEmails">
                Email Addresses (comma-separated)
              </Label>
              <textarea
                id="inviteEmails"
                placeholder="john@example.com, sarah@example.com"
                value={formData.inviteEmails}
                onChange={(e) => updateFormData('inviteEmails', e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={4}
              />
              <p className="mt-1 text-xs text-gray-500">
                You can invite team members later from the Team Management page
              </p>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
                <Button type="button" onClick={handleComplete}>
                  Complete Setup
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
