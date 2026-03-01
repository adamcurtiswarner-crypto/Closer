import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';

interface SwipeAction {
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
  onSwipeOpen?: () => void;
}

export function SwipeableRow({
  children,
  rightActions = [],
  leftActions = [],
  onSwipeOpen,
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleAction = (action: SwipeAction) => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    action.onPress();
  };

  const renderRightActions = () => {
    if (rightActions.length === 0) return null;
    return (
      <View style={styles.actionsContainer}>
        {rightActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.action, { backgroundColor: action.color }]}
            onPress={() => handleAction(action)}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderLeftActions = () => {
    if (leftActions.length === 0) return null;
    return (
      <View style={styles.actionsContainer}>
        {leftActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.action, { backgroundColor: action.color }]}
            onPress={() => handleAction(action)}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={rightActions.length > 0 ? renderRightActions : undefined}
      renderLeftActions={leftActions.length > 0 ? renderLeftActions : undefined}
      onSwipeableOpen={() => {
        hapticImpact();
        onSwipeOpen?.();
      }}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
  },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
