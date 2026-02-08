import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { PromptCard, CompletionMoment, PartnerStatus } from '@components';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { useTodayPrompt, useSubmitResponse, useSubmitFeedback, useTriggerPrompt } from '@/hooks/usePrompt';
import { logEvent } from '@/services/analytics';

export default function TodayScreen() {
  const { user } = useAuth();
  const {
    isPartnerOnline,
    isPartnerTyping,
    partnerTypingContext,
    partnerLastSeen,
    setTyping,
    markResponseViewed,
  } = usePresence();

  const { data: todayData, isLoading, error } = useTodayPrompt();
  const submitResponse = useSubmitResponse();
  const submitFeedback = useSubmitFeedback();
  const triggerPrompt = useTriggerPrompt();

  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // Derive mode from real data
  const assignment = todayData?.assignment ?? null;
  const myResponse = todayData?.myResponse ?? null;
  const partnerResponse = todayData?.partnerResponse ?? null;
  const isComplete = todayData?.isComplete ?? false;
  const nextPromptAt = todayData?.nextPromptAt ?? null;

  type Mode = 'loading' | 'no-prompt' | 'prompt' | 'responding' | 'waiting' | 'complete';

  let mode: Mode;
  if (isLoading) {
    mode = 'loading';
  } else if (!assignment) {
    mode = 'no-prompt';
  } else if (isResponding) {
    mode = 'responding';
  } else if (!myResponse) {
    mode = 'prompt';
  } else if (!isComplete) {
    mode = 'waiting';
  } else {
    mode = 'complete';
  }

  // Log prompt_viewed when assignment first loads
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (assignment && assignment.id !== viewedRef.current) {
      viewedRef.current = assignment.id;
      logEvent('prompt_viewed', {
        assignment_id: assignment.id,
        prompt_type: assignment.promptType,
      });
    }
  }, [assignment]);

  // Handle text change with typing indicator
  const handleTextChange = (text: string) => {
    setResponseText(text);
    if (text.length > 0) {
      setTyping(true, 'prompt');
    } else {
      setTyping(false);
    }
  };

  // Clear typing when leaving responding mode
  useEffect(() => {
    if (mode !== 'responding') {
      setTyping(false);
    }
  }, [mode, setTyping]);

  // Mark response as viewed when entering complete mode
  useEffect(() => {
    if (mode === 'complete') {
      markResponseViewed();
    }
  }, [mode, markResponseViewed]);

  const handleRespond = () => {
    setIsResponding(true);
    if (assignment) {
      logEvent('prompt_started', { assignment_id: assignment.id });
    }
  };

  const handleSubmit = async () => {
    if (responseText.length < 10 || !assignment) return;
    setTyping(false);
    setIsResponding(false);
    try {
      await submitResponse.mutateAsync({
        assignmentId: assignment.id,
        responseText,
      });
    } catch (err) {
      console.error('Error submitting response:', err);
    }
  };

  const partnerName = user?.partnerName || 'Partner';

  // Loading state
  if (mode === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#c97454" />
        </View>
      </SafeAreaView>
    );
  }

  // No prompt assigned yet
  if (mode === 'no-prompt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Today</Text>
              <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
            </View>
            <PartnerStatus
              isOnline={isPartnerOnline}
              isTyping={isPartnerTyping}
              typingContext={partnerTypingContext}
              lastSeen={partnerLastSeen}
              partnerName={partnerName}
            />
          </View>

          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>~</Text>
            <Text style={styles.emptyTitle}>No prompt yet</Text>
            <Text style={styles.emptySubtitle}>
              {nextPromptAt
                ? `Your next prompt arrives at ${format(new Date(nextPromptAt), 'h:mm a')}`
                : "Your prompt will arrive soon"}
            </Text>
            {user?.coupleId && (
              <TouchableOpacity
                style={[styles.triggerButton, triggerPrompt.isPending && styles.disabled]}
                onPress={() => triggerPrompt.mutate()}
                disabled={triggerPrompt.isPending}
              >
                <Text style={styles.triggerButtonText}>
                  {triggerPrompt.isPending ? 'Loading...' : "Get today's prompt"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Response input mode
  if (mode === 'responding') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.respondingContainer}>
            <Text style={styles.promptTextSmall}>"{assignment!.promptText}"</Text>

            <TextInput
              style={styles.textInput}
              placeholder="Your response..."
              placeholderTextColor="#a8a29e"
              multiline
              textAlignVertical="top"
              value={responseText}
              onChangeText={handleTextChange}
              autoFocus
            />

            <Text style={styles.hint}>A sentence or two is enough</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setIsResponding(false); setResponseText(''); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (responseText.length < 10 || submitResponse.isPending) && styles.disabled]}
                onPress={handleSubmit}
                disabled={responseText.length < 10 || submitResponse.isPending}
              >
                <Text style={styles.submitText}>
                  {submitResponse.isPending ? 'Sending...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Waiting for partner
  if (mode === 'waiting') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Today</Text>
              <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
            </View>
            <PartnerStatus
              isOnline={isPartnerOnline}
              isTyping={isPartnerTyping}
              typingContext={partnerTypingContext}
              lastSeen={partnerLastSeen}
              partnerName={partnerName}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.promptTextSmall}>"{assignment!.promptText}"</Text>

            <View style={styles.yourResponse}>
              <Text style={styles.responseLabel}>Your response</Text>
              <Text style={styles.responseText}>{myResponse!.responseText}</Text>
            </View>

            {isPartnerTyping && partnerTypingContext === 'prompt' ? (
              <Text style={styles.partnerTyping}>{partnerName} is responding...</Text>
            ) : (
              <Text style={styles.waiting}>Waiting for {partnerName.toLowerCase()}...</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Completed
  if (mode === 'complete') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Today</Text>
              <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
            </View>
            <PartnerStatus
              isOnline={isPartnerOnline}
              isTyping={isPartnerTyping}
              typingContext={partnerTypingContext}
              lastSeen={partnerLastSeen}
              partnerName={partnerName}
            />
          </View>

          <View style={styles.completionCard}>
            <CompletionMoment
              promptText={assignment!.promptText}
              yourResponse={myResponse!.responseText}
              partnerResponse={partnerResponse?.responseText || ''}
              partnerName={partnerName}
            />
          </View>

          {/* Emotional Feedback */}
          {myResponse && !feedbackGiven && (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>How did this feel?</Text>
              <View style={styles.feedbackRow}>
                {([
                  { value: 'positive', label: 'Good' },
                  { value: 'neutral', label: 'Okay' },
                  { value: 'negative', label: 'Not great' },
                ] as const).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.feedbackOption}
                    onPress={() => {
                      submitFeedback.mutate({
                        responseId: myResponse.id,
                        emotionalResponse: option.value,
                      });
                      setFeedbackGiven(true);
                    }}
                    disabled={submitFeedback.isPending}
                  >
                    <Text style={styles.feedbackOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {feedbackGiven && (
            <Text style={styles.feedbackThanks}>Thanks for sharing.</Text>
          )}

          <Text style={styles.doneText}>All done. See you tomorrow.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Default: Show prompt (mode === 'prompt')
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          <PartnerStatus
            isOnline={isPartnerOnline}
            isTyping={isPartnerTyping}
            typingContext={partnerTypingContext}
            lastSeen={partnerLastSeen}
            partnerName={partnerName}
          />
        </View>

        <View style={styles.promptContainer}>
          <PromptCard
            promptText={assignment!.promptText}
            promptHint={assignment!.promptHint}
            promptType={assignment!.promptType}
            onRespond={handleRespond}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  date: {
    fontSize: 16,
    color: '#78716c',
    marginTop: 4,
  },
  promptContainer: {
    marginTop: 32,
  },
  respondingContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  promptTextSmall: {
    fontSize: 16,
    color: '#57534e',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1c1917',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    maxHeight: 200,
  },
  hint: {
    color: '#78716c',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 32,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
  },
  cancelText: {
    color: '#57534e',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#c97454',
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  card: {
    marginTop: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f5f5f4',
  },
  yourResponse: {
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  responseLabel: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '500',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 16,
    color: '#292524',
  },
  waiting: {
    color: '#78716c',
    textAlign: 'center',
  },
  partnerTyping: {
    color: '#c97454',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  completionCard: {
    marginTop: 32,
  },
  doneText: {
    color: '#78716c',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 48,
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    color: '#a8a29e',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#57534e',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  feedbackCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f5f5f4',
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#57534e',
    marginBottom: 16,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fafaf9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  feedbackOptionText: {
    fontSize: 14,
    color: '#57534e',
    fontWeight: '500',
  },
  feedbackThanks: {
    marginTop: 16,
    fontSize: 14,
    color: '#a8a29e',
    textAlign: 'center',
  },
  triggerButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#c97454',
    borderRadius: 12,
  },
  triggerButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
