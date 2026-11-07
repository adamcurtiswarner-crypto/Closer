// Daily action cards: 120 love-language-aware micro-actions that cycle
// through one per day. Each action is tagged by love language and type
// (say/do/notice). The pick is deterministic per (language, dayOfYear)
// so both partners see the same card and it doesn't shuffle on re-render.

export type ActionType = 'say' | 'do' | 'notice';

export interface DailyAction {
  id: string;
  text: string;
  type: ActionType;
  language: string;
}

const ACTIONS: DailyAction[] = [
  // ============================================
  // WORDS OF AFFIRMATION (24 actions)
  // ============================================
  { id: 'wa-01', text: 'Text {partner} one specific thing they did this week that you noticed.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-02', text: 'Tell {partner} something about them you find attractive — be specific, not general.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-03', text: 'Send {partner} a voice note instead of a text. Let them hear the warmth.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-04', text: 'Leave a sticky note where {partner} will find it: one sentence, one real thing.', type: 'do', language: 'words_of_affirmation' },
  { id: 'wa-05', text: 'Thank {partner} for something they do every day that you have stopped mentioning.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-06', text: 'Tell {partner} about a moment this week when you were proud to be with them.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-07', text: 'Compliment {partner} in front of someone else — casually, honestly.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-08', text: 'Write down three words that describe how {partner} makes you feel. Share them.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-09', text: 'When {partner} walks in, say something kind before anything logistical.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-10', text: 'Describe a memory of {partner} that still makes you smile. Tell them about it.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-11', text: 'Say "I am glad I chose you" — or your version of it. Mean it.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-12', text: 'Name one way {partner} has changed you for the better. Tell them.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-13', text: 'Reply to {partner}\'s next message with more than one word. Match their energy.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-14', text: 'Ask {partner} what kind of encouragement they need right now. Then give it.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-15', text: 'Before bed, tell {partner} one thing from today you are grateful for about them.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-16', text: 'Record a short video telling {partner} why they matter. Send it unexpectedly.', type: 'do', language: 'words_of_affirmation' },
  { id: 'wa-17', text: 'The next time {partner} apologizes for something small, say "You do not need to be sorry for that."', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-18', text: 'Tell {partner} about a quality of theirs you hope your future kids inherit.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-19', text: 'When {partner} tells you about their day, respond to the feeling, not just the facts.', type: 'notice', language: 'words_of_affirmation' },
  { id: 'wa-20', text: 'Start a sentence with "One thing I never want you to doubt is..."', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-21', text: 'Say the kind version of something you have been editing in your head.', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-22', text: 'Call {partner} by a name that is only yours. If you do not have one, notice what comes naturally.', type: 'notice', language: 'words_of_affirmation' },
  { id: 'wa-23', text: 'When {partner} does something well at work, say "I see how hard you worked for that."', type: 'say', language: 'words_of_affirmation' },
  { id: 'wa-24', text: 'Write {partner} a two-line letter. Not a text — something on paper.', type: 'do', language: 'words_of_affirmation' },

  // ============================================
  // QUALITY TIME (24 actions)
  // ============================================
  { id: 'qt-01', text: 'Put both phones in another room for the next meal you share with {partner}.', type: 'do', language: 'quality_time' },
  { id: 'qt-02', text: 'Ask {partner} one real question and listen to the whole answer without solving anything.', type: 'do', language: 'quality_time' },
  { id: 'qt-03', text: 'Sit next to {partner} instead of across from them at dinner tonight.', type: 'do', language: 'quality_time' },
  { id: 'qt-04', text: 'Take a 15-minute walk with {partner} after dinner. No agenda, no destination.', type: 'do', language: 'quality_time' },
  { id: 'qt-05', text: 'Watch something {partner} loves that you would never pick. Be curious about why they love it.', type: 'do', language: 'quality_time' },
  { id: 'qt-06', text: 'Cook a meal together with {partner} — the making is the point, not the food.', type: 'do', language: 'quality_time' },
  { id: 'qt-07', text: 'Drive somewhere with {partner} with no plan. See where the conversation goes.', type: 'do', language: 'quality_time' },
  { id: 'qt-08', text: 'Ask {partner}: "What is the best part of your week so far?" Then actually listen.', type: 'do', language: 'quality_time' },
  { id: 'qt-09', text: 'Lie on the floor together with {partner} for five minutes. No phones. Just the ceiling.', type: 'do', language: 'quality_time' },
  { id: 'qt-10', text: 'Go to bed at the same time as {partner} tonight, even if you are not tired.', type: 'do', language: 'quality_time' },
  { id: 'qt-11', text: 'Do a boring errand with {partner} instead of splitting up. Proximity counts.', type: 'do', language: 'quality_time' },
  { id: 'qt-12', text: 'Put on music {partner} likes and just exist in the same room together.', type: 'do', language: 'quality_time' },
  { id: 'qt-13', text: 'Look at old photos together with {partner}. Let them pick which ones to linger on.', type: 'do', language: 'quality_time' },
  { id: 'qt-14', text: 'Make {partner} a cup of something and sit with them while they drink it.', type: 'do', language: 'quality_time' },
  { id: 'qt-15', text: 'Cancel one plan this week and spend that time with {partner} instead.', type: 'do', language: 'quality_time' },
  { id: 'qt-16', text: 'Ask {partner} what they daydream about. Stay in their world for a few minutes.', type: 'do', language: 'quality_time' },
  { id: 'qt-17', text: 'Share one thing you read or saw today with {partner} — bring them into your day.', type: 'say', language: 'quality_time' },
  { id: 'qt-18', text: 'Wake up 10 minutes early and have coffee with {partner} before the day starts.', type: 'do', language: 'quality_time' },
  { id: 'qt-19', text: 'Play a card game or board game with {partner}. Competition is closeness in disguise.', type: 'do', language: 'quality_time' },
  { id: 'qt-20', text: 'Invite {partner} into something you usually do alone. Let them see that part of you.', type: 'do', language: 'quality_time' },
  { id: 'qt-21', text: 'Take a different route home and call {partner} for the drive. No agenda.', type: 'do', language: 'quality_time' },
  { id: 'qt-22', text: 'Turn off the TV during dinner with {partner}. See what you talk about.', type: 'do', language: 'quality_time' },
  { id: 'qt-23', text: 'Ask {partner} to teach you something they know how to do. Be a beginner.', type: 'do', language: 'quality_time' },
  { id: 'qt-24', text: 'Set a timer for 20 minutes. Just be with {partner}. When it rings, you will not want to stop.', type: 'do', language: 'quality_time' },

  // ============================================
  // RECEIVING GIFTS (24 actions)
  // ============================================
  { id: 'rg-01', text: 'Bring {partner} their favorite drink without them asking.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-02', text: 'Save a meme, photo, or link that made you think of {partner}. Send it with "this is you."', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-03', text: 'Pick a flower, a leaf, a cool rock — anything from outside — and give it to {partner}.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-04', text: 'Buy {partner} the snack they always want but never buy for themselves.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-05', text: 'Find a photo of you and {partner} and set it as your phone background. Let them discover it.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-06', text: 'Leave something small on {partner}\'s pillow — a candy, a note, a drawing.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-07', text: 'Bookmark something online that {partner} would love. Share the link with a line about why.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-08', text: 'Make {partner} a playlist. Even three songs counts. Title it something only they would get.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-09', text: 'Order {partner}\'s favorite takeout and have it arrive as a surprise.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-10', text: 'Find something of {partner}\'s that is worn out and quietly replace it with a new one.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-11', text: 'Print a photo of you and {partner} and put it somewhere they will see every day.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-12', text: 'Give {partner} something from your pocket — a coin, a receipt with a note, anything tangible.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-13', text: 'Wrap something ordinary in paper and give it to {partner} like it is a gift. The wrapping is the point.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-14', text: 'Screenshot a compliment someone gave {partner} and send it to them.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-15', text: 'Buy a book you think {partner} would love. Write their name inside.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-16', text: 'Bring {partner} back something from wherever you went today — proof you thought of them.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-17', text: 'Make {partner} a coupon for something only you can give: a massage, a cooked meal, a free pass on chores.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-18', text: 'Draw something for {partner}. It does not have to be good. It has to be from you.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-19', text: 'Frame a moment. Literally — put a photo of you and {partner} in a frame.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-20', text: 'Give {partner} your dessert. All of it. Watch their face.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-21', text: 'When {partner} mentions wanting something, write it down secretly. Get it later.', type: 'notice', language: 'receiving_gifts' },
  { id: 'rg-22', text: 'Bring {partner} a warm towel from the dryer. The gesture is the gift.', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-23', text: 'Take a photo of something beautiful and text it to {partner}: "Wish you were here."', type: 'do', language: 'receiving_gifts' },
  { id: 'rg-24', text: 'Start a shared wish list with {partner}. Add one thing today. Let them add one.', type: 'do', language: 'receiving_gifts' },

  // ============================================
  // ACTS OF SERVICE (24 actions)
  // ============================================
  { id: 'as-01', text: 'Take one thing off {partner}\'s to-do list today without telling them.', type: 'do', language: 'acts_of_service' },
  { id: 'as-02', text: 'Make {partner}\'s morning easier — prep their coffee, pack their bag, clear the counter.', type: 'do', language: 'acts_of_service' },
  { id: 'as-03', text: 'Handle a phone call or errand that {partner} has been putting off.', type: 'do', language: 'acts_of_service' },
  { id: 'as-04', text: 'Fill {partner}\'s car with gas, charge their devices, or restock something they use daily.', type: 'do', language: 'acts_of_service' },
  { id: 'as-05', text: 'Cook dinner tonight so {partner} does not have to think about it.', type: 'do', language: 'acts_of_service' },
  { id: 'as-06', text: 'Clean something {partner} looks at every day but never says anything about.', type: 'do', language: 'acts_of_service' },
  { id: 'as-07', text: 'Take over bedtime routine or morning drop-off so {partner} gets a break.', type: 'do', language: 'acts_of_service' },
  { id: 'as-08', text: 'Make the appointment {partner} has been avoiding. Just put it on the calendar.', type: 'do', language: 'acts_of_service' },
  { id: 'as-09', text: 'Set out {partner}\'s clothes, towel, or favorite mug the night before. Small and quiet.', type: 'do', language: 'acts_of_service' },
  { id: 'as-10', text: 'Do the dishes before {partner} sees them. The absence of the mess is the message.', type: 'do', language: 'acts_of_service' },
  { id: 'as-11', text: 'Walk the dog, take out the trash, or handle the one chore {partner} dreads most.', type: 'do', language: 'acts_of_service' },
  { id: 'as-12', text: 'Fold {partner}\'s laundry and put it away. Not yours — theirs.', type: 'do', language: 'acts_of_service' },
  { id: 'as-13', text: 'Research something {partner} needs — a dentist, a warranty claim, a recipe — and hand them the answer.', type: 'do', language: 'acts_of_service' },
  { id: 'as-14', text: 'Fix something small that has been broken for a while. The fix says "I see it too."', type: 'do', language: 'acts_of_service' },
  { id: 'as-15', text: 'Pack {partner} a lunch or a snack for their day. Include something they did not ask for.', type: 'do', language: 'acts_of_service' },
  { id: 'as-16', text: 'Handle the grocery list this week. All of it — planning, shopping, putting away.', type: 'do', language: 'acts_of_service' },
  { id: 'as-17', text: 'Offer {partner} a foot rub, a shoulder rub, or just to carry something heavy.', type: 'do', language: 'acts_of_service' },
  { id: 'as-18', text: 'Take over a recurring task for a full week. See if {partner} notices the relief.', type: 'do', language: 'acts_of_service' },
  { id: 'as-19', text: 'Ask {partner}: "What can I take off your plate today?" And then actually do it.', type: 'say', language: 'acts_of_service' },
  { id: 'as-20', text: 'Write down {partner}\'s weekly schedule and find one place you can help.', type: 'do', language: 'acts_of_service' },
  { id: 'as-21', text: 'Do something {partner} always does, the way they do it — not your way.', type: 'notice', language: 'acts_of_service' },
  { id: 'as-22', text: 'When {partner} is overwhelmed, do not offer advice. Just start handling one thing.', type: 'do', language: 'acts_of_service' },
  { id: 'as-23', text: 'Tidy {partner}\'s space — desk, nightstand, car — without rearranging their system.', type: 'do', language: 'acts_of_service' },
  { id: 'as-24', text: 'Get up first tomorrow and make the house feel ready before {partner} wakes.', type: 'do', language: 'acts_of_service' },

  // ============================================
  // PHYSICAL TOUCH (24 actions)
  // ============================================
  { id: 'pt-01', text: 'When you pass {partner} today, touch their shoulder or back — small, quiet, intentional.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-02', text: 'Hold {partner}\'s hand for no reason. In the car, at the table, on the couch.', type: 'do', language: 'physical_touch' },
  { id: 'pt-03', text: 'Hug {partner} for 10 full seconds. Not a pat — a real hold.', type: 'do', language: 'physical_touch' },
  { id: 'pt-04', text: 'Sit close enough to {partner} that your legs touch. Stay there.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-05', text: 'Play with {partner}\'s hair while you are both watching something. No words needed.', type: 'do', language: 'physical_touch' },
  { id: 'pt-06', text: 'Kiss {partner} hello like you mean it — not a peck, not a routine.', type: 'do', language: 'physical_touch' },
  { id: 'pt-07', text: 'Put your hand on {partner}\'s knee during the next conversation. Just rest it there.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-08', text: 'Dance with {partner} in the kitchen. No music required. 30 seconds.', type: 'do', language: 'physical_touch' },
  { id: 'pt-09', text: 'Rub {partner}\'s shoulders for two minutes without being asked.', type: 'do', language: 'physical_touch' },
  { id: 'pt-10', text: 'When {partner} is stressed, do not talk. Just sit close and let your arm touch theirs.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-11', text: 'Reach for {partner}\'s hand while walking somewhere together.', type: 'do', language: 'physical_touch' },
  { id: 'pt-12', text: 'Lie next to {partner} for five minutes before getting up. No phone. Just warmth.', type: 'do', language: 'physical_touch' },
  { id: 'pt-13', text: 'When {partner} tells you something hard, move closer before you respond.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-14', text: 'Wrap your arms around {partner} from behind while they are doing something ordinary.', type: 'do', language: 'physical_touch' },
  { id: 'pt-15', text: 'Rest your head on {partner}\'s shoulder. Let them carry you for a minute.', type: 'do', language: 'physical_touch' },
  { id: 'pt-16', text: 'Touch {partner}\'s face gently. Forehead, cheek, jawline. Slowly.', type: 'do', language: 'physical_touch' },
  { id: 'pt-17', text: 'When you get into bed, find {partner} under the covers. Warmth before sleep.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-18', text: 'Give {partner} a foot massage tonight. Ten minutes. No reciprocation expected.', type: 'do', language: 'physical_touch' },
  { id: 'pt-19', text: 'Link arms with {partner} the next time you walk together. Old-fashioned and warm.', type: 'do', language: 'physical_touch' },
  { id: 'pt-20', text: 'Trace letters on {partner}\'s back. Let them guess the words.', type: 'do', language: 'physical_touch' },
  { id: 'pt-21', text: 'Greet {partner} at the door with a real embrace. Not words first — contact first.', type: 'do', language: 'physical_touch' },
  { id: 'pt-22', text: 'During a movie, pull {partner} closer. Let them lean into you.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-23', text: 'When {partner} is talking, put your hand on theirs. Listen with your body.', type: 'notice', language: 'physical_touch' },
  { id: 'pt-24', text: 'Before you leave the house, stop and hold {partner}. Make the goodbye physical, not just verbal.', type: 'do', language: 'physical_touch' },
];

/**
 * Pick today's action based on the partner's love language and the day
 * of the year. Deterministic — same couple, same day, same action.
 * Falls back to a random language action if no love language is set.
 */
export function pickDailyAction(
  partnerLoveLanguage: string | null,
  dayOfYear: number = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
): DailyAction {
  const pool = partnerLoveLanguage
    ? ACTIONS.filter((a) => a.language === partnerLoveLanguage)
    : ACTIONS;

  const index = Math.abs(dayOfYear) % pool.length;
  return pool[index];
}

/** All actions for a given language (for browsing). */
export function actionsForLanguage(language: string): DailyAction[] {
  return ACTIONS.filter((a) => a.language === language);
}

export const TOTAL_ACTIONS = ACTIONS.length;
