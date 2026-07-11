import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CompletionMoment } from './CompletionMoment';
import { useCompletionReactions } from '@/hooks/useExplorePrompts';
import { useReaction, type ReactionType } from '@/hooks/useReaction';
import { isMiddleScaleOutcome } from '@/utils/scale';
import { colors, spacing, typography } from '@/config/theme';
import type { HearthCompletion } from '@/hooks/useHearth';

interface HearthRevealSheetProps {
  visible: boolean;
  completion: HearthCompletion | null;
  myUid: string;
  partnerName: string;
  onClose: () => void;
}

/**
 * A past day's reveal, reopened from the Hearth — the same CompletionMoment
 * ceremony as the open-day chip sheet on Today, presented as a pageSheet.
 * No fetch: the completion doc already embeds both answers; only reactions
 * refresh while the sheet is up (seeded from the embedded map so they show
 * instantly). The completion id IS the assignment id, so the shared
 * reveal_seen key keeps revisited days flat — a day never seen on this
 * device (partner answered pre-install) plays the full choreography once:
 * the first read is the first reveal.
 */
export function HearthRevealSheet({
  visible,
  completion,
  myUid,
  partnerName,
  onClose,
}: HearthRevealSheetProps) {
  const { t } = useTranslation();
  const reaction = useReaction();

  // Fetched only while the sheet is up (mirrors the open-day chip modal);
  // useReaction invalidates ['completionReactions'] so a tap settles here.
  const revealId = visible && completion ? completion.id : null;
  const { data: fetchedReactions } = useCompletionReactions(revealId);

  if (!completion) return null;

  const myEntry = completion.responses.find((r) => r.userId === myUid) ?? null;
  const partnerEntry = completion.responses.find((r) => r.userId !== myUid) ?? null;

  const reactions = fetchedReactions ?? completion.reactions;
  const myReaction = (reactions?.[myUid] as ReactionType | undefined) ?? null;
  const partnerReaction =
    ((reactions &&
      Object.entries(reactions).find(([uid]) => uid !== myUid)?.[1]) as
      | ReactionType
      | undefined) ?? null;

  const myScore = completion.isScale ? (myEntry?.responseScore ?? null) : null;
  const partnerScore = completion.isScale ? (partnerEntry?.responseScore ?? null) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
            testID="hearth-reveal-close"
          >
            <Text style={styles.done} maxFontSizeMultiplier={1.4}>
              {t('common.done')}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <CompletionMoment
            key={completion.id}
            assignmentId={completion.id}
            promptText={completion.promptText}
            yourResponse={myEntry?.responseText ?? ''}
            partnerResponse={partnerEntry?.responseText ?? ''}
            partnerName={partnerName}
            yourImageUrl={myEntry?.imageUrl}
            partnerImageUrl={partnerEntry?.imageUrl}
            myReaction={myReaction}
            partnerReaction={partnerReaction}
            onReact={(r) =>
              reaction.mutate({
                assignmentId: completion.id,
                reaction: r,
                promptType: completion.category,
              })
            }
            yourScore={myScore}
            partnerScore={partnerScore}
            // Completion docs don't carry scale_config; null resolves to the
            // locked v1 defaults (the backend contract). Middle outcomes show
            // the light line plus the couch-flag / kept-for-couch state.
            showMidScaleLine={
              completion.isScale && isMiddleScaleOutcome(myScore, partnerScore, null)
            }
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
  },
  done: {
    ...typography.body,
    color: colors.accent.primary,
  },
  scroll: {
    padding: spacing.screen,
    paddingBottom: spacing.xl,
  },
});
