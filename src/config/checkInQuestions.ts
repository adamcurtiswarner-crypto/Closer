export type CheckInDimension = 'connection' | 'communication' | 'satisfaction';

export interface CheckInQuestion {
  id: string;
  dimension: CheckInDimension;
  text: string;
}

export const CHECK_IN_QUESTIONS: CheckInQuestion[] = [
  // Connection
  { id: 'conn_1', dimension: 'connection', text: 'How connected have you felt to {partner} this past week?' },
  { id: 'conn_2', dimension: 'connection', text: 'How present has {partner} felt when you spend time together?' },
  { id: 'conn_3', dimension: 'connection', text: 'How supported have you felt by {partner} lately?' },
  { id: 'conn_4', dimension: 'connection', text: 'How often have you looked forward to seeing {partner}?' },
  { id: 'conn_5', dimension: 'connection', text: 'How emotionally close have you felt this week?' },

  // Communication
  { id: 'comm_1', dimension: 'communication', text: 'How easy has it been to talk openly with {partner}?' },
  { id: 'comm_2', dimension: 'communication', text: 'How heard do you feel when you share something important?' },
  { id: 'comm_3', dimension: 'communication', text: 'How comfortable are you bringing up difficult topics?' },
  { id: 'comm_4', dimension: 'communication', text: 'How well have you two handled disagreements this week?' },
  { id: 'comm_5', dimension: 'communication', text: 'How in sync do you feel about day-to-day decisions?' },

  // Satisfaction
  { id: 'sat_1', dimension: 'satisfaction', text: 'How are you feeling about your relationship right now?' },
  { id: 'sat_2', dimension: 'satisfaction', text: 'How fulfilled do you feel in your partnership?' },
  { id: 'sat_3', dimension: 'satisfaction', text: 'How optimistic are you about where things are heading?' },
  { id: 'sat_4', dimension: 'satisfaction', text: 'How much fun have you two had together lately?' },
  { id: 'sat_5', dimension: 'satisfaction', text: 'How well does your relationship match what you want it to be?' },
];

export function selectCheckInQuestions(): CheckInQuestion[] {
  const dims: CheckInDimension[] = ['connection', 'communication', 'satisfaction'];
  return dims.map(dim => {
    const pool = CHECK_IN_QUESTIONS.filter(q => q.dimension === dim);
    return pool[Math.floor(Math.random() * pool.length)];
  });
}
