import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { logEvent } from '@/services/analytics';
import { THERAPIST_RESOURCES } from '@/config/therapistResources';
import type { TherapistResource } from '@/config/therapistResources';
import { logger } from '@/utils/logger';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

// Curated subset for the safety off-ramp: a crisis line (tel:), a text
// line, the domestic violence hotline, and a therapist finder. Order is
// intentional — the most immediate help first.
const SAFETY_RESOURCE_IDS = ['lifeline_988', 'crisis_text', 'ndvh', 'regain'] as const;

export function getSafetyResources(): TherapistResource[] {
  return SAFETY_RESOURCE_IDS.map((id) =>
    THERAPIST_RESOURCES.find((r) => r.id === id)
  ).filter((r): r is TherapistResource => r != null);
}

interface SafetyResourcesProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Quiet safety off-ramp. Shown once after a submission whose text contains
 * crisis language — never blocking, never labeling. Offers a handful of
 * real supports and a single way to dismiss.
 */
export function SafetyResources({ visible, onClose }: SafetyResourcesProps) {
  const loggedRef = useRef(false);

  useEffect(() => {
    if (visible && !loggedRef.current) {
      loggedRef.current = true;
      logEvent('safety_resources_shown');
    }
    if (!visible) {
      loggedRef.current = false;
    }
  }, [visible]);

  const handleOpen = async (resource: TherapistResource) => {
    logEvent('resource_link_opened', {
      resource_id: resource.id,
      category: resource.category,
    });
    try {
      await Linking.openURL(resource.phone ? `tel:${resource.phone}` : resource.url);
    } catch (error) {
      logger.warn('Could not open resource link:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handleBar} />

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.eyebrow}>A quiet note</Text>
            <Text style={styles.heading}>If things feel heavy</Text>
            <Text style={styles.body}>
              Some things deserve more support than a prompt can offer. If any
              of this feels bigger than the two of you right now, these are
              good places to turn. They're confidential, and reaching out is
              always okay.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.rows}>
            {getSafetyResources().map((resource) => (
              <TouchableOpacity
                key={resource.id}
                testID={`safety-resource-${resource.id}`}
                style={styles.row}
                onPress={() => handleOpen(resource)}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{resource.name}</Text>
                  <Text style={styles.rowDescription}>{resource.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.footer}>
            <TouchableOpacity
              testID="safety-resources-dismiss"
              style={styles.dismissPill}
              onPress={onClose}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <Text style={styles.dismissText} maxFontSizeMultiplier={1.4}>Okay</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginTop: spacing.smd,
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accent.primary,
    marginBottom: spacing.sm,
  },
  heading: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  rows: {
    gap: spacing.itemGap,
  },
  row: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    ...shadow.cardSubtle,
  },
  rowText: {
    gap: 2,
  },
  rowName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  rowDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  dismissPill: {
    minHeight: 44,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.ink,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
});
