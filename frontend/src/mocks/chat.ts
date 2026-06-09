import type { UserProfile } from '../types'
import { sleep } from '../lib/utils'

const ONBOARDING_REPLIES: Record<number, string> = {
  0: "Hello! I am LifeMap, your personal financial planning assistant from ICICI Prudential. I will help you build a plan that covers every milestone in your life.\n\nTo get started, could you tell me your **name and age**?",
  1: "Great to meet you! Which city are you based in, and what is your **monthly household income** approximately?",
  2: "Perfect. Now tell me about your **family** — are you married? Do you have or plan to have children?",
  3: "Excellent. What are the **top 2–3 life goals** you want to plan for? For example: child's education, buying a home, retirement, or leaving a legacy?",
  4: "One last question — how would you describe your **risk appetite**? Conservative (prefer guaranteed returns), Moderate (balanced approach), or Aggressive (comfortable with market volatility)?",
}

function buildRecommendationReply(profile: UserProfile): string {
  const isAggressive = profile.riskAppetite === 'aggressive'
  const hasRetirement = profile.goals.some(g => g.toLowerCase().includes('retire'))
  const hasChild = profile.goals.some(g => g.toLowerCase().includes('child') || g.toLowerCase().includes('education'))

  let reply = `Thank you, ${profile.name}! Based on what you have shared, here is a personalised roadmap for you:\n\n`

  reply += `**Your Financial Snapshot**\n`
  reply += `- Age: ${profile.age} | City: ${profile.city}\n`
  reply += `- Monthly Income: ₹${(profile.income / 1000).toFixed(0)}K | Family: ${profile.familySize} members\n`
  reply += `- Risk Profile: ${profile.riskAppetite.charAt(0).toUpperCase() + profile.riskAppetite.slice(1)}\n\n`

  reply += `**Recommended Coverage**\n\n`
  reply += `1. **ICICI Pru iProtect Smart** — A term cover of ₹${Math.round(profile.income * 15 / 100000)}L ensures your family is protected regardless of what happens.\n\n`

  if (hasChild) {
    reply += `2. **ICICI Pru Smart Life (ULIP)** — Market-linked growth over 15–18 years to build an education corpus of ₹${Math.round(profile.income * 30 / 100000)}L+.\n\n`
  }

  if (hasRetirement) {
    reply += `${hasChild ? 3 : 2}. **ICICI Pru Guaranteed Pension Plan** — Start accumulating now. Retire at ${profile.age < 40 ? 55 : 60} with a monthly pension of ₹${Math.round(profile.income * 0.6 / 1000)}K.\n\n`
  }

  if (!isAggressive) {
    reply += `**Guaranteed Safety Net:** ICICI Pru Guaranteed Savings Plan ensures a fixed corpus with zero market risk.\n\n`
  }

  reply += `I have plotted your **Life Journey Timeline** below. Scroll down to see how each milestone is covered. You can also use the **What-If Panel** to adjust retirement age, inflation assumptions, or education goals.`

  return reply
}

export async function* streamChatResponse(
  userMessage: string,
  turnIndex: number,
  profile: UserProfile | null
): AsyncGenerator<string> {
  await sleep(400)

  let fullReply: string

  if (turnIndex < Object.keys(ONBOARDING_REPLIES).length) {
    fullReply = ONBOARDING_REPLIES[turnIndex] ?? "Tell me more about your financial goals."
  } else if (profile) {
    fullReply = buildRecommendationReply(profile)
  } else {
    fullReply = "Thank you for sharing that. Could you tell me a bit more about the goals you want to achieve?"
  }

  const words = fullReply.split(' ')
  for (const word of words) {
    yield word + ' '
    await sleep(30 + Math.random() * 20)
  }
}
