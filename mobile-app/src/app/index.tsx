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
const SWIPE_THRESHOLD = width * 0.24;
const MOBILE_ONBOARDING_KEY = 'stylussafe_mobile_onboarding_done_v2';

export interface MobileOnboardingSlide {
  id: string;
  step: string;
  badge: string;
  accentColor: string;
  title: string;
  simpleExplanation: string;
  howToSteps: string[];
  techProofSpec: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const MOBILE_ONBOARDING_SLIDES: MobileOnboardingSlide[] = [
  {
    id: 'biometric-key',
    step: '1 of 5',
    badge: 'STEP 1 • NO SECRET WORDS TO LOSE',
    accentColor: '#FF4500',
    title: 'Your Face & Fingerprint Are Your Wallet Key',
    simpleExplanation:
      'Old crypto wallets force you to write down 12 secret words on paper. Lose that paper, and your money is gone forever. Here, your face and fingerprint unlock your wallet — just like unlocking your phone.',
    howToSteps: [
      'Look at your camera for a quick 3-second live face check',
      'Touch your fingerprint or FaceID sensor to lock in your account',
      'Come back anytime — your face & fingerprint bring your wallet right back',
    ],
    techProofSpec:
      'OpenBR 64-D Face Vector + 468-Pt Liveness + Hardware secp256r1 Passkey',
    icon: 'finger-print-outline',
  },
  {
    id: 'free-usdg',
    step: '2 of 5',
    badge: 'STEP 2 • FREE $1,000 TEST DOLLARS',
    accentColor: '#10B981',
    title: 'Start with $1,000 in Digital Dollars',
    simpleExplanation:
      'As soon as you unlock your wallet, we automatically load it with $1,000.00 in USDG test dollars so you can try sending, saving, and testing right away.',
    howToSteps: [
      'Tap "Create New Wallet" inside your Vault screen',
      'Watch $1,000.00 USDG appear in your balance automatically',
      'Backed by Paxos Global Dollar Network on Arbitrum Sepolia',
    ],
    techProofSpec:
      'Real ERC-20 Paxos USDG (0xDa4D...BD36) · 6 Decimals · Auto-Faucet Mint',
    icon: 'wallet-outline',
  },
  {
    id: 'ai-allowance',
    step: '3 of 5',
    badge: 'STEP 3 • SAFE AI ALLOWANCE RULES',
    accentColor: '#12AAFF',
    title: 'Give AI Helpers a Safe Daily Allowance',
    simpleExplanation:
      'Want an AI robot to trade or pay bills for you? Never give it your master key! Give the AI a strict daily allowance (like $500/day). If the AI gets tricked into spending $501, the vault blocks it automatically.',
    howToSteps: [
      'Set a daily spending cap (e.g., $500/day) in the AI Firewall tab',
      'Pick which safe apps the AI is allowed to use (like Uniswap)',
      'Tap the red "Panic Revoke" button anytime to turn off the AI in 1 second',
    ],
    techProofSpec:
      'Arbitrum Stylus Rust WASM On-Chain Firewall + Scoped Ephemeral Session Keys',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'zero-gas',
    step: '4 of 5',
    badge: 'STEP 4 • FAST & FREE TO SEND',
    accentColor: '#F59E0B',
    title: 'Send Money in 1 Tap with $0 Gas Fees',
    simpleExplanation:
      'Normally, blockchains make you buy special "gas tokens" just to pay for every click. StylusSafe pays the network fee for you, using super-fast Arbitrum math that cuts costs by 99%.',
    howToSteps: [
      'Enter how much USDG you want to send or swap',
      'Approve with 1 fingerprint or face scan',
      'Settles in ~3 seconds with $0.00 gas fee charged to you',
    ],
    techProofSpec:
      'Native RIP-7212 Precompile (0x0100) ~3,450 Gas + ERC-4337 Sponsored Paymaster',
    icon: 'hardware-chip-outline',
  },
  {
    id: 'ready-to-start',
    step: '5 of 5',
    badge: 'FINAL STEP • YOU ARE READY',
    accentColor: '#10B981',
    title: 'Swipe This Card to Open Your Wallet!',
    simpleExplanation:
      'You now know how StylusSafe works! Swipe this final card away or tap "Start Using Wallet" below — this guide will disappear and open your wallet.',
    howToSteps: [
      '1. Tap "Create Wallet" to scan your face & fingerprint',
      '2. Receive your automatic $1,000.00 USDG test balance',
      '3. Try sending funds or testing the AI Allowance Shield',
    ],
    techProofSpec:
      'CREATE2 Smart Account (0xd364...33f7) · 15/15 Invariant Tests Passing on Arbitrum Sepolia',
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
    outputRange: ['-14deg', '0deg', '14deg'],
    extrapolate: 'clamp',
  });

