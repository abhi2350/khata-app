import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const STORAGE_KEY = '@khata_entries';


const ACCENT = '#1565C0';


// ── Toast ──────────────────────────────────────────────────────────────────
const TOAST_CONFIG = {
  success: { bg: '#1B5E20', icon: 'check-circle', iconColor: '#A5D6A7' },
  error:   { bg: '#B71C1C', icon: 'error',        iconColor: '#FFCDD2' },
  info:    { bg: '#0D47A1', icon: 'info',          iconColor: '#90CAF9' },
};

function Toast({ message, type, visible }) {
  const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.info;
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { backgroundColor: cfg.bg, transform: [{ translateY }], opacity }]}
    >
      <MaterialIcons name={cfg.icon} size={20} color={cfg.iconColor} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPage, setFormPage] = useState('');
  const [formError, setFormError] = useState('');

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message, type });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }, []);

  useEffect(() => {
    loadEntries();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch { /* ignore */ }
  };

  const saveEntries = async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setFormName('');
    setFormPage('');
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setFormName(entry.name);
    setFormPage(String(entry.page));
    setFormError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingEntry(null);
    setFormName('');
    setFormPage('');
    setFormError('');
  };

  const handleSave = () => {
    const trimmedName = formName.trim();
    const trimmedPage = formPage.trim();
    if (!trimmedName) { setFormError('Name is required.'); return; }
    if (!trimmedPage || isNaN(Number(trimmedPage)) || Number(trimmedPage) <= 0) {
      setFormError('Enter a valid page number.');
      return;
    }

    let updated;
    if (editingEntry) {
      updated = entries.map((e) =>
        e.id === editingEntry.id
          ? { ...e, name: trimmedName, page: Number(trimmedPage) }
          : e
      );
      showToast(`"${trimmedName}" updated successfully`, 'success');
    } else {
      updated = [...entries, { id: Date.now().toString(), name: trimmedName, page: Number(trimmedPage), createdAt: new Date().toISOString() }];
      showToast(`"${trimmedName}" added successfully`, 'success');
    }
    setEntries(updated);
    saveEntries(updated);
    closeModal();
  };

  const handleDelete = (entry) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${entry.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = entries.filter((e) => e.id !== entry.id);
            setEntries(updated);
            saveEntries(updated);
            showToast(`"${entry.name}" deleted`, 'error');
          },
        },
      ]
    );
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      return (
        <View style={styles.card}>
          {/* Left accent strip */}
          <View style={styles.cardAccent} />

          {/* Page number avatar */}
          <View style={styles.pageBox}>
            <Text style={styles.pageBoxLabel}>Pg.</Text>
            <Text style={styles.pageBoxNum}>{item.page}</Text>
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {item.createdAt && (
              <View style={styles.timestampRow}>
                <MaterialIcons name="access-time" size={11} color="#B0BEC5" />
                <Text style={styles.timestampText}>
                  {new Date(item.createdAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#E3F2FD' }]}
              onPress={() => openEditModal(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons name="edit" size={17} color="#1565C0" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#FFEBEE' }]}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons name="delete-outline" size={17} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [entries]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#0D47A1" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        {/* Decorative circles */}
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />

        {/* Left content */}
        <View style={styles.headerContent}>
          {/* App name pill */}
          <View style={styles.appNamePill}>
            <MaterialIcons name="import-contacts" size={13} color="#90CAF9" />
            <Text style={styles.appNamePillText}>KHATA</Text>
          </View>

          {/* Welcome text */}
          <Text style={styles.headerGreeting}>Welcome back,</Text>
          <Text style={styles.headerName}>Santosh! 👋</Text>

          {/* Meta row */}
          <View style={styles.headerMeta}>
            <View style={styles.headerMetaChip}>
              <MaterialIcons name="calendar-today" size={11} color="#90CAF9" />
              <Text style={styles.headerMetaText}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {entries.length > 0 && (
              <View style={styles.headerMetaChip}>
                <MaterialIcons name="people" size={11} color="#90CAF9" />
                <Text style={styles.headerMetaText}>{entries.length} entries</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notebook icon */}
        <View style={styles.headerIconWrap}>
          <MaterialIcons name="import-contacts" size={52} color="rgba(255,255,255,0.15)" />
        </View>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrapper}>
          <MaterialIcons name="search" size={20} color="#90A4AE" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#B0BEC5"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={18} color="#90A4AE" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Count bar */}
      {entries.length > 0 && (
        <View style={styles.countBar}>
          <MaterialIcons name="people" size={14} color="#90A4AE" />
          <Text style={styles.countText}>
            {' '}{filteredEntries.length} of {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      )}

      {/* Card list */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={64} color="#CFD8DC" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : 'No entries yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {searchQuery ? 'Try a different name.' : 'Tap "+ Add" to create your first entry.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBg, { backgroundColor: editingEntry ? '#E3F2FD' : '#E8F5E9' }]}>
                <MaterialIcons
                  name={editingEntry ? 'edit' : 'person-add'}
                  size={22}
                  color={editingEntry ? '#1565C0' : '#2E7D32'}
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>{editingEntry ? 'Edit Entry' : 'New Entry'}</Text>
                <Text style={styles.modalSubtitle}>
                  {editingEntry ? 'Update name or page number' : 'Fill in the details below'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={18} color="#90A4AE" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Enter full name"
                placeholderTextColor="#B0BEC5"
                value={formName}
                onChangeText={(v) => { setFormName(v); setFormError(''); }}
                autoFocus
              />
            </View>

            <Text style={styles.fieldLabel}>Page Number</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="bookmark" size={18} color="#90A4AE" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Enter page number"
                placeholderTextColor="#B0BEC5"
                value={formPage}
                onChangeText={(v) => { setFormPage(v); setFormError(''); }}
                keyboardType="numeric"
              />
            </View>

            {formError ? (
              <View style={styles.errorWrapper}>
                <MaterialIcons name="error-outline" size={14} color="#E53935" />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: editingEntry ? '#1565C0' : '#2E7D32' }]}
                onPress={handleSave}
              >
                <MaterialIcons name={editingEntry ? 'check' : 'add'} size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingEntry ? 'Update' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EEF2F7' },

  /* Header */
  header: {
    backgroundColor: '#0D47A1',
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -30,
  },
  headerCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40,
    right: 60,
  },
  headerContent: { flex: 1 },
  appNamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 5,
    marginBottom: 10,
  },
  appNamePillText: {
    color: '#BBDEFB',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerGreeting: {
    color: '#90CAF9',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  headerMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  headerMetaText: {
    color: '#BBDEFB',
    fontSize: 11,
    fontWeight: '500',
  },
  headerIconWrap: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3EAF0',
    elevation: 2,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: '#E0E7EF',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#263238', paddingVertical: 0 },
  addBtn: {
    marginLeft: 10,
    backgroundColor: '#1565C0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
    elevation: 2,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  /* Count bar */
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
  },
  countText: { fontSize: 12, color: '#90A4AE' },

  /* Cards */
  listContent: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardAccent: { width: 4, alignSelf: 'stretch', backgroundColor: ACCENT },
  pageBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    marginVertical: 14,
  },
  pageBoxLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 11,
  },
  pageBoxNum: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  cardInfo: { flex: 1, paddingHorizontal: 14, justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1A237E' },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timestampText: { fontSize: 11, color: '#B0BEC5' },
  cardActions: { flexDirection: 'row', gap: 8, paddingRight: 14 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty */
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 8,
  },
  emptyTitle: { fontSize: 17, color: '#78909C', fontWeight: '600', marginTop: 8 },
  emptyHint: { fontSize: 13, color: '#B0BEC5', textAlign: 'center', lineHeight: 20 },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    elevation: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  modalIconBg: { borderRadius: 12, padding: 8 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A237E' },
  modalSubtitle: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginBottom: 14 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#78909C',
    marginBottom: 6, marginTop: 12,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FAFBFC',
  },
  fieldInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#263238' },
  errorWrapper: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  errorText: { color: '#E53935', fontSize: 12, fontWeight: '500' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 22, gap: 10 },
  cancelBtn: {
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#CFD8DC',
  },
  cancelBtnText: { fontSize: 14, color: '#607D8B', fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 10, elevation: 2,
  },
  saveBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },

  /* Toast */
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 },
});
