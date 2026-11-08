import React, { useRef, useState, useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.24;

export interface MobileOnboardingSlide {
  id: string;
  step: string;
  badge: string;
  accentColor: string;
  title: string;
  subtitle: string;
  metrics: { label: string; value: string }[];
  highlights: string[];
  icon: keyof typeof Ionicons.glyphMap;
}

export const MOBILE_ONBOARDING_SLIDES: MobileOnboardingSlide[] = [
  {
    id: 'biometric-enclave',
    step: '01 / 06',
    badge: 'DUAL-BIOMETRIC HARDWARE VAULT',
    accentColor: '#FF4500',
    title: 'Your Face & Fingerprint Hold Your Wallet',
    subtitle:
      'Zero seed phrases to write down or lose. StylusSafe binds an OpenBR 64-D craniofacial geometry vector and your hardware Secure Enclave secp256r1 passkey directly to your smart account.',
    metrics: [
      { label: 'Face Engine', value: 'OpenBR 64-D + 468-Pt Mesh' },
      { label: 'Hardware Curve', value: 'NIST P-256 (secp256r1)' },
    ],
    highlights: [
      'Active liveness challenge blocks photo & deepfake spoofing',
      'Hardware CryptoObject signs ERC-4337 UserOps inside TEE',
      'Instant wallet recovery across sessions via Face + Fingerprint',
    ],
    icon: 'finger-print-outline',
  },
  {
    id: 'stylus-wasm',
    step: '02 / 06',
    badge: 'ARBITRUM STYLUS + RIP-7212',
    accentColor: '#10B981',
    title: '98.9% Gas Reduction via Rust WASM',
    subtitle:
      'Verifying P-256 biometric signatures in traditional Solidity costs ~320,000 gas. StylusSafe routes verification through Arbitrum native precompile 0x0100 and Rust WASM in ~3,450 gas.',
    metrics: [
      { label: 'RIP-7212 Precompile', value: '~3,450 Gas (0x0100)' },
      { label: 'WASM Policy Check', value: '~1,400 Gas (Sub-Second)' },
    ],
    highlights: [
      'Native secp256r1 signature verification at address 0x0100',
      'Compiled Rust WASM smart contract execution on Arbitrum Sepolia',
      'ERC-4337 Paymaster sponsors 100% of user transaction gas ($0.00)',
    ],
    icon: 'hardware-chip-outline',
  },
  {
    id: 'agent-firewall',
    step: '03 / 06',
    badge: 'DETERMINISTIC AGENT FIREWALL',
    accentColor: '#12AAFF',
    title: 'Prompt-Injection Proof AI Guardrails',
    subtitle:
      'Delegate execution to autonomous AI agents without surrendering custody. Every agent transaction is checked against immutable on-chain spending caps and contract allowlists.',
    metrics: [
      { label: 'Rolling 24h Cap', value: '$500.00 USDG Max' },
      { label: 'Panic Revocation', value: '1-Block Biometric Killswitch' },
    ],
    highlights: [
      'Adversarial prompt injections revert deterministically ($0 lost)',
      'Strict target contract allowlists (Uniswap V3, Aave V3)',
      'Time-bounded ephemeral session keys that auto-expire',
    ],
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'paxos-usdg',
    step: '04 / 06',
    badge: 'PAXOS GLOBAL DOLLAR NETWORK',
    accentColor: '#F59E0B',
    title: 'Self-Funding Treasury Powered by USDG',
    subtitle:
      'Standardized on Paxos USDG (Global Dollar Network). Every newly enrolled biometric wallet is automatically funded with 1,000.00 real Arbitrum Sepolia Testnet USDG.',
    metrics: [
      { label: 'Auto-Faucet Grant', value: '1,000.00 Testnet USDG' },
      { label: 'Reserve Standard', value: '1:1 US T-Bills & Cash' },
    ],
    highlights: [
      'Real ERC-20 USDG minted on Arbitrum Sepolia (0xDa4D...BD36)',
      'Global Dollar Network reserve yield offsets Paymaster gas',
      'Automated recurring DCA & subscription streams',
    ],
    icon: 'wallet-outline',
  },
  {
    id: 'cross-chain-intents',
    step: '05 / 06',
    badge: 'UNIVERSAL CROSS-CHAIN INTENTS',
    accentColor: '#A855F7',
    title: 'Atomic Multi-Call & Cross-Chain Settlement',
    subtitle:
      'Bundle token approvals, liquidity routing, and cross-chain transfers across Arbitrum, Base, Optimism, Polygon, and Ethereum into a single biometric UserOperation.',
    metrics: [
      { label: 'Settlement Latency', value: '~3.2 Seconds Atomic' },
      { label: 'Supported Chains', value: 'Arbitrum, Base, OP, Polygon' },
    ],
    highlights: [
      'Batch multi-step DeFi workflows into 1 biometric signature',
      'Zero fragmented gas tokens needed across destination L2s',
      'Full cryptographic audit trail for human & agent operations',
    ],
    icon: 'layers-outline',
  },
  {
    id: 'launch-ready',
    step: '06 / 06',
    badge: 'READY FOR LAUNCH',
    accentColor: '#10B981',
    title: 'Initialize Your Biometric Vault Now',
    subtitle:
      'You have completed the StylusSafe architecture walkthrough. Enroll your FaceID / OpenBR 64-D template and hardware passkey now to claim 1,000.00 Testnet USDG.',
    metrics: [
      { label: 'Setup Time', value: '< 15 Seconds' },
      { label: 'Initial Balance', value: '1,000.00 USDG (Auto-Funded)' },
    ],
    highlights: [
      'Step 1: Enroll OpenBR 64-D Face Template & Liveness Check',
      'Step 2: Bind Hardware Fingerprint / FaceID secp256r1 Key',
      'Step 3: Receive 1,000.00 Testnet USDG & configure Guardrails',
    ],
    icon: 'key-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;

  const totalSlides = MOBILE_ONBOARDING_SLIDES.length;

  const advanceSlide = useCallback(
    (direction: 'left' | 'right') => {
      const targetX = direction === 'right' ? width * 1.25 : -width * 1.25;
      Animated.timing(pan, {
        toValue: { x: targetX, y: 20 },
        duration: 210,
        useNativeDriver: true,
      }).start(() => {
        pan.setValue({ x: 0, y: 0 });
        setActiveIndex((prev) => (prev + 1) % totalSlides);
      });
    },
    [pan, totalSlides]
  );

  const goPrevSlide = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [pan, totalSlides]);

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

  // Tinder-style 3D card rotation & stamp opacities
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

  // Next card scale & vertical offset as top card is dragged
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

  const visibleStack = [0, 1, 2].map((offset) => {
    const idx = (activeIndex + offset) % totalSlides;
    return {
      slide: MOBILE_ONBOARDING_SLIDES[idx],
      idx,
      stackIndex: offset,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar: Brand + Segmented Progress + Skip */}
      <View style={styles.topHeader}>
        <View style={styles.topRow}>
          <View style={styles.deckBadge}>
            <Text style={styles.deckBadgeText}>SWIPE ONBOARDING</Text>
          </View>
          <Text style={styles.stepCounterText}>
            Slide {activeIndex + 1} of {totalSlides}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/portfolio' as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>Enter Vault →</Text>
          </TouchableOpacity>
        </View>

        {/* 6-Segment Story Progress Bar */}
        <View style={styles.progressGrid}>
          {MOBILE_ONBOARDING_SLIDES.map((s, idx) => {
            const isCurrent = idx === activeIndex;
            const isCompleted = idx < activeIndex;
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.progressTrack}
                onPress={() => setActiveIndex(idx)}
                activeOpacity={0.8}
              >
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
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Stacked Tinder-Swiper Card Stage */}
      <View style={styles.deckStage}>
        {visibleStack
          .slice()
          .reverse()
          .map(({ slide, idx, stackIndex }) => {
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
                    transform: [{ scale: 0.89 }, { translateY: 28 }],
                    opacity: 0.38,
                    zIndex: 10,
                  };

            return (
              <Animated.View
                key={`${slide.id}-${idx}-${stackIndex}`}
                {...(isTop ? panResponder.panHandlers : {})}
                style={[
                  styles.swipeCard,
                  {
                    borderColor: isTop ? slide.accentColor + '66' : Colors.border,
                  },
                  animatedCardStyle,
                ]}
              >
                {/* Tinder-Style Swipe Stamps on Top Card */}
                {isTop && (
                  <>
                    <Animated.View
                      style={[
                        styles.stampBadge,
                        styles.rightStamp,
                        { opacity: rightStampOpacity },
                      ]}
                    >
                      <Text style={styles.rightStampText}>NEXT SLIDE →</Text>
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.stampBadge,
                        styles.leftStamp,
                        { opacity: leftStampOpacity },
                      ]}
                    >
                      <Text style={styles.leftStampText}>← SWIPE CARD</Text>
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
                      <Ionicons name={slide.icon} size={26} color={slide.accentColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{slide.title}</Text>
                      <Text style={styles.cardSubtitle}>{slide.subtitle}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Body: Telemetry Metrics & Checklist */}
                <View style={styles.cardBody}>
                  <View style={styles.metricsRow}>
                    {slide.metrics.map((m) => (
                      <View key={m.label} style={styles.metricBox}>
                        <Text style={styles.metricLabel}>{m.label}</Text>
                        <Text style={styles.metricValue} numberOfLines={1}>
                          {m.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.highlightsList}>
                    {slide.highlights.map((item) => (
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

                  <View style={styles.cardFooterHint}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.swipeHintText}>
                      Swipe card left or right to cycle onboarding deck
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
      </View>

      {/* Bottom Tinder-Style Action Controls */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={styles.secondaryActionBtn}
          activeOpacity={0.8}
          onPress={goPrevSlide}
        >
          <Ionicons name="arrow-back" size={16} color={Colors.textPrimary} />
          <Text style={styles.secondaryActionText}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.swipeActionBtn}
          activeOpacity={0.8}
          onPress={() => advanceSlide('right')}
        >
          <Text style={styles.swipeActionText}>Swipe Next</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryVaultBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/portfolio' as any)}
        >
          <Text style={styles.primaryVaultText}>Enter Vault</Text>
          <Ionicons name="finger-print-outline" size={16} color="#FFFFFF" />
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
  stepCounterText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: monoFont,
  },
  skipText: {
    color: Colors.textPrimary,
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
    maxWidth: 520,
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
    top: 16,
    zIndex: 40,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 2,
  },
  rightStamp: {
    right: 16,
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
    left: 16,
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
    letterSpacing: 0.7,
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
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: '#09090B',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  cardSubtitle: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  cardBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#09090B',
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: monoFont,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: monoFont,
    marginTop: 3,
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
    color: '#D4D4D8',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  cardFooterHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  swipeActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  swipeActionText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: monoFont,
  },
  primaryVaultBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryVaultText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
