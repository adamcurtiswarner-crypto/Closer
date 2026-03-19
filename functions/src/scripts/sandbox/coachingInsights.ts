export interface StaticInsight {
  tier: string;
  insightText: string;
  actionType: string;
  actionText: string;
  outcome: 'acted' | 'dismissed' | 'untouched';
}

export const STATIC_INSIGHTS: StaticInsight[] = [
  {
    tier: 'thriving',
    insightText: 'You two have been showing up for each other consistently this week. Your responses show genuine curiosity about each other\'s inner world.',
    actionType: 'conversation',
    actionText: 'Ask about a dream your partner mentioned recently',
    outcome: 'acted',
  },
  {
    tier: 'steady',
    insightText: 'Your rhythm together is solid. You are both responding regularly, which builds trust over time even when the topics feel ordinary.',
    actionType: 'date_night',
    actionText: 'Plan an evening where you try something neither of you has done before',
    outcome: 'acted',
  },
  {
    tier: 'steady',
    insightText: 'This week had a mix of light and deeper moments. That balance is healthy. Consider leaning into the deeper ones when they come.',
    actionType: 'revisit',
    actionText: 'Look back at a response from last week that surprised you',
    outcome: 'dismissed',
  },
  {
    tier: 'steady',
    insightText: 'You have maintained a steady pace. Sometimes consistency is the most loving thing. Your partner notices when you keep showing up.',
    actionType: 'goal',
    actionText: 'Set a small goal together for the coming week',
    outcome: 'acted',
  },
  {
    tier: 'cooling',
    insightText: 'Things have been quieter between you two this week. That happens. Sometimes a small gesture can shift the energy without forcing a big conversation.',
    actionType: 'goal',
    actionText: 'Set a 5-minute no-phones check-in before bed tonight',
    outcome: 'untouched',
  },
  {
    tier: 'cooling',
    insightText: 'We noticed fewer responses this week. Life gets busy. One small step can reconnect you when words feel hard to find.',
    actionType: 'conversation',
    actionText: 'Share one thing you appreciated about your partner today, even if it was small',
    outcome: 'dismissed',
  },
  {
    tier: 'steady',
    insightText: 'There are signs of you two finding your way back to each other. The effort shows, even in brief responses.',
    actionType: 'check_in',
    actionText: 'Take a moment to ask how your partner is really doing',
    outcome: 'acted',
  },
  {
    tier: 'steady',
    insightText: 'Your engagement is building again. The responses this week show more warmth and openness than last week.',
    actionType: 'date_night',
    actionText: 'Revisit a place that holds a good memory for both of you',
    outcome: 'dismissed',
  },
  {
    tier: 'steady',
    insightText: 'You are both bringing more of yourselves to the prompts. That vulnerability is what makes this work.',
    actionType: 'revisit',
    actionText: 'Read through your earliest responses together and notice how you have grown',
    outcome: 'acted',
  },
  {
    tier: 'thriving',
    insightText: 'This has been a strong week. Your responses are longer, more thoughtful, and show real emotional investment.',
    actionType: 'conversation',
    actionText: 'Tell your partner what you admire most about how they have been showing up lately',
    outcome: 'untouched',
  },
  {
    tier: 'thriving',
    insightText: 'The connection between you two is palpable in your responses. You are not just answering prompts, you are having a conversation across time.',
    actionType: 'goal',
    actionText: 'Dream together about something you want to do in the next three months',
    outcome: 'untouched',
  },
  {
    tier: 'thriving',
    insightText: 'Your engagement this week has been remarkable. The depth of your responses shows real emotional investment in each other.',
    actionType: 'date_night',
    actionText: 'Celebrate this momentum with an intentional evening together',
    outcome: 'untouched',
  },
];