  const rightStampOpacity = pan.x.interpolate({
    inputRange: [20, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftStampOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20],
    outputRange: [1, 0],
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
          <View style={styles.deckBadge}>
            <Text style={styles.deckBadgeText}>QUICK WALLET GUIDE</Text>
          </View>
          <TouchableOpacity
            onPress={finishOnboarding}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>Skip Guide [✕]</Text>
          </TouchableOpacity>
        </View>

        {/* 5-Segment Progress Bar */}
        <View style={styles.progressGrid}>
          {MOBILE_ONBOARDING_SLIDES.map((s, idx) => {
            const isCurrent = idx === activeIndex;
            const isCompleted = idx < activeIndex;
            return (
              <View key={s.id} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: isCurrent || isCompleted ? '100%' : '0%',
                      backgroundColor: isCurrent
                        ? Colors.accentOrange
                        : isCompleted
                          ? '#10B981'
                          : 'transparent',
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
                    opacity: 0.72,
                    zIndex: 20,
                  }
                : {
                    transform: [{ scale: 0.89 }, { translateY: 26 }],
                    opacity: 0.35,
                    zIndex: 10,
                  };

            return (
              <Animated.View
                key={slide.id}
                {...(isTop ? panResponder.panHandlers : {})}
                style={[
                  styles.swipeCard,
                  {
                    borderColor: isTop ? slide.accentColor + '66' : Colors.border,
                  },
                  animatedCardStyle,
                ]}
              >
                {isTop && (
                  <>
                    <Animated.View
                      style={[
                        styles.stampBadge,
                        styles.rightStamp,
                        { opacity: rightStampOpacity },
                      ]}
                    >
                      <Text style={styles.rightStampText}>GOT IT →</Text>
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.stampBadge,
                        styles.leftStamp,
                        { opacity: leftStampOpacity },
                      ]}
                    >
                      <Text style={styles.leftStampText}>← NEXT</Text>
                    </Animated.View>
                  </>
                )}

                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.slideBadgePill,
                        { borderColor: slide.accentColor + '50' },
                      ]}
                    >
                      <Text style={[styles.slideBadgeText, { color: slide.accentColor }]}>
                        {slide.badge}
                      </Text>
                    </View>
                    <Text style={styles.slideStepMono}>{slide.step}</Text>
                  </View>

                  <View style={styles.titleRow}>
                    <View
                      style={[
                        styles.iconBox,
                        { borderColor: slide.accentColor + '40' },
                      ]}
                    >
                      <Ionicons name={slide.icon} size={24} color={slide.accentColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{slide.title}</Text>
                      <Text style={styles.cardSubtitle}>{slide.simpleExplanation}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  <View style={styles.highlightsList}>
                    {slide.howToSteps.map((item) => (
                      <View key={item} style={styles.highlightRow}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={16}
                          color={slide.accentColor}
                          style={{ marginTop: 1 }}
                        />
                        <Text style={styles.highlightText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.techProofBox}>
                    <Text style={styles.techProofLabel}>
                      UNDER THE HOOD (TECHNICAL PROOF)
                    </Text>
                    <Text style={styles.techProofValue}>{slide.techProofSpec}</Text>
                  </View>

                  <View style={styles.cardFooterHint}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.swipeHintText}>
                      Swipe card left or right to continue
                    </Text>
                  </View>
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
            {activeIndex === totalSlides - 1 ? 'Start Using Wallet' : 'Swipe Next Card'}
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
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckBadge: {
    backgroundColor: Colors.accentOrange + '20',
    borderColor: Colors.accentOrange + '50',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  deckBadgeText: {
    color: Colors.accentOrange,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: monoFont,
    letterSpacing: 0.8,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: monoFont,
  },
  progressGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    paddingHorizontal: Spacing.md,
    position: 'relative',
  },
  swipeCard: {
    position: 'absolute',
    width: width - Spacing.md * 2,
    maxWidth: 500,
    backgroundColor: '#121216',
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 14,
  },
  stampBadge: {
    position: 'absolute',
    top: 14,
    zIndex: 40,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 2,
  },
  rightStamp: {
    right: 14,
    borderColor: '#10B981',
    backgroundColor: 'rgba(6, 78, 59, 0.92)',
    transform: [{ rotate: '-6deg' }],
  },
  rightStampText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: monoFont,
    letterSpacing: 1,
  },
  leftStamp: {
    left: 14,
    borderColor: '#FF4500',
    backgroundColor: 'rgba(67, 20, 7, 0.92)',
    transform: [{ rotate: '6deg' }],
  },
  leftStampText: {
    color: '#FF4500',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: monoFont,
    letterSpacing: 1,
  },
  cardHeader: {
    padding: Spacing.lg,
    backgroundColor: '#16161C',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slideBadgePill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  slideBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: monoFont,
    letterSpacing: 0.6,
  },
  slideStepMono: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: monoFont,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: '#09090B',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  cardSubtitle: {
    color: '#D4D4D8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  cardBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  highlightsList: {
    gap: 8,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  highlightText: {
    color: '#E4E4E7',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  techProofBox: {
    backgroundColor: '#09090B',
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 3,
  },
  techProofLabel: {
    color: Colors.accentOrange,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: monoFont,
    letterSpacing: 0.7,
  },
  techProofValue: {
    color: '#A1A1AA',
    fontSize: 11,
    fontFamily: monoFont,
    lineHeight: 16,
  },
  cardFooterHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.xs,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: Colors.accentOrange,
  },
  swipeHintText: {
    color: Colors.textMuted,
    fontSize: 11,
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
    height: 46,
    paddingHorizontal: 14,
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
    fontSize: 13,
    fontFamily: monoFont,
  },
  primaryVaultBtn: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryVaultText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
