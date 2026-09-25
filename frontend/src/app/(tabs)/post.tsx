import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryPills } from '@/components/CategoryPills';
import { Button, ErrorText, Field } from '@/components/ui';
import { api, type Category, type PostKind } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/theme';

const KINDS: { value: PostKind; title: string; subtitle: string; icon: 'hand-left-outline' | 'heart-outline' }[] = [
  { value: 'request', title: 'I need a hand', subtitle: 'Ask a neighbor for help', icon: 'hand-left-outline' },
  { value: 'offer', title: 'I can lend a hand', subtitle: 'Offer your skills', icon: 'heart-outline' },
];

export default function NewPostScreen() {
  const { user } = useAuth();
  const [kind, setKind] = useState<PostKind>('request');
  const [category, setCategory] = useState<Category>('tech');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [compensation, setCompensation] = useState('');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setCompensation('');
    setImage(null);
    setError(null);
  };

  const submit = async () => {
    if (title.trim().length < 3) return setError('Give your listing a title (at least 3 characters).');
    if (!description.trim()) return setError('Add a short description so neighbors know what is involved.');
    setError(null);
    setBusy(true);
    try {
      const image_url = image ? await api.uploadImage(image.uri, image.mimeType ?? undefined) : null;
      const post = await api.createPost({
        kind,
        category,
        title: title.trim(),
        description: description.trim(),
        compensation: compensation.trim(),
        neighborhood: neighborhood.trim(),
        image_url,
      });
      reset();
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.kindRow}>
          {KINDS.map((k) => {
            const selected = kind === k.value;
            return (
              <Pressable
                key={k.value}
                onPress={() => setKind(k.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.kindCard, selected && styles.kindCardSelected]}
              >
                <Ionicons name={k.icon} size={22} color={selected ? colors.primary : colors.textMuted} />
                <Text style={[styles.kindTitle, selected && { color: colors.primaryDark }]}>{k.title}</Text>
                <Text style={styles.kindSubtitle}>{k.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={styles.label}>What kind of help?</Text>
          <View style={{ marginHorizontal: -spacing.lg }}>
            <CategoryPills value={category} onChange={(c) => c && setCategory(c)} />
          </View>
        </View>

        <Field
          label="Short title"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          placeholder={kind === 'request' ? 'e.g. Printer keeps going offline' : 'e.g. Weekend lawn mowing in Midtown'}
        />
        <Field
          label="Details"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={4000}
          placeholder="Share the details: what's involved, timing, tools needed…"
        />
        <Field
          label={kind === 'request' ? 'What will you pay? (optional)' : 'What do you charge? (optional)'}
          value={compensation}
          onChangeText={setCompensation}
          maxLength={120}
          placeholder="e.g. $30, a home-cooked meal, or free"
        />
        <Field label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} maxLength={80} placeholder="e.g. Cooper-Young" />

        <View style={{ gap: spacing.xs }}>
          <Text style={styles.label}>Photo (optional)</Text>
          {image ? (
            <View>
              <Image source={{ uri: image.uri }} style={styles.preview} />
              <Pressable accessibilityLabel="Remove photo" onPress={() => setImage(null)} style={styles.removeImage}>
                <Ionicons name="close" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pickImage} style={styles.photoPicker}>
              <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted }}>Add a photo</Text>
            </Pressable>
          )}
        </View>

        <ErrorText message={error} />
        <Button title="Post it" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  label: { fontWeight: '600', color: colors.text, fontSize: 17 },
  kindRow: { flexDirection: 'row', gap: spacing.md },
  kindCard: {
    flex: 1,
    padding: spacing.lg,
    gap: 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  kindCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  kindTitle: { fontWeight: '700', fontSize: 18, color: colors.text },
  kindSubtitle: { color: colors.textMuted, fontSize: 16 },
  photoPicker: {
    height: 110,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
  },
  preview: { width: '100%', height: 200, borderRadius: radius.md },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 6,
  },
});
