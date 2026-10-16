import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, radius, spacing, TAP_TARGET } from '@/theme';

/** How long each scene stays up before moving on by itself (until the person taps Back or Next). */
const SCENE_MS = 6500;
const native = Platform.OS !== 'web';

type Scene = { title: string; text: string; Stage: (p: { still: boolean }) => ReactNode };

const SCENES: Scene[] = [
  {
    title: 'Welcome to EasyHand!',
    text: 'Neighbors in Memphis helping each other with everyday jobs.',
    Stage: NeighborsStage,
  },
  {
    title: 'Ask for help, or offer it',
    text: 'Post what you need, like mowing the lawn or setting up a phone. Or share a skill you have.',
    Stage: ListingStage,
  },
  {
    title: 'A neighbor sends a message',
    text: 'Someone nearby who can help writes to you right here in EasyHand.',
    Stage: ChatStage,
  },
  {
    title: 'Agree on a time and price',
    text: 'You decide together. You pay each other directly, however you like.',
    Stage: DealStage,
  },
  {
    title: 'Job done. Everyone smiles!',
    text: "That's all there is to it. Joining is free, or look around at open jobs first.",
    Stage: HappyStage,
  },
];

/**
 * A short animated walkthrough shown over the welcome screen on someone's first visit.
 * Plays by itself, but every step has big Back / Next buttons and it can be skipped at any time.
 */
export function WelcomeTour({ onClose, onJoin, onBrowse }: { onClose: () => void; onJoin: () => void; onBrowse: () => void }) {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [still, setStill] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const last = index === SCENES.length - 1;

  // People who ask their device for less motion get the same tour without the bouncing.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStill)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: native }).start();
  }, [index, fade]);

  useEffect(() => {
    if (!autoplay || last) return;
    const t = setTimeout(() => setIndex((i) => i + 1), SCENE_MS);
    return () => clearTimeout(t);
  }, [autoplay, index, last]);

  // On the website, the Escape key closes the tour too.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (to: number) => {
    setAutoplay(false);
    setIndex(Math.max(0, Math.min(SCENES.length - 1, to)));
  };

  const scene = SCENES[index];
  const { Stage } = scene;

  return (
    <View style={styles.backdrop} accessibilityViewIsModal aria-modal role="dialog" aria-label="How EasyHand works">
      <View style={styles.sheet}>
        <View style={styles.topRow}>
          <Text style={styles.counter}>
            {index + 1} of {SCENES.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip the tour"
            onPress={onClose}
            style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.body, { opacity: fade }]} key={index}>
          <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Stage still={still} />
          </View>
          <Text style={styles.title} accessibilityRole="header" aria-live="polite">
            {scene.title}
          </Text>
          <Text style={styles.text}>{scene.text}</Text>
        </Animated.View>

        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SCENES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {last ? (
          <View style={{ gap: spacing.md }}>
            <Button title="Join EasyHand. It's free" onPress={onJoin} />
            <Button title="Look around first" variant="secondary" onPress={onBrowse} />
          </View>
        ) : (
          <View style={styles.navRow}>
            <Button title="Back" variant="secondary" onPress={() => go(index - 1)} disabled={index === 0} style={{ flex: 1 }} />
            <Button title="Next" onPress={() => go(index + 1)} style={{ flex: 1 }} />
          </View>
        )}
      </View>
    </View>
  );
}

// ---------- Animation helpers ----------

/** A value that springs from 0 to 1 after `delay` ms (or starts at 1 when motion is reduced). */
function useEntrance(delay: number, still: boolean) {
  const v = useRef(new Animated.Value(still ? 1 : 0)).current;
  useEffect(() => {
    if (still) return;
    const anim = Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, friction: 5, tension: 70, useNativeDriver: native })]);
    anim.start();
    return () => anim.stop();
  }, [delay, still, v]);
  return v;
}

/** A value that swings 0 → 1 → 0 forever (stays at 0 when motion is reduced). */
function useLoop(duration: number, still: boolean, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const ease = Easing.inOut(Easing.quad);
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: duration / 2, easing: ease, useNativeDriver: native }),
          Animated.timing(v, { toValue: 0, duration: duration / 2, easing: ease, useNativeDriver: native }),
        ]),
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, duration, still, v]);
  return v;
}

/** Pops in (grow + fade) after `delay` ms. */
function Pop({ delay, still, children, style }: { delay: number; still: boolean; children: ReactNode; style?: object }) {
  const v = useEntrance(delay, still);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return <Animated.View style={[style, { opacity: v, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Floats gently up and down. */
function Bob({ still, children, delay = 0, distance = 6 }: { still: boolean; children: ReactNode; delay?: number; distance?: number }) {
  const v = useLoop(2200, still, delay);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
}

function Emoji({ children, size = 44 }: { children: string; size?: number }) {
  return <Text style={{ fontSize: size, lineHeight: size * 1.2, textAlign: 'center' }}>{children}</Text>;
}

// ---------- Scenes ----------

function NeighborsStage({ still }: { still: boolean }) {
  const wave = useLoop(900, still, 900);
  const rotate = wave.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '20deg'] });
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Pop delay={150} still={still}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Emoji size={64}>👋</Emoji>
        </Animated.View>
      </Pop>
      <View style={styles.row}>
        {['🏡', '🏠', '🏘️', '🏠'].map((house, i) => (
          <Pop key={i} delay={400 + i * 180} still={still}>
            <Bob still={still} delay={i * 250} distance={4}>
              <Emoji size={42}>{house}</Emoji>
            </Bob>
          </Pop>
        ))}
      </View>
      <Pop delay={1300} still={still}>
        <Text style={styles.stageLabel}>Memphis</Text>
      </Pop>
    </View>
  );
}

