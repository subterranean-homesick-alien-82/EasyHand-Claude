import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Centered, EmptyState, ErrorText, RefreshButton, Tag } from '@/components/ui';
import { api, type AdminReport, type ReportReason } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, radius, spacing } from '@/theme';

const REASON_LABELS: Record<ReportReason, string> = {
  scam: 'Scam',
  unsafe: 'Felt unsafe',
  offensive: 'Rude or offensive',
  spam: 'Spam',
  other: 'Other',
};

function ReportCard({ report, onChanged }: { report: AdminReport; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPost = report.target_type === 'post';

  const act = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.tags}>
        <Tag label={isPost ? 'Listing' : 'Person'} color={colors.textMuted} />
        <Tag label={REASON_LABELS[report.reason]} color={colors.danger} />
        {report.target_hidden ? <Tag label={isPost ? 'Hidden' : 'Banned'} color={colors.danger} /> : null}
      </View>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(isPost ? `/posts/${report.target_id}` : `/users/${report.target_id}`)}
      >
        <Text style={styles.target}>{report.target_label}</Text>
      </Pressable>
      {report.details ? <Text style={styles.details}>“{report.details}”</Text> : null}
      <Text style={styles.meta}>
        Reported by {report.reporter?.name ?? 'a deleted account'} · {timeAgo(report.created_at)}
      </Text>
      <ErrorText message={error} />
      {isPost ? (
        <Button
          title={report.target_hidden ? 'Show listing again' : 'Hide listing'}
          variant={report.target_hidden ? 'secondary' : 'danger'}
          loading={busy === 'hide'}
          onPress={() => act('hide', () => api.admin.setPostHidden(report.target_id, !report.target_hidden))}
        />
      ) : (
        <Button
          title={report.target_hidden ? 'Unban account' : 'Ban account'}
          variant={report.target_hidden ? 'secondary' : 'danger'}
          loading={busy === 'ban'}
          onPress={() => act('ban', () => api.admin.setUserBanned(report.target_id, !report.target_hidden))}
        />
      )}
      {report.status === 'open' ? (
        <Button
          title="Mark as handled"
          variant="secondary"
          loading={busy === 'resolve'}
          onPress={() => act('resolve', () => api.admin.resolveReport(report.id))}
        />
      ) : null}
    </Card>
  );
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const { data, error, loading, refreshing, refresh, reload } = useFocusedQuery(() => api.admin.listReports(status), [status]);

  if (!user?.is_admin) {
    return (
      <Centered>
        <Text style={styles.details}>This page is only for EasyHand moderators.</Text>
      </Centered>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.segment}>
        {(['open', 'resolved'] as const).map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: status === s }}
            onPress={() => setStatus(s)}
            style={[styles.segmentItem, status === s && styles.segmentItemSelected]}
          >
            <Text style={[styles.segmentText, status === s && { color: colors.text }]}>
              {s === 'open' ? 'Needs review' : 'Handled'}
            </Text>
          </Pressable>
        ))}
      </View>
      <RefreshButton onPress={refresh} refreshing={refreshing} />
      <ErrorText message={error} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : data && data.length === 0 ? (
        <EmptyState title={status === 'open' ? 'No reports to review' : 'Nothing handled yet'} />
      ) : (
        (data ?? []).map((r) => <ReportCard key={r.id} report={r} onChanged={reload} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  target: { fontSize: 20, fontWeight: '700', color: colors.primary, textDecorationLine: 'underline' },
  details: { fontSize: 18, color: colors.text, lineHeight: 26 },
  meta: { fontSize: 16, color: colors.textMuted },
  segment: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentItemSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: '700', fontSize: 17 },
});
