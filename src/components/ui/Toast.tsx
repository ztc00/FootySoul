import { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';

export type ToastVariant = 'success' | 'error';

/**
 * Lightweight inline toast — no context required.
 *
 * Usage:
 *   const { showToast, Toast } = useToast();
 *   // Inside JSX: <Toast />
 *   // To trigger: showToast('Message!') or showToast('Oops', 'error')
 */
export function useToast() {
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<ToastVariant>('success');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (msg: string, v: ToastVariant = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setVariant(v);
    setVisible(true);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() =>
        setVisible(false)
      );
    }, 2600);
  };

  function Toast() {
    if (!visible) return null;
    return (
      <Animated.View
        style={[styles.toast, variant === 'error' && styles.toastError, { opacity }]}
        pointerEvents="none"
      >
        <Ionicons
          name={variant === 'success' ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={colors.white}
        />
        <Text style={styles.toastText}>{message}</Text>
      </Animated.View>
    );
  }

  return { showToast, Toast };
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 110,
    left: spacing[4],
    right: spacing[4],
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastError: {
    backgroundColor: colors.danger,
  },
  toastText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.white,
    flex: 1,
  },
});