function ListingStage({ still }: { still: boolean }) {
  const slide = useEntrance(200, still);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Animated.View style={[styles.miniCard, { opacity: slide, transform: [{ translateY }] }]}>
        <View style={styles.miniTag}>
          <Text style={styles.miniTagText}>🌱 Lawncare</Text>
        </View>
        <Text style={styles.miniTitle}>Need my lawn mowed</Text>
        <Text style={styles.miniMeta}>Midtown · $25</Text>
      </Animated.View>
      <View style={styles.row}>
        <Pop delay={900} still={still}>
          <Bob still={still}>
            <Emoji size={34}>💻</Emoji>
          </Bob>
        </Pop>
        <Pop delay={1100} still={still}>
          <Bob still={still} delay={300}>
            <Emoji size={34}>🧹</Emoji>
          </Bob>
        </Pop>
        <Pop delay={1300} still={still}>
          <Bob still={still} delay={600}>
            <Emoji size={34}>🔧</Emoji>
          </Bob>
        </Pop>
      </View>
    </View>
  );
}

function ChatStage({ still }: { still: boolean }) {
  return (
    <View style={{ width: '100%', maxWidth: 280, gap: spacing.sm }}>
      <Pop delay={250} still={still} style={{ alignSelf: 'flex-start' }}>
        <View style={[styles.bubble, styles.bubbleTheirs]}>
          <Text style={styles.bubbleTextTheirs}>Hi! I can mow it Saturday 🙂</Text>
        </View>
      </Pop>
      <Pop delay={1400} still={still} style={{ alignSelf: 'flex-end' }}>
        <View style={[styles.bubble, styles.bubbleMine]}>
          <Text style={styles.bubbleTextMine}>Wonderful, thank you!</Text>
        </View>
      </Pop>
      <Pop delay={2400} still={still} style={{ alignSelf: 'center' }}>
        <Bob still={still}>
          <Emoji size={36}>💬</Emoji>
        </Bob>
      </Pop>
    </View>
  );
}

function DealStage({ still }: { still: boolean }) {
  const shake = useLoop(700, still, 1600);
  const rotate = shake.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });
  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <View style={styles.row}>
        <Pop delay={200} still={still} style={styles.chip}>
          <Text style={styles.chipText}>📅 Saturday 10am</Text>
        </Pop>
        <Pop delay={700} still={still} style={styles.chip}>
          <Text style={styles.chipText}>💵 $25</Text>
        </Pop>
      </View>
      <Pop delay={1300} still={still}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Emoji size={64}>🤝</Emoji>
        </Animated.View>
      </Pop>
    </View>
  );
}

function FloatingHeart({ still, delay, left }: { still: boolean; delay: number; left: number }) {
  const v = useRef(new Animated.Value(still ? 0.5 : 0)).current;
  useEffect(() => {
    if (still) return;
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: native })),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, still, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [20, -90] });
  const opacity = v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View style={{ position: 'absolute', bottom: 40, left, opacity, transform: [{ translateY }] }}>
      <Emoji size={26}>❤️</Emoji>
    </Animated.View>
  );
}

function HappyStage({ still }: { still: boolean }) {
  return (
    <View style={{ width: 240, height: 170, alignItems: 'center', justifyContent: 'flex-end' }}>
      {!still && [30, 95, 160, 200].map((left, i) => <FloatingHeart key={left} still={still} delay={500 + i * 550} left={left} />)}
      <View style={styles.row}>
        <Pop delay={150} still={still}>
          <Bob still={still}>
            <Emoji size={54}>😊</Emoji>
          </Bob>
        </Pop>
        <Pop delay={400} still={still}>
          <Emoji size={54}>🌿</Emoji>
        </Pop>
        <Pop delay={650} still={still}>
          <Bob still={still} delay={400}>
            <Emoji size={54}>😄</Emoji>
          </Bob>
        </Pop>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(31, 42, 36, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 10,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.background,
    borderRadius: radius.lg + 8,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { color: colors.textMuted, fontSize: 17, fontWeight: '600' },
  skip: { minHeight: TAP_TARGET, minWidth: TAP_TARGET, paddingHorizontal: spacing.md, justifyContent: 'center', alignItems: 'center', marginRight: -spacing.md },
  skipText: { color: colors.primary, fontSize: 18, fontWeight: '700', textDecorationLine: 'underline' },
  body: { alignItems: 'center', gap: spacing.md },
  stage: {
    width: '100%',
    height: 210,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark, textAlign: 'center' },
  text: { fontSize: 18, color: colors.text, textAlign: 'center', lineHeight: 26, minHeight: 78 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { width: 28, backgroundColor: colors.primary },
  navRow: { flexDirection: 'row', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.md },
  stageLabel: { fontSize: 17, fontWeight: '800', color: colors.primaryDark, letterSpacing: 1 },
  miniCard: {
    width: 230,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  miniTag: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  miniTagText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  miniTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  miniMeta: { fontSize: 15, color: colors.textMuted },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 240 },
  bubbleTheirs: { backgroundColor: colors.bubbleTheirs, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  bubbleTextTheirs: { color: colors.text, fontSize: 17 },
  bubbleTextMine: { color: '#fff', fontSize: 17 },
  chip: { backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: colors.text, fontSize: 17, fontWeight: '700' },
});
