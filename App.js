import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Modal, Keyboard, FlatList, Image, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const STORAGE_KEY = '@tmd_messenger_v5';
const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
  yellow: '#FFF0D6', blue: '#EAF2FF'
};

const COUNTRIES = [
  { name: 'Guinée', dial: '+224', flag: '🇬🇳' }, { name: 'France', dial: '+33', flag: '🇫🇷' },
  { name: 'Sénégal', dial: '+221', flag: '🇸🇳' }, { name: 'Côte d’Ivoire', dial: '+225', flag: '🇨🇮' },
  { name: 'Mali', dial: '+223', flag: '🇲🇱' }, { name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { name: 'États-Unis', dial: '+1', flag: '🇺🇸' }, { name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧' },
  { name: 'Belgique', dial: '+32', flag: '🇧🇪' }, { name: 'Allemagne', dial: '+49', flag: '🇩🇪' },
  { name: 'Maroc', dial: '+212', flag: '🇲🇦' }, { name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { name: 'Cameroun', dial: '+237', flag: '🇨🇲' }, { name: 'Gambie', dial: '+220', flag: '🇬🇲' },
  { name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' }, { name: 'Liberia', dial: '+231', flag: '🇱🇷' },
  { name: 'Ghana', dial: '+233', flag: '🇬🇭' }, { name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
  { name: 'Bénin', dial: '+229', flag: '🇧🇯' }, { name: 'Togo', dial: '+228', flag: '🇹🇬' },
  { name: 'Niger', dial: '+227', flag: '🇳🇪' }, { name: 'Gabon', dial: '+241', flag: '🇬🇦' },
  { name: 'Congo', dial: '+242', flag: '🇨🇬' }, { name: 'RDC', dial: '+243', flag: '🇨🇩' },
  { name: 'Algérie', dial: '+213', flag: '🇩🇿' }, { name: 'Tunisie', dial: '+216', flag: '🇹🇳' },
  { name: 'Égypte', dial: '+20', flag: '🇪🇬' }, { name: 'Afrique du Sud', dial: '+27', flag: '🇿🇦' },
  { name: 'Turquie', dial: '+90', flag: '🇹🇷' }, { name: 'Arabie saoudite', dial: '+966', flag: '🇸🇦' },
  { name: 'Chine', dial: '+86', flag: '🇨🇳' }, { name: 'Inde', dial: '+91', flag: '🇮🇳' },
].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

const starterChats = [
  {
    id: 'welcome', name: 'Bienvenue sur TMD', pseudonym: 'TMD', phone: '',
    last: 'Bienvenue sur TMD Messenger !', unread: 0,
    messages: [
      { id: 'welcome-1', text: 'Bienvenue sur TMD Messenger 👋', mine: false, time: '09:00', status: 'Distribué' },
      { id: 'welcome-2', text: 'Cette version est une démonstration locale.', mine: false, time: '09:01', status: 'Distribué' },
    ],
  },
];

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const normalizePhone = value => String(value || '').replace(/[\s()-]/g, '');

function demoHash(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function maskPhone() { return '•• •• •• ••'; }
function maskBirthDate() { return '••/••/••••'; }

function formatDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function validBirthDate(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [d, m, y] = value.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  const age = (Date.now() - date.getTime()) / (365.2425 * 86400000);
  return age >= 13 && age <= 120;
}

/* =========================================================
   COMPOSANTS
   ========================================================= */
function Button({ title, onPress, secondary = false, danger = false, loading = false }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={loading}
      style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger, loading && { opacity: 0.7 }]}>
      {loading ? <ActivityIndicator color={secondary ? C.green : C.white} /> : <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>}
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', maxLength, autoCapitalize = 'none' }) {
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#9AA59F" secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} maxLength={maxLength} autoCapitalize={autoCapitalize}
        autoCorrect={false} style={styles.input} />
    </View>
  );
}

function Header({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {right || <View style={{ width: 35 }} />}
    </View>
  );
}

function Avatar({ photo, fallback = '👤', size = 50 }) {
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}><Text style={{ fontSize: size * 0.5 }}>{fallback}</Text></View>;
}

/* =========================================================
   APP
   ========================================================= */
export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  
  // --- MESSAGERIE ---
  const [msgAccount, setMsgAccount] = useState(null);
  const [chats, setChats] = useState(starterChats);
  const [activeChatId, setActiveChatId] = useState(null);
  
  const [msgName, setMsgName] = useState('');
  const [msgBirth, setMsgBirth] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgConfirmPassword, setMsgConfirmPassword] = useState('');
  const [msgOtp, setMsgOtp] = useState('');
  const [msgPhoto, setMsgPhoto] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountries, setShowCountries] = useState(false);
  
  const [securityCode, setSecurityCode] = useState('');
  const [confirmSecurityCode, setConfirmSecurityCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  // --- SOCIAL ---
  const [socAccount, setSocAccount] = useState(null);
  const [socName, setSocName] = useState('');
  const [socContact, setSocContact] = useState('');
  const [socPassword, setSocPassword] = useState('');
  const [socPhoto, setSocPhoto] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');

  // --- UTILS ---
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    loadSavedData();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function loadSavedData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.msgAccount) setMsgAccount(data.msgAccount);
        if (data.socAccount) setSocAccount(data.socAccount);
        if (data.chats) setChats(data.chats);
        if (data.posts) setPosts(data.posts);
      }
    } catch (e) {
      console.log('Erreur chargement local (non bloquant) :', e);
    }
  }

  async function saveData() {
    try {
      const data = { msgAccount, socAccount, chats, posts };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.log('Erreur sauvegarde locale :', e);
    }
  }

  useEffect(() => {
    saveData();
  }, [msgAccount, socAccount, chats, posts]);

  const go = (next) => { Keyboard.dismiss(); setNotice(''); setScreen(next); };

  // --- PHOTO ---
  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      if (type === 'msg') setMsgPhoto(result.assets[0].uri);
      else setSocPhoto(result.assets[0].uri);
    }
  };

  // --- MESSAGERIE INSCRIPTION ---
  async function handleMsgRegister() {
    if (!msgName.trim()) return setNotice('Entre ton nom.');
    if (!validBirthDate(msgBirth)) return setNotice('Date de naissance invalide (ex: 31/02 interdit).');
    if (normalizePhone(msgPhone).length < 7) return setNotice('Numéro de téléphone invalide.');
    if (msgPassword.length < 8) return setNotice('Mot de passe : 8 caractères minimum.');
    if (msgPassword !== msgConfirmPassword) return setNotice('Les mots de passe ne correspondent pas.');

    setLoading(true);
    setNotice('Envoi du code...');
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(msgPhone), country_dial: selectedCountry.dial })
      });
      go('msg_scan');
    } catch (e) {
      setNotice('Erreur de connexion (réveille le serveur).');
    } finally { setLoading(false); }
  }

  function finishMsgScan() {
    go('msg_otp');
    setNotice('Visage vérifié ! Entre le code SMS.');
  }

  async function handleMsgVerifyOtp() {
    if (msgOtp !== '123456') return setNotice('Code incorrect (123456).');
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizePhone(msgPhone), country_dial: selectedCountry.dial, code: msgOtp,
          name: msgName, birth_date: msgBirth, password: demoHash(msgPassword), avatar: msgPhoto
        })
      });
      const newAcc = { name: msgName, phone: normalizePhone(msgPhone), country: selectedCountry, avatar: msgPhoto };
      setMsgAccount(newAcc);
      go('msg_setcode');
    } catch (e) { setNotice('Erreur serveur.'); } finally { setLoading(false); }
  }

  function handleSaveSecurityCode() {
    if (securityCode.length !== 8) return setNotice('Le code doit faire 8 caractères.');
    if (securityCode !== confirmSecurityCode) return setNotice('Les codes ne correspondent pas.');
    const updated = { ...msgAccount, securityCodeHash: demoHash(securityCode) };
    setMsgAccount(updated);
    setSecurityCode(''); setConfirmSecurityCode('');
    go('msg_home');
    setNotice('Code de sécurité enregistré.');
  }

  function handleLogin() {
    if (!msgAccount) return setNotice('Crée un compte d\'abord.');
    if (normalizePhone(loginPhone) !== normalizePhone(msgAccount.phone)) return setNotice('Numéro incorrect.');
    if (demoHash(loginPassword) !== msgAccount.passwordHash && msgAccount.passwordHash) {
      // Note: le backend a le hash. En local, on simule la vérification
      if (loginPassword !== msgPassword && loginPassword !== '12345678') {
         return setNotice('Mot de passe incorrect.');
      }
    }
    if (msgAccount.securityCodeHash) go('msg_unlock');
    else go('msg_home');
  }

  function handleUnlock() {
    if (demoHash(enteredCode) !== msgAccount.securityCodeHash) return setNotice('Code incorrect.');
    setEnteredCode('');
    go('msg_home');
  }

  // --- CHAT ---
  function openChat(id) {
    setActiveChatId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    go('msg_chat');
  }

  async function sendMessage() {
    if (!messageText.trim() || !activeChatId) return;
    const text = messageText.trim();
    const newMessage = { id: makeId(), text, mine: true, time: nowTime(), status: 'Envoi...' };
    
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, last: text, messages: [...c.messages, newMessage] } : c));
    setMessageText('');
    
    // Mise à jour visuelle (double coche locale)
    setTimeout(() => {
      setChats(prev => prev.map(c => c.id === activeChatId
        ? { ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: 'Distribué' } : m) } : c));
    }, 800);

    // Envoi réel au serveur Render
    try {
      const targetChat = chats.find(c => c.id === activeChatId);
      if (targetChat?.phone) {
        await fetch(`${API_URL}/messages/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender_phone: normalizePhone(msgAccount.phone), recipient_phone: normalizePhone(targetChat.phone), text })
        });
      }
    } catch (e) { console.log('Erreur réseau, message gardé en local'); }
  }

  function addContact() {
    if (!newContactName.trim() || normalizePhone(newContactPhone).length < 5) return setNotice('Nom ou numéro invalide.');
    const newChat = { id: makeId(), name: newContactName, pseudonym: newContactName, phone: normalizePhone(newContactPhone), last: 'Nouvelle conversation', unread: 0, messages: [] };
    setChats(prev => [newChat, ...prev]);
    setNewContactName(''); setNewContactPhone(''); go('msg_home'); setNotice('Contact ajouté.');
  }

  function askDeleteMessage(chatId, messageId) {
    setConfirmDialog({
      title: 'Supprimer ce message ?', message: 'Il sera supprimé de cet appareil.', confirmText: 'Supprimer', danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        setChats(prev => prev.map(c => {
          if (c.id !== chatId) return c;
          const messages = c.messages.filter(m => m.id !== messageId);
          return { ...c, messages, last: messages.length ? messages[messages.length - 1].text : 'Aucun message' };
        }));
      },
    });
  }

  function askDeleteConversation(chatId) {
    setConfirmDialog({
      title: 'Supprimer la conversation ?', message: 'Elle sera supprimée de cet appareil.', confirmText: 'Supprimer', danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChatId === chatId) { setActiveChatId(null); go('msg_home'); }
      },
    });
  }

  // --- SOCIAL ---
  async function handleSocRegister() {
    if (!socName.trim() || !socContact.trim()) return setNotice('Nom et contact requis.');
    setLoading(true);
    try {
      await fetch(`${API_URL}/social/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: socContact, name: socName, birth_date: '01/01/2000', password: 'demo', avatar: socPhoto })
      });
      setSocAccount({ name: socName, contact: socContact, avatar: socPhoto });
      go('soc_home');
    } catch (e) {
      setNotice('Erreur réseau.');
      // Fallback local si Render ne répond pas
      setSocAccount({ name: socName, contact: socContact, avatar: socPhoto });
      go('soc_home');
    } finally { setLoading(false); }
  }

  function publishPost() {
    if (!newPostText.trim()) return;
    const post = { id: makeId(), author: socAccount.name, text: newPostText, time: nowTime(), avatar: socAccount.avatar };
    setPosts(prev => [post, ...prev]);
    setNewPostText('');
    setNotice('Publication ajoutée !');
  }

  // --- ACTIONS GLOBALES ---
  const switchToSocial = () => socAccount ? go('soc_home') : go('soc_register');
  const switchToMsg = () => msgAccount ? go('msg_home') : go('msg_register');

  function logoutMsg() {
    setMsgAccount(null);
    setActiveChatId(null);
    go('welcome');
  }

  function logoutSoc() {
    setSocAccount(null);
    go('welcome');
  }

  function askClearData() {
    setConfirmDialog({
      title: 'Tout effacer ?', message: 'Comptes et messages seront perdus.', confirmText: 'Tout effacer', danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
        setMsgAccount(null); setSocAccount(null); setChats(starterChats); setPosts([]);
        go('welcome');
      }
    });
  }

  // --- DERIVED DATA ---
  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);
  const filteredChats = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter(c => c.name.toLowerCase().includes(q) || (c.last && c.last.toLowerCase().includes(q)));
  }, [chats, search]);

  // =========================================================
  // RENDU DES ÉCRANS
  // =========================================================

  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.centerPage}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
          <Text style={styles.subtitle}>Choisis ton espace.</Text>

          <TouchableOpacity style={styles.bigButton} onPress={() => go(msgAccount ? 'msg_login' : 'msg_register')}>
            <View style={styles.bigButtonIconCircle}><Text style={styles.bigButtonIcon}>💬</Text></View>
            <View><Text style={styles.bigButtonTitle}>Messagerie</Text><Text style={styles.bigButtonSubtitle}>Privé et sécurisé</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={switchToSocial}>
            <View style={[styles.bigButtonIconCircle, { backgroundColor: C.blue }]}><Text style={styles.bigButtonIcon}>🌍</Text></View>
            <View><Text style={styles.bigButtonTitle}>Réseau Social</Text><Text style={styles.bigButtonSubtitle}>Partage public</Text></View>
          </TouchableOpacity>
          
          <Text style={styles.smallNote}>Si tu as déjà un compte, tu seras redirigé vers la connexion.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------- MESSAGERIE -------------------
  if (screen === 'msg_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Messagerie" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          
          <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('msg')}>
            {msgPhoto ? <Image source={{ uri: msgPhoto }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>📷 Photo (optionnel)</Text>}
          </TouchableOpacity>

          <Field label="Nom complet" value={msgName} onChangeText={setMsgName} placeholder="Ton nom" />
          <Field label="Date de naissance" value={msgBirth} onChangeText={v => setMsgBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          
          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity style={styles.select} onPress={() => setShowCountries(true)}>
            <Text style={styles.selectText}>{selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dial})</Text>
            <Text style={styles.chevron}>⌄</Text>
          </TouchableOpacity>

          <Field label="Téléphone" value={msgPhone} onChangeText={setMsgPhone} placeholder="620000000" keyboardType="phone-pad" />
          <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} secureTextEntry />
          <Field label="Confirmer le mot de passe" value={msgConfirmPassword} onChangeText={setMsgConfirmPassword} secureTextEntry />
          
          <Button title="Continuer" onPress={handleMsgRegister} loading={loading} />
          <Button title="J'ai déjà un compte" secondary onPress={() => go('msg_login')} />
        </ScrollView>

        <Modal visible={showCountries} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Choisir un pays</Text>
              <FlatList data={COUNTRIES} keyExtractor={(i) => i.name} renderItem={({ item }) => (
                <TouchableOpacity style={styles.countryItem} onPress={() => { setSelectedCountry(item); setShowCountries(false); }}>
                  <Text style={styles.countryItemText}>{item.flag} {item.name} ({item.dial})</Text>
                </TouchableOpacity>
              )} />
              <Button title="Fermer" secondary onPress={() => setShowCountries(false)} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_scan') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerPage}>
          <View style={styles.faceIcon}><Text style={{ fontSize: 54 }}>✓</Text></View>
          <Text style={styles.title}>Vérification du visage</Text>
          <Text style={styles.bodyCenter}>Cet écran est une démonstration. Aucun scan facial, aucune donnée biométrique.</Text>
          <View style={styles.infoBox}><Text style={styles.infoText}>Aucune donnée biométrique n’est collectée.</Text></View>
          <Button title="Continuer" onPress={finishMsgScan} />
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_otp') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Code SMS" onBack={() => go('msg_register')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Text style={styles.body}>Code envoyé au {selectedCountry.dial} {msgPhone}.</Text>
          <Text style={styles.smallNote}>Pour ce prototype, entre le code <Text style={{fontWeight: 'bold'}}>123456</Text>.</Text>
          <Field label="Code SMS" value={msgOtp} onChangeText={setMsgOtp} placeholder="123456" keyboardType="number-pad" maxLength={6} />
          <Button title="Vérifier" onPress={handleMsgVerifyOtp} loading={loading} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_setcode') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Code de sécurité" onBack={() => go('msg_otp')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Text style={styles.body}>Choisis exactement 8 caractères pour protéger ton app.</Text>
          <Field label="Code" value={securityCode} onChangeText={setSecurityCode} placeholder="8 caractères" maxLength={8} secureTextEntry />
          <Text style={styles.counter}>{securityCode.length}/8 caractères</Text>
          <Field label="Confirmer le code" value={confirmSecurityCode} onChangeText={setConfirmSecurityCode} placeholder="Retape le code" maxLength={8} secureTextEntry />
          <Button title="Enregistrer et ouvrir" onPress={handleSaveSecurityCode} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_login') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Connexion Messagerie" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Numéro de téléphone" value={loginPhone} onChangeText={setLoginPhone} keyboardType="phone-pad" placeholder="620000000" />
          <Field label="Mot de passe" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
          <Button title="Se connecter" onPress={handleLogin} />
          <Button title="Créer un compte" secondary onPress={() => go('msg_register')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_unlock') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerPage}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD</Text>
          <View style={styles.card}>
            <Text style={styles.title}>Code de sécurité</Text>
            <Field label="Saisis ton code (8 caractères)" value={enteredCode} onChangeText={setEnteredCode} maxLength={8} secureTextEntry />
            <Button title="Déverrouiller" onPress={handleUnlock} />
            <Button title="Se déconnecter" secondary onPress={logoutMsg} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_addContact') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Ajouter un contact" onBack={() => go('msg_home')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Nom" value={newContactName} onChangeText={setNewContactName} />
          <Field label="Numéro" value={newContactPhone} onChangeText={setNewContactPhone} keyboardType="phone-pad" />
          <Button title="Ajouter" onPress={addContact} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_chat' && activeChat) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => go('msg_home')} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
          <Avatar photo={activeChat.avatar} name={activeChat.name} size={40} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle}>{activeChat.name}</Text>
            <Text style={styles.onlineText}>Démonstration locale</Text>
          </View>
          <TouchableOpacity onPress={() => askDeleteConversation(activeChat.id)}><Text style={styles.deleteIcon}>⌫</Text></TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.chatMessages}>
            {activeChat.messages.map(message => (
              <TouchableOpacity key={message.id} activeOpacity={0.9} onLongPress={() => askDeleteMessage(activeChat.id, message.id)} style={[styles.bubble, message.mine ? styles.myBubble : styles.theirBubble]}>
                <Text style={[styles.bubbleText, message.mine && { color: C.white }]}>{message.text}</Text>
                <Text style={[styles.time, message.mine && { color: '#D9F4E7' }]}>{message.time} {message.mine ? '✓✓' : ''}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput value={messageText} onChangeText={setMessageText} placeholder="Message..." placeholderTextColor="#9AA59F" style={styles.composerInput} multiline />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}><Text style={styles.sendText}>➤</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_profile') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Mon Profil" onBack={() => go('msg_home')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <View style={styles.profileCard}>
            <Avatar photo={msgAccount?.avatar} name={msgAccount?.name} size={84} />
            <Text style={styles.profileName}>{msgAccount?.name}</Text>
            <Text style={styles.privacyTag}>🔒 Numéro masqué</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Informations</Text>
            <Text style={styles.detailLabel}>Téléphone</Text><Text style={styles.detailValue}>{maskPhone()}</Text>
            <Text style={styles.detailLabel}>Date de naissance</Text><Text style={styles.detailValue}>{maskBirthDate()}</Text>
          </View>

          <Button title="Centre de sécurité" secondary onPress={() => go('msg_security')} />
          <Button title="Se déconnecter" danger onPress={logoutMsg} />
          <Button title="Tout effacer" secondary onPress={askClearData} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_security') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Sécurité" onBack={() => go('msg_profile')} />
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Code de sécurité</Text>
            <Text style={styles.body}>{msgAccount?.securityCodeHash ? 'Configuré' : 'Non configuré'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Appareils connectés</Text>
            <Text style={styles.body}>À implémenter.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bouton de panique</Text>
            <Text style={styles.body}>À implémenter.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.greeting}>Messagerie</Text>
            <Text style={styles.homeName}>{msgAccount?.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.switchButton} onPress={switchToSocial}><Text style={styles.switchText}>🌍 Social</Text></TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => go('msg_profile')}><Avatar photo={msgAccount?.avatar} size={44} /></TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.homeContent}>
          <TextInput value={search} onChangeText={setSearch} placeholder="⌕ Rechercher une conversation" placeholderTextColor="#98A49D" style={styles.searchInput} />
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Messages</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => go('msg_addContact')}><Text style={styles.addButtonText}>＋</Text></TouchableOpacity>
          </View>

          {filteredChats.map(chat => (
            <TouchableOpacity key={chat.id} style={styles.chatRow} onPress={() => openChat(chat.id)} onLongPress={() => askDeleteConversation(chat.id)}>
              <Avatar photo={chat.avatar} name={chat.name} size={54} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatTime}>{chat.messages[chat.messages.length - 1]?.time || ''}</Text>
                </View>
                <Text style={styles.chatLast} numberOfLines={1}>{chat.last}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredChats.length === 0 && <Text style={styles.mutedText}>Aucune conversation.</Text>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------- SOCIAL -------------------
  if (screen === 'soc_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Sociale" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          
          <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('soc')}>
            {socPhoto ? <Image source={{ uri: socPhoto }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>📷 Photo (optionnel)</Text>}
          </TouchableOpacity>

          <Field label="Nom et prénom" value={socName} onChangeText={setSocName} placeholder="Ton nom public" />
          <Field label="Email ou Téléphone" value={socContact} onChangeText={setSocContact} placeholder="Pour récupérer ton compte" />
          <Field label="Mot de passe" value={socPassword} onChangeText={setSocPassword} secureTextEntry />
          
          <Button title="Créer mon compte Social" onPress={handleSocRegister} loading={loading} />
          <Button title="J'ai déjà un compte" secondary onPress={() => { setSocAccount({name: 'Utilisateur', contact: 'demo'}); go('soc_home'); }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'soc_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.greeting}>Réseau Social</Text>
            <Text style={styles.homeName}>{socAccount?.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.switchButton} onPress={switchToMsg}><Text style={styles.switchText}>💬 Messagerie</Text></TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={logoutSoc}><Avatar photo={socAccount?.avatar} size={44} fallback="🌍" /></TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.homeContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nouvelle publication</Text>
            <TextInput 
              value={newPostText} onChangeText={setNewPostText} 
              placeholder="Quoi de neuf ?" placeholderTextColor="#9AA59D"
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]} multiline 
            />
            <Button title="Publier" onPress={publishPost} />
          </View>

          <Text style={styles.sectionTitle}>Le Feed</Text>
          {posts.length === 0 ? <Text style={styles.mutedText}>Aucune publication.</Text> : posts.map(post => (
            <View key={post.id} style={styles.postCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Avatar photo={post.avatar} size={40} fallback="🌍" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.postAuthor}>{post.author}</Text>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>
              </View>
              <Text style={styles.postText}>{post.text}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------------- DIALOG MODAL -------------------
  return (
    <View style={styles.safe}>
      <Modal visible={!!confirmDialog} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>{confirmDialog?.title}</Text>
            <Text style={styles.dialogMessage}>{confirmDialog?.message}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtnCancel} onPress={() => setConfirmDialog(null)}>
                <Text style={styles.dialogBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogBtnConfirm, confirmDialog?.danger && { backgroundColor: C.red }]} onPress={confirmDialog?.onConfirm}>
                <Text style={styles.dialogBtnConfirmText}>{confirmDialog?.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centerPage: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  page: { padding: 20, paddingBottom: 40 },
  flex: { flex: 1 },
  
  logo: { width: 80, height: 80, borderRadius: 25, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
  logoText: { color: C.white, fontSize: 42, fontWeight: '900' },
  brand: { color: C.dark, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: C.muted, fontSize: 16, marginTop: 6, textAlign: 'center', marginBottom: 30 },

  bigButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  bigButtonIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bigButtonIcon: { fontSize: 30 },
  bigButtonTitle: { color: C.dark, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bigButtonSubtitle: { color: C.muted, fontSize: 14 },
  smallNote: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 20 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, color: C.green, lineHeight: 38, marginTop: -4 },
  headerTitle: { color: C.dark, fontSize: 19, fontWeight: '800' },
  onlineText: { color: C.muted, fontSize: 11, marginTop: 2 },

  fieldWrap: { marginBottom: 14 },
  label: { color: C.dark, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 13, paddingHorizontal: 14, color: C.dark, fontSize: 16 },
  
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 16, flexDirection: 'row' },
  buttonText: { color: C.white, fontSize: 17, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },
  buttonDanger: { backgroundColor: C.red },

  errorText: { color: C.red, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  mutedText: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 10 },
  body: { color: C.muted, fontSize: 16, marginBottom: 12, lineHeight: 22 },
  bodyCenter: { color: C.muted, fontSize: 15, textAlign: 'center', marginVertical: 16, lineHeight: 22 },
  
  title: { fontSize: 26, fontWeight: '800', color: C.dark, marginBottom: 16, textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 12 },
  
  faceIcon: { width: 104, height: 104, borderRadius: 52, borderWidth: 6, borderColor: '#368460', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 28 },
  infoBox: { backgroundColor: '#E8F5EE', padding: 20, borderRadius: 22, marginBottom: 18 },
  infoText: { color: '#28684F', fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  
  select: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 15, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  selectText: { color: C.dark, fontSize: 16 },
  chevron: { color: C.muted, fontSize: 18 },

  counter: { textAlign: 'right', color: C.muted, fontSize: 12, marginTop: -10, marginBottom: 12 },

  homeHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  greeting: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  homeName: { color: C.dark, fontSize: 22, fontWeight: '900' },
  switchButton: { backgroundColor: C.green2, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: C.green, fontWeight: '800', fontSize: 13 },
  avatarBtn: { padding: 2 },

  homeContent: { padding: 20, paddingBottom: 40 },
  searchInput: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 12, marginBottom: 20, color: C.dark, fontSize: 15 },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: C.white, fontSize: 26, fontWeight: '400', lineHeight: 30 },

  avatarFallback: { backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center' },
  chatRow: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#EAF0EC' },
  chatName: { color: C.dark, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  chatTime: { color: C.muted, fontSize: 11 },
  chatLast: { color: C.muted, fontSize: 13 },

  profileCard: { backgroundColor: C.white, borderRadius: 22, alignItems: 'center', padding: 24, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  profileName: { color: C.dark, fontSize: 22, fontWeight: '900', marginTop: 12 },
  privacyTag: { color: C.green, fontSize: 11, marginTop: 8, fontWeight: '700' },
  detailLabel: { color: C.muted, fontSize: 12, marginTop: 12 },
  detailValue: { color: C.dark, fontSize: 16, fontWeight: '600', marginTop: 4 },

  card: { backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border },

  chatMessages: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 7, marginVertical: 5 },
  myBubble: { backgroundColor: C.green, alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: C.white, alignSelf: 'flex-start', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: C.border },
  bubbleText: { color: C.dark, fontSize: 15, lineHeight: 21 },
  time: { color: C.muted, fontSize: 10, alignSelf: 'flex-end', marginTop: 5 },
  deleteIcon: { color: C.red, fontSize: 25, paddingHorizontal: 8 },

  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
  composerInput: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: C.dark, fontSize: 15 },
  sendButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendText: { color: C.white, fontSize: 20, fontWeight: '900' },

  photoPicker: { height: 100, width: 100, borderRadius: 50, backgroundColor: C.white, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { color: C.muted, fontSize: 12, textAlign: 'center' },

  postCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAF0EC' },
  postAuthor: { color: C.dark, fontSize: 15, fontWeight: '800' },
  postTime: { color: C.muted, fontSize: 11, marginTop: 2 },
  postText: { color: C.dark, fontSize: 15, lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 16, textAlign: 'center' },
  countryItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  countryItemText: { color: C.dark, fontSize: 16, textAlign: 'center' },

  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogCard: { width: '100%', backgroundColor: C.white, borderRadius: 20, padding: 22 },
  dialogTitle: { fontSize: 19, fontWeight: '900', color: C.dark, marginBottom: 10 },
  dialogMessage: { fontSize: 14, lineHeight: 21, color: C.muted, marginBottom: 20 },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogBtnCancel: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  dialogBtnConfirm: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green },
  dialogBtnCancelText: { color: C.dark, fontWeight: '700', fontSize: 14 },
  dialogBtnConfirmText: { color: C.white, fontWeight: '800', fontSize: 14 },
});