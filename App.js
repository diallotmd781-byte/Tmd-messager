import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Modal, Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tmd_messenger_v4';
const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
  yellow: '#FFF0D6',
};

const COUNTRIES = [
  { name: 'Guinée', dial: '+224' }, { name: 'France', dial: '+33' },
  { name: 'Belgique', dial: '+32' }, { name: 'Sénégal', dial: '+221' },
  { name: 'Côte d’Ivoire', dial: '+225' }, { name: 'Mali', dial: '+223' },
];

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
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

function maskPhone() { return '•• •• •• ••'; }
function maskBirthDate() { return '••/••/••••'; }

function formatDate(value) {
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

/* COMPOSANTS */
function Button({ title, onPress, secondary = false, danger = false }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}
      style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
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

export default function App() {
  const [screen, setScreen] = useState('welcome'); 
  const [notice, setNotice] = useState('');
  
  // ÉTATS MESSAGERIE
  const [savedAccount, setSavedAccount] = useState(null);
  const [account, setAccount] = useState(null);
  const [chats, setChats] = useState(starterChats);
  const [activeChatId, setActiveChatId] = useState(null);
  const [tab, setTab] = useState('messages'); // 'messages' | 'profile'
  
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [confirmSecurityCode, setConfirmSecurityCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // ÉTATS SOCIAL (Simulation)
  const [socialAccount, setSocialAccount] = useState(null);
  const [socialName, setSocialName] = useState('');
  const [socialBirth, setSocialBirth] = useState('');
  const [socialContact, setSocialContact] = useState('');
  const [socialPassword, setSocialPassword] = useState('');

  useEffect(() => { loadSavedData(); }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return function () => clearTimeout(timer);
  register }, [notice]);

  async() function loadSavedData() {
    try {
 {
      const raw = await AsyncStorage.getItem(   STORAGE_KEY);
      if ( ifraw) {
        const data = JSON.parse(raw);
        if (data.savedAccount) setSavedAccount(data.savedAccount);
        if (Array.isArray(data.chats)) setChats(data.chats);
      }
    } catch (err) { console.log('Erreur de lecture :', err); }
  }

  function go(next) { Keyboard.dismiss(); setNotice(''); setScreen(next); }

  // --- MESSAGERIE ---
  async (!fullName.trim() || !validBirthDate(birthDate) || normalizePhone(phone).length < 5 || password.length < 8 || password !== confirmPassword) {
      return setNotice('Vérifie tes informations.');
    }
    setNotice('Envoi du code...');
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), country_dial: country.dial })
      });
      go('verifyOtp');
    } catch (error) { setNotice('Erreur de connexion.'); }
  }

  async function verifyOtp() {
    if (otpCode !== '123456') return setNotice('Code incorrect (utilise 123456).');
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), country_dial: country.dial, code: otpCode, name: fullName, birth_date: birthDate, password: demoHash(password) })
      });
      if (res.ok) {
        const newAccount = { fullName: fullName.trim(), birthDate, country, phone: normalizePhone(phone), passwordHash: demoHash(password) };
        setSavedAccount(newAccount); setAccount(newAccount); setPseudonym(fullName.split(' ')[0]);
        go('face');
      }
    } catch (error) { setNotice('Erreur serveur.'); }
  }

  function finishFaceDemo() { go('setcode'); }

  function saveSecurityCode() {
    if (securityCode.length !== 8 || securityCode !== confirmSecurityCode) return setNotice('Code invalide.');
    const updated = { ...account, securityCodeHash: demoHash(securityCode) };
    setAccount(updated); setSavedAccount(updated);
    go('home');
  }

  function unlock() {
    if (demoHash(enteredCode) !== account?.securityCodeHash) return setNotice('Code incorrect.');
    go('home');
  }

  function login() {
    if (!savedAccount) return setNotice('Aucun compte.');
    if (normalizePhone(loginPhone) !== normalizePhone(savedAccount.phone) || demoHash(loginPassword) !== savedAccount.passwordHash) return setNotice('Identifiants incorrects.');
    setAccount(savedAccount);
    go(savedAccount.securityCodeHash ? 'unlock' : 'home');
  }

  // --- CHAT ---
  function openChat(id) {
    setActiveChatId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    go('chat');
  }

  async function sendMessage() {
    if (!messageText.trim() || !activeChatId) return;
    const text = messageText.trim();
    const newMessage = { id: makeId(), text, mine: true, time: nowTime(), status: 'Envoi...' };
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, last: text, messages: [...c.messages, newMessage] } : c));
    setMessageText('');
    
    // Simulation d'envoi pour le statut double coche
    setTimeout(() => {
      setChats(prev => prev.map(c => c.id === activeChatId
        ? { ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: 'Distribué' } : m) } : c));
    }, 800);
  }

  function addContact() {
    if (!newContactName.trim() || newContactPhone.length < 5) return setNotice('Infos invalides.');
    const newChat = { id: makeId(), name: newContactName, pseudonym: newContactName, phone: newContactPhone, last: 'Nouvelle conversation', unread: 0, messages: [] };
    setChats(prev => [newChat, ...prev]);
    setNewContactName(''); setNewContactPhone(''); go('home'); setNotice('Contact ajouté !');
  }

  function logout() {
    setAccount(null); setActiveChatId(null); setLoginPhone(''); setLoginPassword('');
    go('welcome');
  }

  // --- SOCIAL ---
  async function registerSocial() {
    if (!socialName.trim() || !socialContact.trim() || !socialPassword) return setNotice('Remplis tous les champs.');
    setNotice('Vérification du visage...');
    setTimeout(() => {
      setSocialAccount({ name: socialName, contact: socialContact });
      go('soc_home');
    }, 1500);
  }

  // --- PASSERELLE ---
  function toSocial() {
    if (socialAccount) go('soc_home');
    else go('soc_register');
  }
  function toMessaging() {
    if (account) go('home');
    else go('login');
  }

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);
  const filteredChats = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter(c => c.name.toLowerCase().includes(q) || c.last.toLowerCase().includes(q));
  }, [chats, search]);

  // =========================================================
  // ÉCRANS
  // =========================================================

  // NOUVEL ÉCRAN D'ACCUEIL (Choix)
  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
          <Text style={styles.subtitle}>Choisis ton espace.</Text>
        </View>
        <View style={styles.welcomeCard}>
          <TouchableOpacity style={styles.bigButton} onPress={() => go(account ? 'home' : 'login')}>
            <View style={styles.bigButtonIconCircle}><Text style={styles.bigButtonIcon}>💬</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Messagerie</Text>
              <Text style={styles.bigButtonSubtitle}>Discussions privées</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={toSocial}>
            <View style={[styles.bigButtonIconCircle, { backgroundColor: '#EAF2FF' }]}><Text style={styles.bigButtonIcon}>🌍</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Réseau Social</Text>
              <Text style={styles.bigButtonSubtitle}>Partage public</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- MESSAGERIE (Inscription) ---
  if (screen === 'register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Créer un compte" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Nom complet" value={fullName} onChangeText={setFullName} placeholder="Ex. TMD Diallo" />
          <Field label="Date de naissance" value={birthDate} onChangeText={v => setBirthDate(formatDate(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity style={styles.select} onPress={() => {}}>
            <Text style={styles.selectText}>{country.name} ({country.dial})</Text>
          </TouchableOpacity>
          <Field label="Téléphone" value={phone} onChangeText={setPhone} placeholder="620000000" keyboardType="phone-pad" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
          <Field label="Confirmer" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          <Button title="Continuer" onPress={register} />
          <Button title="Se connecter" secondary onPress={() => go('login')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'verifyOtp') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Code SMS" onBack={() => go('register')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Text style={styles.body}>Code envoyé au {phone}.</Text>
          <Field label="Code (123456)" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" maxLength={6} />
          <Button title="Vérifier" onPress={verifyOtp} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'face') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.faceHero}>
          <Text style={{ fontSize: 80 }}>🙂</Text>
          <Text style={styles.title}>Scan Visage</Text>
          <Button title="Terminer le scan" onPress={finishFaceDemo} />
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'setcode') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Code de sécurité" onBack={() => go('face')} />
        <ScrollView contentContainerStyle={styles.page}>
          <Field label="Code (8 caractères)" value={securityCode} onChangeText={setSecurityCode} maxLength={8} secureTextEntry />
          <Field label="Confirmer" value={confirmSecurityCode} onChangeText={setConfirmSecurityCode} maxLength={8} secureTextEntry />
          <Button title="Enregistrer et ouvrir" onPress={saveSecurityCode} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'unlock') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Text style={styles.brand}>TMD</Text>
        </View>
        <View style={styles.card}>
          <Field label="Saisis ton code" value={enteredCode} onChangeText={setEnteredCode} maxLength={8} secureTextEntry />
          <Button title="Déverrouiller" onPress={unlock} />
          <Button title="Déconnexion" secondary onPress={logout} />
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Connexion" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Téléphone" value={loginPhone} onChangeText={setLoginPhone} keyboardType="phone-pad" />
          <Field label="Mot de passe" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
          <Button title="Se connecter" onPress={login} />
          <Button title="Créer un compte" secondary onPress={() => go('register')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'addContact') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Nouveau contact" onBack={() => go('home')} />
        <ScrollView contentContainerStyle={styles.page}>
          <Field label="Nom" value={newContactName} onChangeText={setNewContactName} />
          <Field label="Numéro" value={newContactPhone} onChangeText={setNewContactPhone} keyboardType="phone-pad" />
          <Button title="Ajouter" onPress={addContact} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'chat' && activeChat) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => go('home')} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>{activeChat.name}</Text>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.chatMessages}>
            {activeChat.messages.map(m => (
              <View key={m.id} style={[styles.bubble, m.mine ? styles.myBubble : styles.theirBubble]}>
                <Text style={[styles.bubbleText, m.mine && { color: C.white }]}>{m.text}</Text>
                <Text style={[styles.time, m.mine && { color: '#D9F4E7' }]}>{m.time} {m.mine ? '✓' : ''}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput value={messageText} onChangeText={setMessageText} placeholder="Message..." style={styles.composerInput} />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}><Text style={styles.sendText}>➤</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- ACCUEIL MESSAGERIE ---
  if (screen === 'home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        <View style={styles.whatsappHeader}>
          <Text style={styles.whatsappTitle}>TMD Messenger</Text>
          <TouchableOpacity style={styles.switchButton} onPress={toSocial}><Text style={styles.switchText}>🌍 Social</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.chatList}>
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher..." style={styles.searchInput} />
          {filteredChats.map(chat => (
            <TouchableOpacity key={chat.id} style={styles.chatRow} onPress={() => openChat(chat.id)}>
              <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>{chat.name.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatLast}>{chat.last}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.fab} onPress={() => go('addContact')}><Text style={styles.fabText}>+</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- SOCIAL (Inscription) ---
  if (screen === 'soc_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Sociale" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Nom" value={socialName} onChangeText={setSocialName} />
          <Field label="Date de naissance" value={socialBirth} onChangeText={v => setSocialBirth(formatDate(v))} keyboardType="number-pad" maxLength={10} />
          <Field label="Email ou Téléphone" value={socialContact} onChangeText={setSocialContact} />
          <Field label="Mot de passe" value={socialPassword} onChangeText={setSocialPassword} secureTextEntry />
          <Button title="Créer mon compte Social" onPress={registerSocial} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- ACCUEIL SOCIAL ---
  if (screen === 'soc_home') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.instaHeader}>
          <Text style={styles.instaTitle}>TMD Social</Text>
          <TouchableOpacity style={styles.switchButton} onPress={toMessaging}><Text style={styles.switchText}>💬 Messagerie</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.feed}>
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}><Text style={styles.postAvatarText}>{socialAccount?.name?.charAt(0)}</Text></View>
              <Text style={styles.postAuthor}>{socialAccount?.name}</Text>
            </View>
            <Text style={styles.postText}>Bienvenue sur le réseau social TMD ! 🚀</Text>
            <View style={styles.postActions}>
              <Text style={styles.actionText}>❤️ J'aime</Text>
              <Text style={styles.actionText}>💬 Commenter</Text>
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.fab} onPress={() => setNotice('Publication (bientôt)')}><Text style={styles.fabText}>+</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { flexGrow: 1, padding: 20, paddingBottom: 34 },
  hero: { alignItems: 'center', paddingTop: 50, paddingBottom: 20 },
  logo: { width: 80, height: 80, borderRadius: 25, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: C.white, fontSize: 42, fontWeight: '900' },
  brand: { color: C.dark, fontSize: 28, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 16, marginTop: 6, textAlign: 'center' },
  
  welcomeCard: { padding: 20 },
  bigButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  bigButtonIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bigButtonIcon: { fontSize: 30 },
  bigButtonTitle: { color: C.dark, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bigButtonSubtitle: { color: C.muted, fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backText: { fontSize: 34, color: C.green, marginRight: 12, lineHeight: 38, marginTop: -4 },
  headerTitle: { color: C.dark, fontSize: 19, fontWeight: '800' },

  fieldWrap: { marginBottom: 14 },
  label: { color: C.dark, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 13, paddingHorizontal: 14, color: C.dark, fontSize: 16 },
  
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: C.white, fontSize: 17, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },

  faceHero: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: C.dark, fontSize: 26, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  body: { color: C.muted, fontSize: 16, marginBottom: 12 },
  bodyCenter: { color: C.muted, fontSize: 15, textAlign: 'center', marginBottom: 18 },

  select: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 15, marginBottom: 14 },
  selectText: { color: C.dark, fontSize: 16 },
  
  errorText: { color: C.red, fontSize: 13, textAlign: 'center', marginBottom: 10, fontWeight: '600' },

  whatsappHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  whatsappTitle: { fontSize: 24, fontWeight: '900', color: C.green },
  switchButton: { backgroundColor: C.green2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: C.green, fontWeight: '800', fontSize: 13 },
  chatList: { padding: 10 },
  searchInput: { backgroundColor: C.white, padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  chatRow: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: C.white, borderRadius: 12, marginBottom: 8 },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chatAvatarText: { color: C.green, fontSize: 20, fontWeight: '800' },
  chatName: { fontSize: 16, fontWeight: '700', color: C.dark },
  chatLast: { fontSize: 14, color: C.muted, marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  fabText: { color: C.white, fontSize: 30, fontWeight: '400', marginTop: -2 },

  instaHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  instaTitle: { fontSize: 24, fontWeight: '900', color: C.dark, fontStyle: 'italic' },
  feed: { padding: 10 },
  postCard: { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  postAvatarText: { color: C.green, fontWeight: '900' },
  postAuthor: { fontSize: 15, fontWeight: '700', color: C.dark },
  postText: { fontSize: 15, color: C.dark, lineHeight: 22 },
  postActions: { flexDirection: 'row', marginTop: 16, gap: 20 },
  actionText: { color: C.muted, fontSize: 14, fontWeight: '600' },

  chatMessages: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 7, marginVertical: 5 },
  myBubble: { backgroundColor: C.green, alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: C.white, alignSelf: 'flex-start', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: C.border },
  bubbleText: { color: C.dark, fontSize: 15, lineHeight: 21 },
  time: { color: C.muted, fontSize: 10, alignSelf: 'flex-end', marginTop: 5 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
  composerInput: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: C.dark, fontSize: 15 },
  sendButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendText: { color: C.white, fontSize: 21, fontWeight: '900' },
});