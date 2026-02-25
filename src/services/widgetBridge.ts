// Widget bridge temporarily disabled — will be re-enabled when widget extension is added back

interface WidgetData {
  currentStreak: number;
  daysAsCouple: number;
  userName: string;
  partnerName: string;
  promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete';
  promptText: string;
  anniversaryDaysLeft: number;
  anniversaryIsToday: boolean;
  lastUpdated: string;
}

export async function updateWidgetData(_data: WidgetData): Promise<void> {
  // no-op until widget extension is re-enabled
}

export function buildWidgetData({
  currentStreak,
  daysAsCouple,
  userName,
  partnerName,
  promptStatus,
  promptText,
  anniversaryDaysLeft,
  anniversaryIsToday,
}: {
  currentStreak: number;
  daysAsCouple: number;
  userName: string;
  partnerName: string;
  promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete';
  promptText: string;
  anniversaryDaysLeft: number;
  anniversaryIsToday: boolean;
}): WidgetData {
  return {
    currentStreak,
    daysAsCouple,
    userName,
    partnerName,
    promptStatus,
    promptText,
    anniversaryDaysLeft,
    anniversaryIsToday,
    lastUpdated: new Date().toISOString(),
  };
}
