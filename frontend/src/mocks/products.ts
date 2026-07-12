import type { Product } from '../types'

export const MOCK_PRODUCTS: Product[] = [
  // --- Protection ---
  {
    id: 'icici-pru-iprotect-smart',
    name: 'ICICI Pru iProtect Smart Plus',
    category: 'protection',
    description: '',
    tagline: 'Comprehensive term cover for pure protection',
    minPremium: 6000,
    coverageUpTo: 20_000_000,
    keyBenefits: [
      'Pure risk term insurance',
      'High life cover at low premiums',
      'Options for critical illness and accidental riders',
    ],
    idealFor: ['Family protection', 'Debt repayment'],
    returnType: 'guaranteed',
    tenure: '5 – 40 years',
    badge: 'Pure Risk',
  },

  // --- ULIP ---
  {
    id: 'icici-pru-signature-assure',
    name: 'ICICI Pru Signature Assure',
    category: 'ulip',
    description: '',
    tagline: 'Market-linked wealth creation with wealth boosters',
    minPremium: 24_000,
    coverageUpTo: 5_000_000,
    keyBenefits: [
      'Wealth boosters equivalent to 3.25% of average fund value',
      'Multiple choice of equity, debt and balanced funds',
      'Life cover along with market linked returns',
    ],
    idealFor: ['Wealth creation', 'Business fund'],
    returnType: 'market-linked',
    tenure: '10 – 30 years',
    badge: 'Wealth Booster',
  },
  {
    id: 'icici-pru-protect-n-gain',
    name: 'ICICI Pru Protect N Gain',
    category: 'ulip',
    description: '',
    tagline: 'Market-linked returns for goal planning',
    minPremium: 18_000,
    coverageUpTo: 5_000_000,
    keyBenefits: [
      'Market linked returns',
      'Choice of 26 fund options',
      'Life cover included',
    ],
    idealFor: ['Home purchase', 'Goal planning'],
    returnType: 'market-linked',
    tenure: '5 – 30 years',
  },
  {
    id: 'icici-pru-wish',
    name: 'ICICI Pru Wish',
    category: 'ulip',
    description: '',
    tagline: 'Health saver ULIP for medical emergencies',
    minPremium: 20_000,
    coverageUpTo: 2_000_000,
    keyBenefits: [
      'Health saver fund options',
      'Build corpus for health emergencies',
      'Market linked returns',
    ],
    idealFor: ['Health protection', 'Medical emergencies'],
    returnType: 'market-linked',
    tenure: '10 – 30 years',
  },

  // --- Non-Participating ---
  {
    id: 'icici-pru-gift-pro',
    name: 'ICICI Pru GIFT Pro',
    category: 'non-participating',
    description: '',
    tagline: 'Guaranteed regular income',
    minPremium: 24_000,
    coverageUpTo: 3_000_000,
    keyBenefits: [
      'Guaranteed regular income stream',
      'Fixed IRR of 6.0%',
      'Choice of increasing or level income',
    ],
    idealFor: ['Legacy planning', 'Guaranteed income'],
    returnType: 'guaranteed',
    tenure: '10 – 20 years',
    badge: 'Fixed Returns',
  },
  {
    id: 'icici-pru-smartkid-360',
    name: 'ICICI Pru SmartKid 360',
    category: 'non-participating',
    description: '',
    tagline: 'Guaranteed milestone payouts for child education',
    minPremium: 12_000,
    coverageUpTo: 1_500_000,
    keyBenefits: [
      'Guaranteed milestone payouts',
      'Premium waiver on death of parent',
      'Fixed IRR of 6.0%',
    ],
    idealFor: ['Child education', 'Marriage fund'],
    returnType: 'guaranteed',
    tenure: '10 – 20 years',
  },

  // --- Annuity ---
  {
    id: 'icici-pru-gpp-flexi',
    name: 'ICICI Pru GPP Flexi',
    category: 'annuity',
    description: '',
    tagline: 'Guaranteed pension plan for retirement',
    minPremium: 30_000,
    coverageUpTo: 0,
    keyBenefits: [
      'Lifelong guaranteed income',
      'Reverse NPV strategy (6.5% yield)',
      'Multiple annuity options',
    ],
    idealFor: ['Retirement planning', 'Pension stream'],
    returnType: 'income',
    tenure: 'Lifetime',
    badge: 'Retirement First',
  },
]

export const CATEGORY_META: Record<string, { label: string; color: string; description: string }> = {
  protection:        { label: 'Protection', color: 'badge-orange', description: 'Term life & critical illness plans' },
  ulip:              { label: 'ULIP',       color: 'badge-navy',   description: 'Market-linked investment + cover' },
  participating:     { label: 'Par',        color: 'badge-gold',   description: 'Endowment with declared bonuses' },
  'non-participating':{ label: 'Non-Par',   color: 'badge-green',  description: 'Guaranteed returns, no market risk' },
  annuity:           { label: 'Annuity',    color: 'badge-purple', description: 'Pension & lifetime income plans' },
}
