// app/repos.tsx — Repository selection screen
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listRepos, createRepo, type Repo } from '../services/github';
import { useStore } from '../store/useStore';
import { colors, radius, spacing } from '../constants/theme';

export default function ReposScreen() {
  const { token, username, repos, setRepos, selectRepo, logout } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrivate, setNewPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadRepos = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const data = await listRepos(token);
      setRepos(data);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load repos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadRepos(); }, []);

  const handleSelect = (repo: Repo) => {
    selectRepo(repo);
    router.push('/upload');
  };

  const handleCreate = async () => {
    if (!token || !username || !newName.trim()) return;
    setCreating(true);
    try {
      const repo = await createRepo(token, newName.trim(), newPrivate, newDesc.trim());
      setRepos([repo, ...repos]);
      setShowNew(false);
      setNewName(''); setNewDesc('');
      selectRepo(repo);
      router.push('/upload');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create repo');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('gh_token');
    logout();
    router.replace('/');
  };

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return `${d}d ago`;
    if (d < 365) return `${Math.floor(d / 30)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  };

  const renderRepo = ({ item }: { item: Repo }) => (
    <TouchableOpacity style={styles.repoCard} onPress={() => handleSelect(item)} activeOpacity={0.7}>
      <View style={styles.repoRow}>
        <View style={styles.repoInfo}>
          <Text style={styles.repoName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.repoDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.repoBadges}>
            <View style={[styles.badge, item.private ? styles.badgePrivate : styles.badgePublic]}>
              <Text style={styles.badgeText}>{item.private ? 'PRIVATE' : 'PUBLIC'}</Text>
            </View>
            <Text style={styles.repoTime}>{timeAgo(item.pushed_at)}</Text>
          </View>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>REPOSITORIES</Text>
          <Text style={styles.headerSub}>@{username}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* Search + New */}
      <View style={styles.controls}>
        <TextInput
          style={styles.searchInput}
          placeholder="search repos..."
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowNew(!showNew)}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>{showNew ? '✕' : '＋ NEW'}</Text>
        </TouchableOpacity>
      </View>

      {/* New repo form */}
      {showNew && (
        <View style={styles.newForm}>
          <TextInput
            style={styles.formInput}
            placeholder="repository-name"
            placeholderTextColor={colors.textDim}
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.formInput}
            placeholder="description (optional)"
            placeholderTextColor={colors.textDim}
            value={newDesc}
            onChangeText={setNewDesc}
          />
          <View style={styles.formRow}>
            <TouchableOpacity
              style={[styles.toggle, newPrivate && styles.toggleActive]}
              onPress={() => setNewPrivate(!newPrivate)}
            >
              <Text style={[styles.toggleText, newPrivate && styles.toggleTextActive]}>
                {newPrivate ? '🔒 PRIVATE' : '🌐 PUBLIC'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, (!newName.trim() || creating) && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={!newName.trim() || creating}
            >
              {creating
                ? <ActivityIndicator color={colors.black} size="small" />
                : <Text style={styles.createBtnText}>CREATE →</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>loading repos...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRepo}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadRepos(true); }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>no repos found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl + spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 4, color: colors.text, fontFamily: 'Courier New' },
  headerSub: { fontSize: 12, color: colors.accent, marginTop: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  logoutText: { fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  searchInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: 'Courier New', fontSize: 14,
  },
  newBtn: {
    backgroundColor: colors.accentDim, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.accent, paddingHorizontal: spacing.md, justifyContent: 'center',
  },
  newBtnText: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  newForm: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.text, padding: spacing.sm,
    fontFamily: 'Courier New', fontSize: 13,
  },
  formRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: {
    flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, alignItems: 'center', backgroundColor: colors.surface,
  },
  toggleActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  toggleText: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  toggleTextActive: { color: colors.accent },
  createBtn: {
    flex: 1, backgroundColor: colors.accent, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center',
  },
  createBtnText: { color: colors.black, fontWeight: '900', letterSpacing: 2, fontSize: 12 },
  btnDisabled: { opacity: 0.4 },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 32 },
  repoCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  repoRow: { flexDirection: 'row', alignItems: 'center' },
  repoInfo: { flex: 1 },
  repoName: { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: 'Courier New' },
  repoDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  repoBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgePublic: { backgroundColor: '#1a3a1f' },
  badgePrivate: { backgroundColor: '#2d1117' },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: colors.textMuted },
  repoTime: { fontSize: 11, color: colors.textDim },
  arrow: { fontSize: 24, color: colors.textDim, marginLeft: spacing.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { color: colors.textMuted, marginTop: spacing.md, fontFamily: 'Courier New' },
  emptyText: { color: colors.textMuted, fontFamily: 'Courier New' },
});
