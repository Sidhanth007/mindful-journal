// Client-safe constants for the daily check-in.

export type FactorEffect = "helped" | "hurt";
export type GoalCheckStatus = "ON_TRACK" | "SLIPPING" | "STUCK";

export const FACTORS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "Body",
    items: [
      { key: "sleep", label: "Sleep" },
      { key: "exercise", label: "Exercise" },
      { key: "food", label: "Food" },
      { key: "health", label: "Health / pain" },
      { key: "rest", label: "Rest" },
    ],
  },
  {
    group: "Life",
    items: [
      { key: "work", label: "Work / study" },
      { key: "money", label: "Money" },
      { key: "family", label: "Family" },
      { key: "partner", label: "Relationship" },
      { key: "friends", label: "Friends / social" },
      { key: "home", label: "Home / chores" },
    ],
  },
  {
    group: "Mind",
    items: [
      { key: "stress", label: "Stress" },
      { key: "achievement", label: "Achievement" },
      { key: "weather", label: "Weather" },
      { key: "screens", label: "Screen time" },
      { key: "nature", label: "Time outside" },
      { key: "creativity", label: "Creativity" },
    ],
  },
];

export const FACTOR_KEYS = FACTORS.flatMap((g) => g.items.map((i) => i.key));

export function factorLabel(key: string): string {
  for (const g of FACTORS) {
    const f = g.items.find((i) => i.key === key);
    if (f) return f.label;
  }
  return key;
}

export const ENERGY_LABELS = ["Low", "Medium", "High"] as const;

export const GOAL_STATUS_LABELS: Record<GoalCheckStatus, string> = {
  ON_TRACK: "On track",
  SLIPPING: "Slipping",
  STUCK: "Stuck",
};

export const MOOD_WORDS: Record<number, string> = {
  1: "Really rough",
  2: "Not great",
  3: "Okay",
  4: "Pretty good",
  5: "Great",
};
