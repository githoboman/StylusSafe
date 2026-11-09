import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.22;
const MOBILE_ONBOARDING_KEY = 'stylussafe_mobile_onboarding_done_v2';

export interface MobileOnboardingSlide {
  id: string;
  step: string;
  title: string;
  simpleExplanation: string;
  howToSteps: string[];
  techLine: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const MOBILE_ONBOARDING_SLIDES: MobileOnboardingSlide[] = [
  {
    id: 'biometric-key',
    step: 'Step 1 of 5',
    title: 'Your Face & Fingerprint Are Your Key',
    simpleExplanation:
      'Forget writing down 12 secret words on paper. Unlock and recover your wallet anytime using your camera and fingerprint sensor — just like unlocking your phone.',
    howToSteps: [
      'Quick 3-second live camera & fingerprint check',
      'Your device hardware locks your vault on Arbitrum',
    ],
    techLine: 'OpenBR 64-D Vector · Hardware secp256r1',
    icon: 'finger-print-outline',
  },
  {
    id: 'free-usdg',
    step: 'Step 2 of 5',
    title: 'Start with $1,000 in Digital Dollars',
    simpleExplanation:
      'As soon as you unlock your wallet, we automatically fund it with $1,000.00 in test USDG so you can try sending and saving right away.',
    howToSteps: [
      'Tap "Create New Wallet" inside your Vault screen',
      '$1,000.00 USDG arrives automatically on Arbitrum Sepolia',
    ],
    techLine: 'Paxos USDG (0xDa4D...BD36) · Auto-Faucet Mint',
    icon: 'wallet-outline',
  },
  {
    id: 'ai-allowance',
    step: 'Step 3 of 5',
    title: 'Safe Daily Allowances for AI Helpers',
    simpleExplanation:
      'Never give an AI helper your master key. Set a strict daily spending limit (like $500/day). Anything above your limit is automatically blocked.',
    howToSteps: [
      'Choose a daily spending limit and approved apps',
      'Turn off the AI helper key anytime in one tap',
    ],
    techLine: 'Arbitrum Stylus Rust WASM · Scoped Session Keys',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'zero-gas',
    step: 'Step 4 of 5',
    title: 'Send Money in One Tap with $0 Fees',
    simpleExplanation:
      'You never need to buy extra gas tokens just to send money. StylusSafe covers the network fee for you and settles in seconds.',
    howToSteps: [
      'Enter the amount of USDG you want to send',
      'Approve with one fingerprint or face scan ($0 fee)',
    ],
    techLine: 'Native RIP-7212 (0x0100) ~3,450 Gas · Paymaster',
    icon: 'hardware-chip-outline',
  },
  {
    id: 'ready-to-start',
    step: 'Step 5 of 5',
    title: 'You Are Ready to Open Your Vault',
    simpleExplanation:
      'Swipe this final card away or tap "Start Using Wallet" below. This guide will disappear so you can go straight to your wallet.',
    howToSteps: [
      'Create or unlock your wallet with your face & fingerprint',
      'Send test USDG or set your AI spending limits',
    ],
    techLine: 'CREATE2 Smart Account · Arbitrum Sepolia Live',
    icon: 'key-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [checkingStorage, setCheckingStorage] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current;

  const totalSlides = MOBILE_ONBOARDING_SLIDES.length;

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem(MOBILE_ONBOARDING_KEY);
        if (done === 'true') {
          router.replace('/portfolio' as any);
          return;
        }
      } catch {
        // ignore
      }
      setCheckingStorage(false);
    })();
  }, [router]);

  const finishOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(MOBILE_ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/portfolio' as any);
  }, [router]);

  const advanceSlide = useCallback(
    (direction: 'left' | 'right') => {
      const targetX = direction === 'right' ? width * 1.25 : -width * 1.25;
      Animated.timing(pan, {
        toValue: { x: targetX, y: 20 },
        duration: 210,
        useNativeDriver: true,
      }).start(() => {
        pan.setValue({ x: 0, y: 0 });
        if (activeIndex >= totalSlides - 1) {
          finishOnboarding();
        } else {
          setActiveIndex((prev) => prev + 1);
        }
      });
    },
    [activeIndex, finishOnboarding, pan, totalSlides]
  );

  const goPrevSlide = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, [pan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.65) {
            advanceSlide('right');
          } else if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -0.65) {
            advanceSlide('left');
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 6,
              tension: 70,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [advanceSlide, pan]
  );

  if (checkingStorage) {
    return <SafeAreaView style={styles.container} />;
  }

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const nextCardScale = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  const nextCardTranslateY = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0, 14, 0],
    extrapolate: 'clamp',
  });

  const remainingSlides = MOBILE_ONBOARDING_SLIDES.slice(activeIndex, activeIndex + 3);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topHeader}>
        <View style={styles.topRow}>
          <Text style={styles.welcomeLabel}>WELCOME GUIDE</Text>
          <TouchableOpacity
            onPress={finishOnboarding}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>Skip Guide ✕</Text>
          </TouchableOpacity>
        </View>

        {/* 5-Segment Progress Bar */}
        <View style={styles.progressGrid}>
          {MOBILE_ONBOARDING_SLIDES.map((s, idx) => {
            const isActiveOrDone = idx <= activeIndex;
            return (
              <View key={s.id} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: isActiveOrDone ? '100%' : '0%',
                      backgroundColor: isActiveOrDone ? Colors.accentOrange : 'transparent',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Stacked Tinder-Swiper Card Stage */}
      <View style={styles.deckStage}>
        {remainingSlides
          .slice()
          .reverse()
          .map((slide) => {
            const slideIdx = MOBILE_ONBOARDING_SLIDES.findIndex((s) => s.id === slide.id);
            const stackIndex = slideIdx - activeIndex;
            const isTop = stackIndex === 0;
            const isSecond = stackIndex === 1;

            const animatedCardStyle = isTop
              ? {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { rotate },
                  ],
                  zIndex: 30,
                }
              : isSecond
                ? {
                    transform: [
                      { scale: nextCardScale },
                      { translateY: nextCardTranslateY },
                    ],
                    opacity: 0.65,
                    zIndex: 20,
                  }
                : {
                    transform: [{ scale: 0.9 }, { translateY: 26 }],
                    opacity: 0.3,
                    zIndex: 10,
                  };

            return (
              <Animated.View
                key={slide.id}
                {...(isTop ? panResponder.panHandlers : {})}
                style={[
                  styles.swipeCard,
                  {
                    borderColor: isTop ? 'rgba(255,255,255,0.14)' : Colors.border,
                  },
                  animatedCardStyle,
                ]}
              >
                {/* Top Icon & Step */}
                <View style={styles.cardTopRow}>
                  <View style={styles.iconBox}>
                    <Ionicons name={slide.icon} size={26} color={Colors.accentOrange} />
                  </View>
                  <View style={styles.stepPill}>
                    <Text style={styles.stepPillText}>{slide.step}</Text>
                  </View>
                </View>

                {/* Main Title & Explanation */}
                <View style={styles.mainCopyBlock}>
                  <Text style={styles.cardTitle}>{slide.title}</Text>
                  <Text style={styles.cardSubtitle}>{slide.simpleExplanation}</Text>
                </View>

                {/* Simple Bullet Steps */}
                <View style={styles.highlightsList}>
                  {slide.howToSteps.map((item) => (
                    <View key={item} style={styles.highlightRow}>
                      <Ionicons
                        name="checkmark-outline"
                        size={17}
                        color={Colors.accentOrange}
                        style={{ marginTop: 2 }}
                      />
                      <Text style={styles.highlightText}>{item}</Text>
                    </View>
                  ))}
                </View>

                {/* Clean Footer */}
                <View style={styles.cardFooterRow}>
                  <Text style={styles.techFooterText} numberOfLines={1}>
                    {slide.techLine}
                  </Text>
                  <Text style={styles.swipeHintText}>Swipe →</Text>
                </View>
              </Animated.View>
            );
          })}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={[styles.secondaryActionBtn, activeIndex === 0 && { opacity: 0.35 }]}
          activeOpacity={0.8}
          disabled={activeIndex === 0}
          onPress={goPrevSlide}
        >
          <Ionicons name="arrow-back" size={16} color={Colors.textPrimary} />
          <Text style={styles.secondaryActionText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryVaultBtn}
          activeOpacity={0.85}
          onPress={() => advanceSlide('right')}
        >
          <Text style={styles.primaryVaultText}>
            {activeIndex === totalSlides - 1 ? 'Start Using Wallet' : 'Next Card'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const monoFont = Platform.OS === 'ios' ? 'ui-monospace' : 'monospace';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundInk,
  },
  topHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: monoFont,
    letterSpacing: 1,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: monoFont,
  },
  progressGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  deckStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  swipeCard: {
    position: 'absolute',
    width: width - Spacing.lg * 2,
    maxWidth: 480,
    backgroundColor: '#141418',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 26,
    gap: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepPillText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: monoFont,
  },
  mainCopyBlock: {
    gap: 10,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  cardSubtitle: {
    color: '#D4D4D8',
    fontSize: 15,
    lineHeight: 23,
  },
  highlightsList: {
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  highlightText: {
    color: '#E4E4E7',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  techFooterText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: monoFont,
    flex: 1,
  },
  swipeHintText: {
    color: '#D4D4D8',
    fontSize: 12,
    fontFamily: monoFont,
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  secondaryActionBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryActionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryVaultBtn: {
    flex: 1,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryVaultText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
