// app/upload.tsx — File upload screen
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../store/useStore';
import { uploadFiles, type FileUpload, type UploadResult } from '../services/github';
import { colors, radius, spacing } from '../constants/theme';

// Encode file URI to base64
async function uriToBase64(uri: string): Promise<string> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return b64;
}

// Sanitize filename for repo path
function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._\-\/]/g, '_');
}

export default function UploadScreen() {
  const { token, username, selectedRepo, files, addFiles, removeFile, clearFiles,
    commitMessage, setCommitMessage, uploadBranch, setUploadBranch } = useStore();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editPathValue, setEditPathValue] = useState('');

  const handlePickFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const picked: FileUpload[] = await Promise.all(
        result.assets.map(async (asset) => {
          const content = await uriToBase64(asset.uri);
          const name = asset.name || 'file';
          return { path: sanitizeName(name), content, name };
        })
      );
      addFiles(picked);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel')) {
        Alert.alert('Error', 'Failed to pick files');
      }
    }
  }, [addFiles]);

  const handleUpload = async () => {
    if (!token || !username || !selectedRepo || files.length === 0) return;
    if (!commitMessage.trim()) {
      Alert.alert('Commit message required', 'Please enter a commit message before pushing.');
      return;
    }

    setUploading(true);
    setResults(null);
    setProgress({ done: 0, total: files.length, current: '' });

    try {
      const res = await uploadFiles(
        token,
        username,
        selectedRepo.name,
        files,
        commitMessage.trim(),
        uploadBranch,
        (done, total, current) => setProgress({ done, total, current })
      );
      setResults(res);
      const failed = res.filter((r) => !r.success);
      if (failed.length === 0) {
        clearFiles();
        setCommitMessage('');
      }
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const successCount = results ? results.filter((r) => r.success).length : 0;
  const failCount = results ? results.filter((r) => !r.success).length : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ REPOS</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.repoName} numberOfLines={1}>{selectedRepo?.name}</Text>
          <Text style={styles.repoBranch}>↳ {uploadBranch}</Text>
        </View>
        <TouchableOpacity onPress={handlePickFiles} style={styles.addBtn} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>＋ ADD</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Branch selector */}
        <View style={styles.section}>
          <Text style={styles.label}>BRANCH</Text>
          <TextInput
            style={styles.branchInput}
            value={uploadBranch}
            onChangeText={setUploadBranch}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="main"
            placeholderTextColor={colors.textDim}
          />
        </View>

        {/* Commit message */}
        <View style={styles.section}>
          <Text style={styles.label}>COMMIT MESSAGE</Text>
          <TextInput
            style={styles.commitInput}
            value={commitMessage}
            onChangeText={setCommitMessage}
            placeholder="feat: add new feature&#10;&#10;Describe what changed and why..."
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {/* Quick commit presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presets}>
            {['feat: ', 'fix: ', 'docs: ', 'refactor: ', 'chore: ', 'init: initial commit'].map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.preset}
                onPress={() => setCommitMessage((prev) => prev ? prev : p)}
              >
                <Text style={styles.presetText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Files */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>FILES ({files.length})</Text>
            {files.length > 0 && (
              <TouchableOpacity onPress={clearFiles}>
                <Text style={styles.clearText}>CLEAR ALL</Text>
              </TouchableOpacity>
            )}
          </View>

          {files.length === 0 ? (
            <TouchableOpacity style={styles.emptyDrop} onPress={handlePickFiles} activeOpacity={0.7}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>TAP TO ADD FILES</Text>
              <Text style={styles.emptySubtitle}>Pick files or entire directories from your device</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.fileList}>
              {files.map((file) => (
                <View key={file.path} style={styles.fileRow}>
                  <View style={styles.fileIcon}>
                    <Text style={styles.fileIconText}>{getFileIcon(file.name)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.fileMeta}
                    onLongPress={() => { setEditingPath(file.path); setEditPathValue(file.path); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.filePath} numberOfLines={1}>{file.path}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeFile(file.path)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Results */}
        {results && (
          <View style={styles.section}>
            <Text style={styles.label}>PUSH RESULTS</Text>
            <View style={[styles.resultSummary, failCount > 0 ? styles.resultFail : styles.resultSuccess]}>
              <Text style={styles.resultSummaryText}>
                {successCount === results.length
                  ? `✓ All ${successCount} files pushed successfully`
                  : `✓ ${successCount} pushed  ✗ ${failCount} failed`}
              </Text>
            </View>
            {results.filter((r) => !r.success).map((r) => (
              <View key={r.path} style={styles.resultRow}>
                <Text style={styles.resultPathFail}>✗ {r.path}</Text>
                <Text style={styles.resultError}>{r.error}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Upload progress */}
      {uploading && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(progress.done / progress.total) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress.done}/{progress.total} — {progress.current || 'preparing...'}
          </Text>
        </View>
      )}

      {/* Push button */}
      <View style={styles.pushArea}>
        <TouchableOpacity
          style={[styles.pushBtn, (files.length === 0 || uploading) && styles.pushBtnDisabled]}
          onPress={handleUpload}
          disabled={files.length === 0 || uploading}
          activeOpacity={0.8}
        >
          {uploading
            ? <ActivityIndicator color={colors.black} size="small" />
            : <>
                <Text style={styles.pushBtnText}>⬆ PUSH TO GITHUB</Text>
                <Text style={styles.pushBtnSub}>{files.length} file{files.length !== 1 ? 's' : ''} → {selectedRepo?.name}</Text>
              </>}
        </TouchableOpacity>
      </View>

      {/* Edit path modal */}
      <Modal visible={!!editingPath} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>EDIT REPO PATH</Text>
            <Text style={styles.modalSub}>Change where this file will appear in the repository</Text>
            <TextInput
              style={styles.modalInput}
              value={editPathValue}
              onChangeText={setEditPathValue}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingPath(null)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  if (editingPath && editPathValue.trim()) {
                    useStore.getState().updateFilePath(editingPath, editPathValue.trim());
                  }
                  setEditingPath(null);
                }}
              >
                <Text style={styles.modalConfirmText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: '🔷', tsx: '⚛️', js: '🟡', jsx: '⚛️', py: '🐍', json: '📋',
    md: '📝', css: '🎨', html: '🌐', sh: '⚡', env: '🔐', txt: '📄',
    png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼',
    zip: '📦', tar: '📦', gz: '📦',
  };
  return map[ext] || '📄';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.xl + spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: spacing.sm },
  backText: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  repoName: { fontSize: 14, fontWeight: '900', color: colors.text, fontFamily: 'Courier New', letterSpacing: 1 },
  repoBranch: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  addBtn: {
    backgroundColor: colors.accentDim, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.accent, paddingVertical: 6, paddingHorizontal: spacing.sm,
  },
  addBtnText: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  scroll: { flex: 1 },
  section: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { fontSize: 10, letterSpacing: 3, color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm },
  clearText: { fontSize: 10, letterSpacing: 2, color: colors.danger },

  branchInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.accent, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontFamily: 'Courier New', fontSize: 14,
  },

  commitInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.text, padding: spacing.md,
    fontSize: 14, minHeight: 100, fontFamily: 'Courier New',
  },
  presets: { marginTop: spacing.sm },
  preset: {
    backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 4, marginRight: spacing.xs,
  },
  presetText: { color: colors.textMuted, fontSize: 11, fontFamily: 'Courier New' },

  emptyDrop: {
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 3, color: colors.textMuted },
  emptySubtitle: { fontSize: 12, color: colors.textDim, textAlign: 'center' },

  fileList: { gap: spacing.xs },
  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: spacing.sm,
  },
  fileIcon: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  fileIconText: { fontSize: 20 },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '600', color: colors.text },
  filePath: { fontSize: 11, color: colors.textMuted, fontFamily: 'Courier New', marginTop: 1 },
  removeBtn: { padding: 6 },
  removeText: { fontSize: 14, color: colors.danger },

  resultSummary: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  resultSuccess: { backgroundColor: colors.accentDim },
  resultFail: { backgroundColor: colors.dangerDim },
  resultSummaryText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  resultRow: { marginBottom: spacing.xs },
  resultPathFail: { color: colors.danger, fontSize: 12, fontFamily: 'Courier New' },
  resultError: { color: colors.textMuted, fontSize: 11, marginLeft: spacing.md },

  progressOverlay: {
    position: 'absolute', bottom: 100, left: spacing.md, right: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md,
  },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  progressText: { color: colors.textMuted, fontSize: 11, fontFamily: 'Courier New' },

  pushArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  pushBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  pushBtnDisabled: { opacity: 0.35 },
  pushBtnText: { color: colors.black, fontWeight: '900', letterSpacing: 3, fontSize: 15 },
  pushBtnSub: { color: colors.black, fontSize: 11, opacity: 0.7, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', padding: spacing.lg },
  modalCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  modalTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 3, color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.borderActive, color: colors.text, padding: spacing.md,
    fontFamily: 'Courier New', fontSize: 14, marginBottom: spacing.md,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: {
    flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, alignItems: 'center',
  },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  modalConfirm: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  modalConfirmText: { color: colors.black, fontWeight: '900', letterSpacing: 2 },
});
