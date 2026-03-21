import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  db,
  VALID_PROMPT_TYPES,
  VALID_PROMPT_DEPTHS,
  getEffectiveTone,
  getWeekId,
  formatDate,
  sendPushNotification,
} from './shared';

// ============================================
// AI Constants (private)
// ============================================

const DEFAULT_AI_MODEL = 'claude-sonnet-4-5-20250929';
let cachedAIModel: string | null = null;

const AI_MAX_PER_CALL = 10;
const AI_RATE_LIMIT_HOURS = 1;

// ============================================
// PRIVATE: Get AI Model
// ============================================

async function getAIModel(): Promise<string> {
  if (cachedAIModel) return cachedAIModel;
  try {
    const doc = await db.doc('admin_state/ai_generation').get();
    const modelId = doc.data()?.model_id;
    if (modelId && typeof modelId === 'string') {
      cachedAIModel = modelId;
      return cachedAIModel;
    }
  } catch (err) {
    functions.logger.warn('Failed to read AI model from Firestore, using default', err);
  }
  cachedAIModel = DEFAULT_AI_MODEL;
  return cachedAIModel;
}

// ============================================
// PRIVATE: Build Coaching Prompt
// ============================================

function buildCoachingPrompt(data: {
  score: number; prevScore: number | null; tier: string; scoreDrop: number;
  emotionPositive: number; emotionNegative: number; emotionTotal: number;
  avgResponseLength: number;
  completedAssignments: number; totalAssignments: number;
  partialAssignments: number;
  checkInScores: number[];
  lastAction: { text: string; actedOn: boolean } | null;
  toneCalibration: string;
}): string {
  const emotionSummary = data.emotionTotal > 0
    ? `${data.emotionPositive} warm, ${data.emotionTotal - data.emotionPositive - data.emotionNegative} okay, ${data.emotionNegative} hard`
    : 'No emotion data this week';

  const checkInSummary = data.checkInScores.length > 0
    ? `Avg score: ${(data.checkInScores.reduce((a, b) => a + b, 0) / data.checkInScores.length).toFixed(1)}/5`
    : 'No check-in data';

  const lastActionSummary = data.lastAction
    ? `Last week's suggestion: "${data.lastAction.text}" — ${data.lastAction.actedOn ? 'completed' : 'not taken'}`
    : 'No previous suggestion';

  const toneInstruction = data.toneCalibration === 'struggling'
    ? 'This couple has acknowledged struggling to connect. Be especially gentle and validating. Acknowledge that showing up matters. Suggest the smallest possible action — lower the bar, not raise it.'
    : data.toneCalibration === 'distant'
      ? 'This couple has acknowledged feeling distant. Be gently encouraging. Emphasize small reconnection moments. Frame suggestions as easy first steps.'
      : 'Warm, quiet, direct. No exclamation points. No emojis. Never blame either partner. Focus on the relationship, not individuals.';

  const tierContext = data.tier === 'thriving'
    ? 'This couple is doing well. Celebrate what they are doing right and suggest something to keep the momentum — a fun activity, a deeper conversation, or a new ritual.'
    : data.tier === 'steady'
      ? 'This couple is steady. Gently encourage them to go a little deeper this week.'
      : '';

  return `You are a warm, non-judgmental relationship coach. Based on this couple's engagement data from the past week, write a brief (2-3 sentence) personalized insight and one specific, actionable suggestion.
${tierContext ? `\nContext: ${tierContext}` : ''}

Data:
- Pulse score: ${data.score}/100 (was ${data.prevScore ?? 'unknown'}, change: ${data.scoreDrop > 0 ? '-' : '+'}${Math.abs(data.scoreDrop)})
- Emotion trend: ${emotionSummary}
- Days active: ${data.completedAssignments}/${data.totalAssignments} prompts completed
- One-sided days: ${data.partialAssignments} (one partner responded but not the other)
- Check-in: ${checkInSummary}
- ${lastActionSummary}

Respond in exactly this format:
Insight: [Your 2-3 sentence observation]
Suggestion: [One specific actionable thing they can do]
Type: [One of: goal, date_night, conversation, revisit, check_in]

Tone: ${toneInstruction}`;
}

// ============================================
// PRIVATE: Parse Coaching Response
// ============================================

