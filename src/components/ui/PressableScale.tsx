import React, { useRef } from 'react';
import { Pressable, Animated } from 'react-native';

const SCALE = 0.98;

type PressableScaleProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
};

export function PressableScale({ children, onPress, style, disabled }: PressableScaleProps) {
  const anim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(anim, { toValue: SCALE, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale: anim }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
