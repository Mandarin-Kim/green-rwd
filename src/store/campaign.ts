import { create } from 'zustand'
import type { CampaignWizardStep } from '@/types'

interface CampaignDraft {
  name: string
  objective: string
  channelType: string
  segmentId: string
  targetCount: number
  contentTitle: string
  contentBody: string
  templateId: string
  scheduledAt: string
  sendingTime: string
  abTestEnabled: boolean
}

interface CampaignStore {
  currentStep: CampaignWizardStep
  draft: CampaignDraft
  setStep: (step: CampaignWizardStep) => void
  updateDraft: (data: Partial<CampaignDraft>) => void
  resetDraft: () => void
}

const initialDraft: CampaignDraft = {
  name: '',
  objective: '',
  channelType: 'SMS',
  segmentId: '',
  targetCount: 0,
  contentTitle: '',
  contentBody: '',
  templateId: '',
  scheduledAt: '',
  sendingTime: '09:00',
  abTestEnabled: false,
}

export const useCampaignStore = create<CampaignStore>((set) => ({
  currentStep: 'objective',
  draft: { ...initialDraft },
  setStep: (step) => set({ currentStep: step }),
  updateDraft: (data) => set((state) => ({ draft: { ...state.draft, ...data } })),
  resetDraft: () => set({ currentStep: 'objective', draft: { ...initialDraft } }),
}))
