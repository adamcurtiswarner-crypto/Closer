import { DateNightCategory, DateNightIdea } from '@/types';

export const DATE_NIGHT_CATEGORIES: {
  key: DateNightCategory;
  label: string;
  icon: string;
}[] = [
  { key: 'at_home', label: 'At Home', icon: '🏠' },
  { key: 'out_about', label: 'Out & About', icon: '🚶' },
  { key: 'adventure', label: 'Adventure', icon: '🧭' },
  { key: 'creative', label: 'Creative', icon: '🎨' },
  { key: 'food_drink', label: 'Food & Drink', icon: '🍽️' },
  { key: 'free_budget', label: 'Free / Budget', icon: '✨' },
];

export const DATE_NIGHT_IDEAS: DateNightIdea[] = [
  // ─── At Home ────────────────────────────────────────────
  {
    id: 'at_home_1',
    title: 'Cook a meal from a new country',
    description:
      'Pick a country neither of you has visited and cook a traditional meal from there together.',
    category: 'at_home',
    costTier: '$',
    durationMinutes: 120,
  },
  {
    id: 'at_home_2',
    title: 'Build a blanket fort',
    description:
      'Build a blanket fort in the living room and watch the movie from your first date.',
    category: 'at_home',
    costTier: 'free',
    durationMinutes: 120,
  },
  {
    id: 'at_home_3',
    title: 'No-screens evening',
    description:
      'Put every screen away for the night and fill the time with board games, cooking, or just talking.',
    category: 'at_home',
    costTier: 'free',
    durationMinutes: 180,
  },
  {
    id: 'at_home_4',
    title: 'Give each other massages',
    description:
      'Set a timer so each person gets an equal turn, and take it seriously.',
    category: 'at_home',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'at_home_5',
    title: 'Read to each other',
    description:
      'Pick a book one of you loves and take turns reading chapters aloud.',
    category: 'at_home',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'at_home_6',
    title: 'Try a new recipe from scratch',
    description:
      'Find a recipe that feels slightly ambitious and make it together, start to finish.',
    category: 'at_home',
    costTier: '$',
    durationMinutes: 120,
  },
  {
    id: 'at_home_7',
    title: 'Create a throwback playlist',
    description:
      'Build a playlist of songs from when you first started dating and listen to it over dinner.',
    category: 'at_home',
    costTier: 'free',
    durationMinutes: 90,
  },
  {
    id: 'at_home_8',
    title: 'Rearrange a room together',
    description:
      'Pick a room and rearrange the furniture together, then sit in it and see how it feels.',
    category: 'at_home',
    costTier: 'free',
    durationMinutes: 120,
  },

  // ─── Out & About ────────────────────────────────────────
  {
    id: 'out_about_1',
    title: 'Take a walk with no destination',
    description:
      'Leave the house with no plan and no map, and just see where you end up.',
    category: 'out_about',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'out_about_2',
    title: 'Find a new coffee shop',
    description:
      'Pick a coffee shop neither of you has been to and spend an hour there together.',
    category: 'out_about',
    costTier: '$',
    durationMinutes: 90,
  },
  {
    id: 'out_about_3',
    title: 'Bookstore date',
    description:
      'Visit a bookstore and each pick a book for the other person, then swap.',
    category: 'out_about',
    costTier: '$',
    durationMinutes: 90,
  },
  {
    id: 'out_about_4',
    title: 'Farmers market to table',
    description:
      'Go to a farmers market, pick out ingredients together, and cook with what you find.',
    category: 'out_about',
    costTier: '$$',
    durationMinutes: 180,
  },
  {
    id: 'out_about_5',
    title: 'Random transit adventure',
    description:
      'Take public transit somewhere random and explore whatever neighborhood you land in.',
    category: 'out_about',
    costTier: '$',
    durationMinutes: 180,
  },
  {
    id: 'out_about_6',
    title: 'Museum or gallery visit',
    description:
      'Visit a museum or gallery you have been meaning to see but keep putting off.',
    category: 'out_about',
    costTier: '$$',
    durationMinutes: 150,
  },
  {
    id: 'out_about_7',
    title: 'People-watch at a park',
    description:
      'Grab coffee and sit on a park bench together, watching people and making up their stories.',
    category: 'out_about',
    costTier: '$',
    durationMinutes: 60,
  },
  {
    id: 'out_about_8',
    title: 'Explore a new neighborhood',
    description:
      'Browse a neighborhood you have never walked through and see what you discover.',
    category: 'out_about',
    costTier: 'free',
    durationMinutes: 120,
  },

  // ─── Adventure ──────────────────────────────────────────
  {
    id: 'adventure_1',
    title: 'Drive somewhere new',
    description:
      'Pick a direction and drive somewhere new within 30 minutes of home, no planning allowed.',
    category: 'adventure',
    costTier: '$',
    durationMinutes: 180,
  },
  {
    id: 'adventure_2',
    title: 'Try a sport together',
    description:
      'Pick a sport neither of you has played and give it an honest try.',
    category: 'adventure',
    costTier: '$$',
    durationMinutes: 120,
  },
  {
    id: 'adventure_3',
    title: 'Sunrise or sunset hike',
    description:
      'Go for a hike timed so you catch sunrise or sunset from the trail.',
    category: 'adventure',
    costTier: 'free',
    durationMinutes: 150,
  },
  {
    id: 'adventure_4',
    title: 'Take a class together',
    description:
      'Sign up for a class together — pottery, dancing, cooking, whatever sounds interesting.',
    category: 'adventure',
    costTier: '$$',
    durationMinutes: 120,
  },
  {
    id: 'adventure_5',
    title: 'Explore an unknown part of your city',
    description:
      'Pick a part of your city you have never been to and spend a few hours getting to know it.',
    category: 'adventure',
    costTier: '$',
    durationMinutes: 180,
  },
  {
    id: 'adventure_6',
    title: 'Rent bikes and ride',
    description:
      'Rent bikes and ride somewhere new — no destination required, just movement.',
    category: 'adventure',
    costTier: '$$',
    durationMinutes: 120,
  },
  {
    id: 'adventure_7',
    title: 'Go swimming somewhere unexpected',
    description:
      'Find a swimming spot you would not normally go to — a lake, a public pool, a hotel day pass.',
    category: 'adventure',
    costTier: '$',
    durationMinutes: 120,
  },
  {
    id: 'adventure_8',
    title: 'Geocaching or scavenger hunt',
    description:
      'Try geocaching or find a local scavenger hunt to do together in your area.',
    category: 'adventure',
    costTier: 'free',
    durationMinutes: 120,
  },

  // ─── Creative ───────────────────────────────────────────
  {
    id: 'creative_1',
    title: 'Draw portraits of each other',
    description:
      'Draw portraits of each other — no talent required, the worse the better.',
    category: 'creative',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'creative_2',
    title: 'Write letters to your future selves',
    description:
      'Each write a letter to your future selves, seal them, and set a date to open them in a year.',
    category: 'creative',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'creative_3',
    title: 'Make a photo book',
    description:
      'Go through your photos and pick your favorites to arrange into a book of your best memories together.',
    category: 'creative',
    costTier: '$',
    durationMinutes: 120,
  },
  {
    id: 'creative_4',
    title: 'Learn a song together',
    description:
      'Pick a song and try to learn it together on whatever instrument is around, or just your voices.',
    category: 'creative',
    costTier: 'free',
    durationMinutes: 90,
  },
  {
    id: 'creative_5',
    title: 'Paint or collage together',
    description:
      'Get some supplies and paint or collage something together — one canvas, two artists.',
    category: 'creative',
    costTier: '$',
    durationMinutes: 120,
  },
  {
    id: 'creative_6',
    title: 'Write your origin story',
    description:
      'Write a short story about how you met, each telling your own version, then compare.',
    category: 'creative',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'creative_7',
    title: 'Make a time capsule',
    description:
      'Put together a time capsule of this year — photos, notes, small objects — and store it somewhere safe.',
    category: 'creative',
    costTier: 'free',
    durationMinutes: 90,
  },
  {
    id: 'creative_8',
    title: 'Design your dream vacation',
    description:
      'Sit down and plan your dream vacation itinerary together, even if it stays imaginary for now.',
    category: 'creative',
    costTier: 'free',
    durationMinutes: 90,
  },

  // ─── Food & Drink ──────────────────────────────────────
  {
    id: 'food_drink_1',
    title: 'Try a new cuisine',
    description:
      'Pick a cuisine neither of you has tried and find the best spot nearby.',
    category: 'food_drink',
    costTier: '$$',
    durationMinutes: 120,
  },
  {
    id: 'food_drink_2',
    title: 'Taste test evening',
    description:
      'Set up a blind taste test — wines, cheeses, chocolates, or coffees — and rate them together.',
    category: 'food_drink',
    costTier: '$$',
    durationMinutes: 90,
  },
  {
    id: 'food_drink_3',
    title: 'Three-course meal, no recipe',
    description:
      'Cook a three-course meal together without looking at any recipes, just instinct.',
    category: 'food_drink',
    costTier: '$',
    durationMinutes: 150,
  },
  {
    id: 'food_drink_4',
    title: 'Progressive dinner',
    description:
      'Visit three different places for appetizer, main, and dessert in one evening.',
    category: 'food_drink',
    costTier: '$$$',
    durationMinutes: 180,
  },
  {
    id: 'food_drink_5',
    title: 'Recreate a restaurant dish',
    description:
      'Pick a restaurant dish you both love and try to recreate it at home.',
    category: 'food_drink',
    costTier: '$',
    durationMinutes: 120,
  },
  {
    id: 'food_drink_6',
    title: 'Breakfast for dinner',
    description:
      'Make a full breakfast spread for dinner — pancakes, eggs, the works.',
    category: 'food_drink',
    costTier: '$',
    durationMinutes: 90,
  },
  {
    id: 'food_drink_7',
    title: 'Homemade pasta night',
    description:
      'Make pasta from scratch together — the dough, the sauce, everything by hand.',
    category: 'food_drink',
    costTier: '$',
    durationMinutes: 150,
  },
  {
    id: 'food_drink_8',
    title: 'Best pizza hunt',
    description:
      'Find the best pizza in your area by trying three spots in one evening and picking a winner.',
    category: 'food_drink',
    costTier: '$$',
    durationMinutes: 180,
  },

  // ─── Free / Budget ─────────────────────────────────────
  {
    id: 'free_budget_1',
    title: 'Stargazing',
    description:
      'Bring a blanket somewhere dark and lie down together looking at the stars.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 90,
  },
  {
    id: 'free_budget_2',
    title: 'Sunrise walk',
    description:
      'Set an alarm and go for a walk together before the rest of the world wakes up.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'free_budget_3',
    title: 'Fridge picnic',
    description:
      'Have a picnic with whatever is already in the fridge — no grocery run allowed.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 90,
  },
  {
    id: 'free_budget_4',
    title: 'Open mic night',
    description:
      'Find a free open mic night nearby and go watch, or be brave and sign up.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 120,
  },
  {
    id: 'free_budget_5',
    title: 'Sunset from the best spot',
    description:
      'Find the best sunset-viewing spot you can and watch it together from start to finish.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 60,
  },
  {
    id: 'free_budget_6',
    title: 'Tour open houses',
    description:
      'Tour open houses in your neighborhood and imagine what life would be like in each one.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 120,
  },
  {
    id: 'free_budget_7',
    title: 'Free community event',
    description:
      'Find a free community event happening near you this week and go together.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 120,
  },
  {
    id: 'free_budget_8',
    title: 'Volunteer together',
    description:
      'Find a local volunteer opportunity and spend a morning giving back together.',
    category: 'free_budget',
    costTier: 'free',
    durationMinutes: 180,
  },
];

/**
 * Get ideas filtered by category.
 */
export function getIdeasByCategory(category: DateNightCategory): DateNightIdea[] {
  return DATE_NIGHT_IDEAS.filter((idea) => idea.category === category);
}

/**
 * Get a single idea by ID.
 */
export function getIdeaById(id: string): DateNightIdea | undefined {
  return DATE_NIGHT_IDEAS.find((idea) => idea.id === id);
}