function parseCoachingResponse(text: string): { insightText: string; actionType: string; actionText: string } {
  const insightMatch = text.match(/Insight:\s*(.+?)(?=\nSuggestion:)/s);
  const suggestionMatch = text.match(/Suggestion:\s*(.+?)(?=\nType:)/s);
  const typeMatch = text.match(/Type:\s*(\w+)/);

  return {
    insightText: insightMatch?.[1]?.trim() || text.split('\n')[0],
    actionText: suggestionMatch?.[1]?.trim() || 'Take a moment to connect today',
    actionType: typeMatch?.[1]?.trim() || 'conversation',
  };
}

// ============================================
// PRIVATE: Generate Prompts Batch
// ============================================

async function generatePromptsBatch(
  count: number,
  targetType?: string,
  targetDepth?: string
): Promise<{ generated: number; promptIds: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Anthropic API key not configured');
  }

  // Gather context: existing prompt texts to avoid duplication
  const existingPromptsSnap = await db
    .collection('prompts')
    .where('status', 'in', ['active', 'testing'])
    .get();

  const existingTexts = existingPromptsSnap.docs.map((d) => d.data().text);

  // Count prompts by type to find underrepresented categories
  const typeCounts: Record<string, number> = {};
  for (const doc of existingPromptsSnap.docs) {
    const type = doc.data().type;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  // Find top-performing patterns
  const topPrompts = existingPromptsSnap.docs
    .filter((d) => (d.data().times_assigned || 0) >= 5)
    .sort((a, b) => (b.data().positive_response_rate || 0) - (a.data().positive_response_rate || 0))
    .slice(0, 5)
    .map((d) => d.data().text);

  // Build system prompt
  const systemPrompt = `You are a prompt designer for Stoke, a relationship app for long-term couples. Generate conversation prompts that help couples connect meaningfully.

Brand voice: Warm, quiet, direct. Never cute, clinical, or urgent. No exclamation points.

Prompt types (choose from): ${VALID_PROMPT_TYPES.join(', ')}
Emotional depths: ${VALID_PROMPT_DEPTHS.join(', ')}

Rules:
- Each prompt should be a single open-ended question or gentle invitation
- Prompts should feel natural, like something a thoughtful friend would ask
- Avoid therapy jargon, relationship clichés, or overly personal topics
- Keep prompts between 10-80 words
- Include an optional "hint" (1 sentence, helps if someone feels stuck)
- Do NOT duplicate these existing prompts: ${existingTexts.slice(0, 30).join(' | ')}

${topPrompts.length > 0 ? `Top-performing prompts for reference: ${topPrompts.join(' | ')}` : ''}

Current type distribution: ${JSON.stringify(typeCounts)}
${targetType ? `Focus on type: ${targetType}` : 'Balance across underrepresented types.'}
${targetDepth ? `Target depth: ${targetDepth}` : 'Mix of depths.'}

Respond with a JSON array of objects, each with: text, hint, type, emotional_depth, requires_conversation (boolean).`;

  // Call Claude API via fetch
  const aiModel = await getAIModel();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: aiModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate exactly ${count} new prompts. Return only the JSON array, no other text.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new functions.https.HttpsError('internal', `Claude API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || '';

  // Parse JSON from response — handle markdown code fences
  let prompts: admin.firestore.DocumentData[];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    prompts = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Failed to parse AI response as JSON');
  }

  // Validate and store prompts
  const promptIds: string[] = [];
  for (const prompt of prompts) {
    // Validate type and depth
    if (!VALID_PROMPT_TYPES.includes(prompt.type)) continue;
    if (!VALID_PROMPT_DEPTHS.includes(prompt.emotional_depth)) continue;
    if (!prompt.text || typeof prompt.text !== 'string') continue;

    const promptRef = await db.collection('prompts').add({
      text: prompt.text,
      hint: prompt.hint || null,
      type: prompt.type,
      research_basis: 'original',
      emotional_depth: prompt.emotional_depth,
      requires_conversation: prompt.requires_conversation || false,
      status: 'testing',
      status_changed_at: admin.firestore.FieldValue.serverTimestamp(),
      testing_started_at: admin.firestore.FieldValue.serverTimestamp(),
      week_restriction: null,
      max_per_week: null,
      day_preference: null,
      times_assigned: 0,
      times_completed: 0,
      completion_rate: 0,
      avg_response_length: 0,
      positive_response_rate: 0,
      ai_generated: true,
      ai_model: aiModel,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: 'ai',
    });

    promptIds.push(promptRef.id);
  }

  return { generated: promptIds.length, promptIds };
}

// ============================================
// PRIVATE: Compute Pulse for Couple
// ============================================

export async function computePulseForCouple(coupleId: string, coupleData: admin.firestore.DocumentData): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekId = getWeekId(new Date());

  // 1. Fetch responses from last 7 days
  const responsesSnap = await db
    .collection('prompt_responses')
    .where('couple_id', '==', coupleId)
    .where('submitted_at', '>=', admin.firestore.Timestamp.fromDate(weekAgo))
    .get();

  const responses = responsesSnap.docs.map((d) => d.data());

  // 2. Fetch assignments from last 7 days
  const assignmentsSnap = await db
    .collection('prompt_assignments')
    .where('couple_id', '==', coupleId)
    .where('assigned_date', '>=', formatDate(weekAgo))
    .get();

  const totalAssignments = assignmentsSnap.size;
  const completedAssignments = assignmentsSnap.docs.filter(
    (d) => d.data().status === 'completed'
  ).length;
  const partialAssignments = assignmentsSnap.docs.filter(
    (d) => d.data().response_count === 1
  ).length;

  // 3. Fetch latest check-ins for both members
  const memberIds: string[] = coupleData.member_ids || [];
  const checkInScores: Record<string, number[]> = {};

  for (const memberId of memberIds) {
    const checkInSnap = await db
      .collection('couples')
      .doc(coupleId)
      .collection('check_ins')
      .where('user_id', '==', memberId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (!checkInSnap.empty) {
      const data = checkInSnap.docs[0].data();
      checkInScores[memberId] = data.responses.map((r: { score: number }) => r.score);
    }
  }

  // Extract tone calibration from member docs
  const tones: string[] = [];
  for (const memberId of memberIds) {
    const memberDoc = await db.collection('users').doc(memberId).get();
    if (memberDoc.exists) {
      tones.push(memberDoc.data()!.tone_calibration || 'solid');
    }
  }
  const effectiveTone = getEffectiveTone(tones);

  // 4. Compute signal scores
  const emotionPositive = responses.filter(
    (r) => r.emotional_response === 'positive'
  ).length;
  const emotionNegative = responses.filter(
    (r) => r.emotional_response === 'negative'
  ).length;
  const emotionTotal = responses.filter((r) => r.emotional_response).length;

  const avgResponseLength =
    responses.length > 0
      ? responses.reduce((sum, r) => sum + (r.response_length || 0), 0) /
        responses.length
      : 0;

  // 5. Compute pulse score (0-100)
  let score = 50; // baseline

  // Emotion signal (high weight, +/- 20 points)
  if (emotionTotal > 0) {
    const positiveRate = emotionPositive / emotionTotal;
    const negativeRate = emotionNegative / emotionTotal;
    score += (positiveRate - negativeRate) * 20;
  }

  // Completion rate (medium weight, +/- 15 points)
  if (totalAssignments > 0) {
    const completionRate = completedAssignments / totalAssignments;
    score += (completionRate - 0.5) * 30; // 100% = +15, 0% = -15
  }

  // One-sided engagement (high weight, -10 points per one-sided day)
  score -= partialAssignments * 10;

  // Check-in scores (high weight, +/- 15 points)
  const allCheckInScores = Object.values(checkInScores).flat();
  if (allCheckInScores.length > 0) {
    const avgCheckIn =
      allCheckInScores.reduce((a, b) => a + b, 0) / allCheckInScores.length;
    score += (avgCheckIn - 3) * 7.5; // 5/5 = +15, 1/5 = -15
  }

  // Response length (low weight, bonus for engagement)
  if (avgResponseLength > 100) score += 5;
  else if (avgResponseLength < 30) score -= 5;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine tier
  const tier =
    score >= 80
      ? 'thriving'
      : score >= 60
        ? 'steady'
        : score >= 40
          ? 'cooling'
          : 'needs_attention';

  // 6. Write pulse score
  await db
    .collection('couples')
    .doc(coupleId)
    .collection('pulse_scores')
    .doc(weekId)
    .set({
      score,
      tier,
      breakdown: {
        emotion_positive: emotionPositive,
        emotion_negative: emotionNegative,
        emotion_total: emotionTotal,
        completion_rate:
          totalAssignments > 0 ? completedAssignments / totalAssignments : null,
        one_sided_days: partialAssignments,
        avg_response_length: Math.round(avgResponseLength),
        avg_check_in:
          allCheckInScores.length > 0
            ? allCheckInScores.reduce((a, b) => a + b, 0) /
              allCheckInScores.length
            : null,
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

  // 7. Update couple doc with latest pulse
  await db.collection('couples').doc(coupleId).update({
    current_pulse_score: score,
    current_pulse_tier: tier,
  });

  console.log(`Pulse for couple ${coupleId}: ${score} (${tier})`);

  // === AI Coaching Generation ===
  // Generate coaching insights for all Premium couples weekly
  const prevWeekId = getWeekId(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const prevPulseDoc = await db.collection('couples').doc(coupleId)
    .collection('pulse_scores').doc(prevWeekId).get();
  const prevScore = prevPulseDoc.exists ? prevPulseDoc.data()?.score : null;
  const scoreDrop = prevScore !== null ? prevScore - score : 0;

  {
    // Check for Premium access
    const premiumUntil = coupleData.premium_until?.toDate?.() || coupleData.premium_until;
    if (!premiumUntil || new Date(premiumUntil) < new Date()) {
      console.log(`Couple ${coupleId} needs coaching but is not Premium — skipping`);
      return;
    }

    // Fetch last week's coaching for follow-up context
    const lastCoaching = await db.collection('couples').doc(coupleId)
      .collection('coaching_insights').doc(prevWeekId).get();
    const lastAction = lastCoaching.exists ? lastCoaching.data() : null;

    // Build the Claude prompt
    const coachingPrompt = buildCoachingPrompt({
      score, prevScore, tier, scoreDrop,
      emotionPositive, emotionNegative, emotionTotal,
      avgResponseLength,
      completedAssignments, totalAssignments,
      partialAssignments,
      checkInScores: allCheckInScores,
      lastAction: lastAction ? {
        text: lastAction.action_text,
        actedOn: !!lastAction.acted_on,
      } : null,
      toneCalibration: effectiveTone,
    });

    // Call Claude API (match existing Anthropic usage pattern)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log(`Couple ${coupleId} needs coaching but Anthropic API key not configured — skipping`);
      return;
    }

    const coachingModel = await getAIModel();
    const coachingResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: coachingModel,
        max_tokens: 300,
        messages: [{ role: 'user', content: coachingPrompt }],
      }),
    });

    const coachingResult = await coachingResponse.json();
    const responseText = coachingResult.content?.[0]?.type === 'text'
      ? coachingResult.content[0].text
      : '';
    const { insightText, actionType, actionText } = parseCoachingResponse(responseText);

    // Write coaching insight
    await db.collection('couples').doc(coupleId)
      .collection('coaching_insights').doc(weekId).set({
        pulse_score: score,
        insight_text: insightText,
        action_type: actionType,
        action_text: actionText,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        dismissed_at: null,
        acted_on: null,
      });

    // Notify both partners
    const notifMemberIds: string[] = coupleData.member_ids || [];
    for (const memberId of notifMemberIds) {
      const notifBody = tier === 'cooling' || tier === 'needs_attention'
        ? 'We put together something for you two this week'
        : 'Your weekly relationship insight is ready';

      await sendPushNotification(memberId, {
        title: 'Stoke',
        body: notifBody,
      }, { type: 'coaching_insight' });
    }

    console.log(`Coaching insight generated for couple ${coupleId}: ${actionType}`);
  }
}

// ============================================
// SCHEDULED: Compute Relationship Pulse (Monday 3 AM PT)
// ============================================

export const computeRelationshipPulse = functions.pubsub
  .schedule('every monday 03:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const couplesSnap = await db
      .collection('couples')
      .where('status', '==', 'active')
      .get();

    let processed = 0;
    let failed = 0;

    for (const coupleDoc of couplesSnap.docs) {
      try {
        await computePulseForCouple(coupleDoc.id, coupleDoc.data());
        processed++;
      } catch (err) {
        console.error(`Pulse computation failed for couple ${coupleDoc.id}:`, err);
        failed++;
      }
    }

    console.log(`computeRelationshipPulse: processed ${processed}, failed ${failed}`);
    return null;
  });

// ============================================
// CALLABLE: Trigger Pulse Computation (manual)
// ============================================

export const triggerPulseComputation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  if (!userData.couple_id) {
    throw new functions.https.HttpsError('failed-precondition', 'Not linked to a partner');
  }

  const coupleDoc = await db.collection('couples').doc(userData.couple_id).get();
  if (!coupleDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Couple not found');
  }

  await computePulseForCouple(coupleDoc.id, coupleDoc.data()!);

  return { success: true, coupleId: userData.couple_id };
});

// ============================================
// CALLABLE: Generate AI Prompts (Admin)
// ============================================

export const generateAIPrompts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const count = Math.min(data?.count || 5, AI_MAX_PER_CALL);
  const targetType = data?.targetType;
  const targetDepth = data?.targetDepth;

  // Rate limit: 1 call per hour
  const stateRef = db.collection('admin_state').doc('ai_generation');
  const stateDoc = await stateRef.get();
  if (stateDoc.exists) {
    const lastRun = stateDoc.data()?.last_run_at?.toDate();
    if (lastRun) {
      const hoursSince = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
      if (hoursSince < AI_RATE_LIMIT_HOURS) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `AI generation is rate-limited. Try again in ${Math.ceil((AI_RATE_LIMIT_HOURS - hoursSince) * 60)} minutes.`
        );
      }
    }
  }

  // Update rate limit timestamp
  await stateRef.set({
    last_run_at: admin.firestore.FieldValue.serverTimestamp(),
    triggered_by: context.auth.uid,
  }, { merge: true });

  const result = await generatePromptsBatch(count, targetType, targetDepth);

  return {
    success: true,
    generated: result.generated,
    prompt_ids: result.promptIds,
  };
});

// ============================================
// SCHEDULED: Auto-Generate Prompts (Monday 2 AM PT)
// ============================================

export const autoGeneratePrompts = functions.pubsub
  .schedule('every monday 02:00')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    try {
      // Check if active prompt pool is below threshold
      const activePromptsSnap = await db
        .collection('prompts')
        .where('status', 'in', ['active', 'testing'])
        .get();

      const activeCount = activePromptsSnap.size;
      const TARGET_POOL_SIZE = 150;

      if (activeCount >= TARGET_POOL_SIZE) {
        console.log(`Prompt pool at ${activeCount}, no generation needed`);
        return null;
      }

      const deficit = Math.min(TARGET_POOL_SIZE - activeCount, AI_MAX_PER_CALL);
      console.log(`Prompt pool at ${activeCount}, generating ${deficit} prompts`);

      const result = await generatePromptsBatch(deficit);
      console.log(`Auto-generated ${result.generated} prompts: ${result.promptIds.join(', ')}`);
    } catch (error) {
      console.error('Auto-generate prompts failed:', error);
    }

    return null;
  });

// ============================================
// CALLABLE: Generate Coaching Insight On Demand
// ============================================

export const generateCoachingInsight = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  if (!userData.couple_id) {
    throw new functions.https.HttpsError('failed-precondition', 'Not linked to a partner');
  }

  const coupleId = userData.couple_id;
  const coupleDoc = await db.collection('couples').doc(coupleId).get();
  if (!coupleDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Couple not found');
  }

  const coupleData = coupleDoc.data()!;

  // Check Premium access
  const premiumUntil = coupleData.premium_until?.toDate?.() || coupleData.premium_until;
  if (!premiumUntil || new Date(premiumUntil) < new Date()) {
    throw new functions.https.HttpsError('permission-denied', 'Premium subscription required');
  }

  const weekId = getWeekId(new Date());

  // Return existing insight if one already exists for this week
  const existingInsight = await db.collection('couples').doc(coupleId)
    .collection('coaching_insights').doc(weekId).get();

  if (existingInsight.exists) {
    const d = existingInsight.data()!;
    return {
      success: true,
      existing: true,
      insight: {
        weekId,
        pulseScore: d.pulse_score,
        insightText: d.insight_text,
        actionType: d.action_type,
        actionText: d.action_text,
      },
    };
  }

  // Use existing pulse score from couple doc, or compute fresh
  let score = coupleData.current_pulse_score;
  let tier = coupleData.current_pulse_tier;

  if (score == null || !tier) {
    // No pulse score yet — compute one
    await computePulseForCouple(coupleId, coupleData);
    // Re-read the couple doc to get computed score
    const refreshedCouple = await db.collection('couples').doc(coupleId).get();
    const refreshedData = refreshedCouple.data()!;
    score = refreshedData.current_pulse_score ?? 50;
    tier = refreshedData.current_pulse_tier ?? 'steady';
  }

  // Gather context for the coaching prompt
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekId = getWeekId(weekAgo);

  const [responsesSnap, assignmentsSnap, prevPulseDoc, lastCoaching] = await Promise.all([
    db.collection('prompt_responses')
      .where('couple_id', '==', coupleId)
      .where('submitted_at', '>=', admin.firestore.Timestamp.fromDate(weekAgo))
      .get(),
    db.collection('prompt_assignments')
      .where('couple_id', '==', coupleId)
      .where('assigned_date', '>=', formatDate(weekAgo))
      .get(),
    db.collection('couples').doc(coupleId)
      .collection('pulse_scores').doc(prevWeekId).get(),
    db.collection('couples').doc(coupleId)
      .collection('coaching_insights').doc(prevWeekId).get(),
  ]);

  const responses = responsesSnap.docs.map((d) => d.data());
  const totalAssignments = assignmentsSnap.size;
  const completedAssignments = assignmentsSnap.docs.filter(
    (d) => d.data().status === 'completed'
  ).length;
  const partialAssignments = assignmentsSnap.docs.filter(
    (d) => d.data().response_count === 1
  ).length;

  const emotionPositive = responses.filter((r) => r.emotional_response === 'positive').length;
  const emotionNegative = responses.filter((r) => r.emotional_response === 'negative').length;
  const emotionTotal = responses.filter((r) => r.emotional_response).length;
  const avgResponseLength = responses.length > 0
    ? responses.reduce((sum, r) => sum + (r.response_length || 0), 0) / responses.length
    : 0;

  // Check-in scores
  const memberIds: string[] = coupleData.member_ids || [];
  const allCheckInScores: number[] = [];
  for (const memberId of memberIds) {
    const checkInSnap = await db.collection('couples').doc(coupleId)
      .collection('check_ins')
      .where('user_id', '==', memberId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (!checkInSnap.empty) {
      const checkData = checkInSnap.docs[0].data();
      allCheckInScores.push(...checkData.responses.map((r: { score: number }) => r.score));
    }
  }

  // Tone calibration
  const tones: string[] = [];
  for (const memberId of memberIds) {
    const memberDoc = await db.collection('users').doc(memberId).get();
    if (memberDoc.exists) {
      tones.push(memberDoc.data()!.tone_calibration || 'solid');
    }
  }

  const prevScore = prevPulseDoc.exists ? prevPulseDoc.data()?.score : null;
  const scoreDrop = prevScore !== null ? prevScore - score : 0;
  const lastAction = lastCoaching.exists ? lastCoaching.data() : null;

  const coachingPrompt = buildCoachingPrompt({
    score, prevScore, tier, scoreDrop,
    emotionPositive, emotionNegative, emotionTotal,
    avgResponseLength,
    completedAssignments, totalAssignments,
    partialAssignments,
    checkInScores: allCheckInScores,
    lastAction: lastAction ? {
      text: lastAction.action_text,
      actedOn: !!lastAction.acted_on,
    } : null,
    toneCalibration: getEffectiveTone(tones),
  });

  // Call Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('unavailable', 'AI service not configured');
  }

  const coachingModel = await getAIModel();
  const coachingResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: coachingModel,
      max_tokens: 300,
      messages: [{ role: 'user', content: coachingPrompt }],
    }),
  });

  const coachingResult = await coachingResponse.json();
  const responseText = coachingResult.content?.[0]?.type === 'text'
    ? coachingResult.content[0].text
    : '';
  const { insightText, actionType, actionText } = parseCoachingResponse(responseText);

  // Write coaching insight
  await db.collection('couples').doc(coupleId)
    .collection('coaching_insights').doc(weekId).set({
      pulse_score: score,
      insight_text: insightText,
      action_type: actionType,
      action_text: actionText,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      dismissed_at: null,
      acted_on: null,
    });

  console.log(`On-demand coaching insight generated for couple ${coupleId}: ${actionType}`);

  return {
    success: true,
    existing: false,
    insight: {
      weekId,
      pulseScore: score,
      insightText,
      actionType,
      actionText,
    },
  };
});

// ============================================
// SCHEDULED: Clean Up Expired Coaching Insights
// ============================================

export const cleanupCoachingInsights = functions.pubsub
  .schedule('30 3 * * *')
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const couplesSnapshot = await db.collection('couples').get();
    let totalDeleted = 0;

    for (const coupleDoc of couplesSnapshot.docs) {
      const insightsQuery = await db
        .collection('couples')
        .doc(coupleDoc.id)
        .collection('coaching_insights')
        .where('created_at', '<', cutoff)
        .get();

      if (insightsQuery.empty) continue;

      const batch = db.batch();
      insightsQuery.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      totalDeleted += insightsQuery.size;
    }

    console.log(`cleanupCoachingInsights: deleted ${totalDeleted} expired insight documents`);
    return null;
  });
