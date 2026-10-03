import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Make Blockchains Invisible',
    description: 'The ultimate Intent-Based Smart Wallet. Execute 1-click cross-chain swaps without ever holding gas tokens.',
    icon: 'planet',
  },
  {
    id: '2',
    title: 'Seedless Onboarding',
    description: 'Powered by WebAuthn passkeys. Create a secure, non-custodial wallet instantly using FaceID or TouchID. No 24-word phrases to lose.',
    icon: 'finger-print',
  },
  {
    id: '3',
    title: '1-Click Cross-Chain',
    description: 'Integrated deeply with Li.Fi. Declare your intent to turn Arbitrum USDC into a Base token. We handle the bridging and swapping atomically.',
    icon: 'swap-horizontal',
  },
  {
    id: '4',
    title: 'Zero Gas Fees',
    description: 'Never worry about holding ETH on a new chain. Our ZeroDev ERC-4337 Paymaster sponsors your gas fees transparently across all EVM rollups.',
    icon: 'flash',
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/(tabs)/portfolio');
    }
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
          <View style={styles.iconRing} />
          <View style={styles.iconRingInner} />
          <Ionicons name={item.icon as any} size={80} color={Colors.accentOrange} style={styles.icon} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity 
        style={styles.skipButton} 
        onPress={() => router.replace('/(tabs)/portfolio')}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={32}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />

      {/* Bottom Paginator & CTA */}
      <View style={styles.bottomContainer}>
        <View style={styles.paginator}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            const backgroundColor = scrollX.interpolate({
              inputRange,
              outputRange: [Colors.textMuted, Colors.accentOrange, Colors.textMuted],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View 
                key={i.toString()} 
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor }]} 
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8} onPress={scrollToNext}>
          <Text style={styles.ctaText}>
            {currentIndex === SLIDES.length - 1 ? 'Launch App' : 'Next'}
          </Text>
          {currentIndex === SLIDES.length - 1 && (
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundInk,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.accentOrange,
    opacity: 0.2,
  },
  iconRingInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: Colors.accentOrange,
    opacity: 0.4,
  },
  icon: {
    shadowColor: Colors.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
  },
  paginator: {
    flexDirection: 'row',
    height: 10,
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  ctaButton: {
    backgroundColor: Colors.accentOrange,
    height: 56,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
