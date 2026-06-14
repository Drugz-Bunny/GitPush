// app/index.tsx — Auth screen
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUser } from '../services/github';
import { useStore } from '../store/useStore';
import { colors, radius, spacing } from '../constants/theme';

const TOKEN_KEY = 'gh_token';

export default function AuthScreen() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingStored, setCheckingStored] = useState(true);
  const setAuth = useStore((s) => s.setAuth);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) {
        try {
          const user = await getUser(stored);
          setAuth(stored, user.login, user.avatar_url);
          router.replace('/repos');
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
      setCheckingStored(false);
    })();
  }, []);

  const handleLogin = async () => {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    setError('');
    try {
      const user = await getUser(t);
      await AsyncStorage.setItem(TOKEN_KEY, t);
      setAuth(t, user.login, user.avatar_url);
      router.replace('/repos');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStored) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoMark}>
            <Text style={styles.logoGlyph}>⬡</Text>
          </View>
          <Text style={styles.appName}>GITPUSH</Text>
          <Text style={styles.tagline}>push code. anywhere.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Access Token</Text>
          <Text style={styles.cardSub}>
            Required scopes: <Text style={styles.mono}>repo</Text>, <Text style={styles.mono}>read:user</Text>
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : {}]}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor={colors.textDim}
            value={token}
            onChangeText={(t) => { setToken(t); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={colors.black} size="small" />
              : <Text style={styles.btnText}>CONNECT →</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Linking.openURL('https://github.com/settings/tokens/new?scopes=repo,read:user&description=GitPush+App')}
          >
            <Text style={styles.linkText}>Generate token on GitHub ↗</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          Your token is stored locally on this device only.{'\n'}Never sent to any third party.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logoArea: { alignItems: 'center', marginBottom: spacing.xl * 1.5 },
  logoMark: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  logoGlyph: { fontSize: 32, color: colors.accent },
  appName: {
    fontSize: 28, fontWeight: '900', letterSpacing: 8,
    color: colors.text, fontFamily: 'Courier New',
  },
  tagline: { fontSize: 13, color: colors.textMuted, letterSpacing: 2, marginTop: 4 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  mono: { fontFamily: 'Courier New', color: colors.accent },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.text, padding: spacing.md,
    fontFamily: 'Courier New', fontSize: 14, marginBottom: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginBottom: spacing.sm },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.black, fontWeight: '900', letterSpacing: 3, fontSize: 14 },
  linkBtn: { alignItems: 'center', padding: spacing.sm },
  linkText: { color: colors.accent, fontSize: 13 },
  footnote: { textAlign: 'center', color: colors.textDim, fontSize: 11, marginTop: spacing.lg, lineHeight: 18 },
});
