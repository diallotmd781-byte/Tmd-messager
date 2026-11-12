import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList, Keyboard, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
  blue: '#EAF2FF', blueDark: '#1DA1F2', chatBg: '#E5DDD5'
};

const COUNTRIES = [
  { name: 'Guinée', dial: '+224', flag: '🇬🇳' }, { name: 'France', dial: '+33', flag: '🇫🇷' },
  { name: 'Sénégal', dial: '+221', flag: '🇸🇳' }, { name: 'Côte d’Ivoire', dial: '+225', flag: '🇨🇮' },
  { name: 'Mali', dial: '+223', flag: '🇲🇱' }, { name: 'Canada', dial: '+1', flag: '🇨🇦' },
].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const normalizePhone = value => String(value || '').replace(/[\s()-]/g, '');

const demoHash = (input) => {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
};

const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const isValidDate = (dateStr) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
  const [day, month, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

function Field({ label, value, onChangeText, placeholder, isPassword = false, keyboardType = 'default', maxLength }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }]}>
        <TextInput 
          value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA59F" 
          secureTextEntry={isPassword && !showPassword} keyboardType={keyboardType} maxLength={maxLength}
          autoCapitalize="none" autoCorrect={false} style={{ flex: 1, paddingHorizontal: 14, color: C.dark, fontSize: 16, height: '100%' }} 
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 14 }}>
            <Text style={{ fontSize: 20 }}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 35 }} />
    </View>
  );
}

const SettingItem = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <Text style={{ fontSize: 24, marginRight: 15 }}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 16, color: C.dark, fontWeight: '600' }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{subtitle}</Text>}
    </View>
    <Text style={{ color: C.muted, fontSize: 20 }}>›</Text>
  </TouchableOpacity>
);

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  
  // --- MESSAGERIE ---
  const [account, setAccount] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [msgAvatar, setMsgAvatar] = useState('👤');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [msgName, setMsgName] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgBirth, setMsgBirth] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgOtp, setMsgOtp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // --- SOCIAL ---
  const [socialAccount, setSocialAccount] = useState(null);
  const [feed, setFeed] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [socName, setSocName] = useState('');
  const [socContact, setSocContact] = useState('');
  const [socPassword, setSocPassword] = useState('');
  const [socBirth, setSocBirth] = useState('');
  const [socAvatar, setSocAvatar] = useState('🌍');
  const [socChats, setSocChats] = useState([]);
  const [activeSocChatId, setActiveSocChatId] = useState(null);
  const [socNewMessageText, setSocNewMessageText] = useState('');
  const [socSearchName, setSocSearchName] = useState('');
  const [showNewSocChatModal, setShowNewSocChatModal] = useState(false);

  // --- LOGIN ---
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginContact, setLoginContact] = useState('');
  const [loginSocPassword, setLoginSocPassword] = useState('');

  useEffect(() => {
    async function loadSession() {
      try {
        const savedAccount = await AsyncStorage.getItem('@account');
        const savedSocial = await AsyncStorage.getItem('@socialAccount');
        if (savedAccount) setAccount(JSON.parse(savedAccount));
        if (savedSocial) setSocialAccount(JSON.parse(savedSocial));
      } catch (e) { console.log("Erreur session", e); }
      finally { setIsSessionLoaded(true); }
    }
    loadSession();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (screen === 'msg_home' && account) loadChats();
    if (screen === 'soc_home') loadFeed();
    if (screen === 'soc_chat_list' && socialAccount) loadSocChats();
  }, [screen, account, socialAccount]);

  function go(next) {
    if (next === 'msg_home' && !account) {
      setScreen('msg_login');
      setNotice("Tu dois d'abord créer ou te connecter à un compte Messagerie.");
      return;
    }
    if (next === 'soc_home' && !socialAccount) {
      setScreen('soc_login');
      setNotice("Tu dois d'abord créer ou te connecter à un compte Réseau Social.");
      return;
    }
    Keyboard.dismiss(); 
    setNotice(''); 
    setScreen(next);
  }

  async function saveAccount(acc) { setAccount(acc); await AsyncStorage.setItem('@account', JSON.stringify(acc)); }
  async function saveSocialAccount(acc) { setSocialAccount(acc); await AsyncStorage.setItem('@socialAccount', JSON.stringify(acc)); }
  async function logoutMessaging() { setAccount(null); await AsyncStorage.removeItem('@account'); setShowSettings(false); go('welcome'); }
  async function logoutSocial() { setSocialAccount(null); await AsyncStorage.removeItem('@socialAccount'); setShowSettings(false); go('welcome'); }

  function startFaceScan() {
    setIsScanning(true); setScanProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10; setScanProgress(progress);
      if (progress >= 100) { clearInterval(interval); setIsScanning(false); finalizeMsgRegistration(); }
    }, 300);
  }

  async function loadChats() {
    try {
      const res = await fetch(`${API_URL}/messages/chats/${normalizePhone(account.phone)}`);
      if (!res.ok) return;
      const data = await res.json();
      const grouped = {};
      data.forEach(msg => {
        const key = msg.other_phone;
        if (!grouped[key]) grouped[key] = { id: key, name: msg.other_name, phone: key, avatar: msg.other_avatar, messages: [] };
        grouped[key].messages.push({ id: msg.id.toString(), text: msg.text, mine: msg.mine, time: msg.time, status: msg.status });
      });
      setChats(Object.values(grouped));
    } catch (err) { console.log(err); }
  }

  async function sendMsgOtp() {
    if (!msgName.trim() || normalizePhone(msgPhone).length < 5 || !msgBirth || !msgPassword) return setNotice('Remplis toutes les informations.');
    if (!isValidDate(msgBirth)) return setNotice('Date invalide (JJ/MM/AAAA).');
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/auth/send-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: normalizePhone(msgPhone), country_dial: selectedCountry.dial }) });
      go('msg_otp');
    } catch (err) { setNotice("Erreur réseau."); } finally { setIsLoading(false); }
  }

  async function verifyMsgOtp() {
    if (msgOtp !== '123456') return setNotice('Code incorrect (123456).');
    go('msg_face_scan');
  }

  async function finalizeMsgRegistration() {
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(msgPhone), country_dial: selectedCountry.dial, code: '123456', name: msgName, birth_date: msgBirth, password: demoHash(msgPassword), avatar: msgAvatar })
      });
      const newAcc = { name: msgName, phone: normalizePhone(msgPhone), dial: selectedCountry.dial, avatar: msgAvatar };
      await saveAccount(newAcc); go('msg_home');
    } catch (err) { setNotice("Erreur finale."); } finally { setIsLoading(false); }
  }

  async function loginMessaging() {
    if (!loginPhone.trim() || !loginPassword.trim()) return setNotice('Entre ton numéro et ton mot de passe.');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ phone: normalizePhone(loginPhone), password: demoHash(loginPassword) }) 
      });
      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return setNotice(data.detail || "Erreur de connexion.");
      }
      const newAcc = { name: data.name, phone: data.phone, dial: data.country_dial, avatar: data.avatar };
      await saveAccount(newAcc); go('msg_home');
    } catch (err) { setNotice("Erreur réseau."); } finally { setIsLoading(false); }
  }

  function startNewChat() {
    if (!recipientPhone.trim()) return setNotice('Entre un numéro.');
    const phone = normalizePhone(recipientPhone);
    const existing = chats.find(c => c.phone === phone);
    if (existing) setActiveChatId(existing.id);
    else {
      setChats(prev => [{ id: phone, name: phone, phone: phone, avatar: '👤', messages: [] }, ...prev]);
      setActiveChatId(phone);
    }
    setRecipientPhone(''); setShowNewChatModal(false); go('msg_chat');
  }

  async function sendMessageToChat(recipient) {
    if (!newMessageText.trim()) return;
    const text = newMessageText.trim();
    const tempId = makeId();
    const newMsg = { id: tempId, text, mine: true, time: nowTime(), status: 'sending' };
    setChats(prev => prev.map(c => c.phone === recipient ? { ...c, messages: [...c.messages, newMsg] } : c));
    setNewMessageText('');
    try {
      const res = await fetch(`${API_URL}/messages/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_phone: normalizePhone(account.phone), recipient_phone: normalizePhone(recipient), text }) });
      if (!res.ok) { setChats(prev => prev.map(c => c.phone === recipient ? { ...c, messages: c.messages.map(m => m.id === tempId ? { ...m, status: 'failed' } : m) } : c)); return; }
      setChats(prev => prev.map(c => c.phone === recipient ? { ...c, messages: c.messages.map(m => m.id === tempId ? { ...m, status: 'sent' } : m) } : c));
    } catch (err) { setChats(prev => prev.map(c => c.phone === recipient ? { ...c, messages: c.messages.map(m => m.id === tempId ? { ...m, status: 'failed' } : m) } : c)); }
  }

  async function loadFeed() {
    try { const res = await fetch(`${API_URL}/social/feed`); setFeed(await res.json()); } catch (err) { console.log(err); }
  }

  async function registerSocial() {
    if (!socName || !socContact || !socPassword || !socBirth) return setNotice('Remplis tous les champs.');
    if (!isValidDate(socBirth)) return setNotice('Date invalide.');
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/social/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact: socContact, name: socName, birth_date: socBirth, password: demoHash(socPassword), avatar: socAvatar }) });
      const newSoc = { name: socName, contact: socContact, avatar: socAvatar };
      await saveSocialAccount(newSoc); go('soc_home');
    } catch (err) { setNotice("Erreur."); } finally { setIsLoading(false); }
  }

  async function loginSocial() {
    if (!loginContact.trim() || !loginSocPassword.trim()) return setNotice('Entre ton contact et ton mot de passe.');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/social/login`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contact: loginContact, password: demoHash(loginSocPassword) }) 
      });
      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return setNotice(data.detail || "Erreur de connexion.");
      }
      const newSoc = { name: data.name, contact: loginContact, avatar: data.avatar };
      await saveSocialAccount(newSoc); go('soc_home');
    } catch (err) { setNotice("Erreur réseau."); } finally { setIsLoading(false); }
  }

  async function publishPost() {
    if (!newPostText.trim() || !socialAccount) return;
    try {
      await fetch(`${API_URL}/social/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_contact: socialAccount.contact, text: newPostText }) });
      setNewPostText(''); loadFeed();
    } catch { setNotice('Erreur.'); }
  }

  async function loadSocChats() {
    try {
      const res = await fetch(`${API_URL}/social/messages/chats/${socialAccount.contact}`);
      if (!res.ok) return;
      const data = await res.json();
      const grouped = {};
      data.forEach(msg => {
        const key = msg.other_contact;
        if (!grouped[key]) grouped[key] = { id: key, name: msg.other_name, contact: key, avatar: msg.other_avatar, messages: [] };
        grouped[key].messages.push({ id: msg.id.toString(), text: msg.text, mine: msg.mine, time: msg.time });
      });
      setSocChats(Object.values(grouped));
    } catch (err) { console.log(err); }
  }

  async function searchAndStartSocChat() {
    if (!socSearchName.trim()) return setNotice('Entre un nom.');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/social/search/${encodeURIComponent(socSearchName)}`);
      if (!res.ok) { setIsLoading(false); return setNotice(`Aucun utilisateur trouvé.`); }
      const user = await res.json();
      if (user.contact === socialAccount.contact) { setIsLoading(false); return setNotice("Tu ne peux pas t'envoyer de message."); }
      const contactId = user.contact;
      const existing = socChats.find(c => c.contact === contactId);
      if (existing) setActiveSocChatId(existing.id);
      else {
        setSocChats(prev => [{ id: contactId, name: user.name, contact: contactId, avatar: user.avatar, messages: [] }, ...prev]);
        setActiveSocChatId(contactId);
      }
      setSocSearchName(''); setShowNewSocChatModal(false); go('soc_chat');
    } catch (err) { setNotice("Erreur."); } finally { setIsLoading(false); }
  }

  async function sendSocMessageToChat(recipient) {
    if (!socNewMessageText.trim()) return;
    const text = socNewMessageText.trim();
    const newMsg = { id: makeId(), text, mine: true, time: nowTime() };
    setSocChats(prev => prev.map(c => c.contact === recipient ? { ...c, messages: [...c.messages, newMsg] } : c));
    setSocNewMessageText('');
    try { await fetch(`${API_URL}/social/messages/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_contact: socialAccount.contact, recipient_contact: recipient, text }) }); } catch { console.log('Erreur DM'); }
  }

  // ==========================================
  // PARAMÈTRES MESSAGERIE (Style WhatsApp)
  // ==========================================
  const MsgSettingsModal = () => {
    if (!account) return null;
    return (
      <Modal visible={showSettings} animationType="slide">
        <SafeAreaView style={styles.safe}>
          <View style={styles.appHeader}>
            <Text style={[styles.appTitle, { color: C.green }]}>Paramètres</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={{ fontSize: 30, color: C.dark, marginTop: -5 }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={[styles.chatAvatar, { width: 70, height: 70, borderRadius: 35 }]}>
                <Text style={{ fontSize: 40 }}>{account.avatar || '👤'}</Text>
              </View>
              <View style={{ marginLeft: 15 }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: C.dark }}>{account.name}</Text>
                <Text style={{ fontSize: 14, color: C.muted, marginTop: 5 }}>{account.phone}</Text>
              </View>
            </View>
            <View style={{ padding: 10 }}>
              <SettingItem icon="👤" title="Profil" subtitle="Ton nom, ton avatar" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="🔒" title="Confidentialité" subtitle="Bloqués, codes de sécurité" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="🔔" title="Notifications" subtitle="Messages, groupes, sons" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="💾" title="Stockage et données" subtitle="Utilisation du réseau" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="ℹ️" title="Aide et support" subtitle="Centre d'aide, contact" onPress={() => setNotice("Bientôt disponible !")} />
            </View>
            <TouchableOpacity style={{ margin: 20, backgroundColor: '#FFF0F0', padding: 15, borderRadius: 10, alignItems: 'center' }} onPress={logoutMessaging}>
              <Text style={{ color: C.red, fontSize: 16, fontWeight: 'bold' }}>Se déconnecter 🚪</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // PARAMÈTRES SOCIAL (Style Instagram / Twitter)
  // ==========================================
  const SocSettingsModal = () => {
    if (!socialAccount) return null;
    return (
      <Modal visible={showSettings} animationType="slide">
        <SafeAreaView style={styles.safe}>
          <View style={styles.appHeader}>
            <Text style={[styles.appTitle, { color: C.blueDark }]}>Paramètres</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={{ fontSize: 30, color: C.dark, marginTop: -5 }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={[styles.chatAvatar, { width: 70, height: 70, borderRadius: 35, backgroundColor: C.blue }]}>
                <Text style={{ fontSize: 40 }}>{socialAccount.avatar || '🌍'}</Text>
              </View>
              <View style={{ marginLeft: 15 }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: C.dark }}>{socialAccount.name}</Text>
                <Text style={{ fontSize: 14, color: C.muted, marginTop: 5 }}>Contact privé : {socialAccount.contact}</Text>
              </View>
            </View>
            <View style={{ padding: 10 }}>
              <SettingItem icon="👤" title="Mon compte" subtitle="Modifier mon profil public" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="🔒" title="Confidentialité" subtitle="Qui peut voir mes publications" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="🛡️" title="Sécurité" subtitle="Mot de passe, appareils connectés" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="🔔" title="Notifications" subtitle="Likes, commentaires, messages" onPress={() => setNotice("Bientôt disponible !")} />
              <SettingItem icon="ℹ️" title="À propos" subtitle="Version de l'application" onPress={() => setNotice("Bientôt disponible !")} />
            </View>
            <TouchableOpacity style={{ margin: 20, backgroundColor: '#FFF0F0', padding: 15, borderRadius: 10, alignItems: 'center' }} onPress={logoutSocial}>
              <Text style={{ color: C.red, fontSize: 16, fontWeight: 'bold' }}>Se déconnecter 🚪</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // ÉCRAN DE CHARGEMENT
  // ==========================================
  if (!isSessionLoaded) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.green} />
        <Text style={{ marginTop: 15, color: C.muted, fontSize: 16 }}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  // ==========================================
  // INTERFACES
  // ==========================================
  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}><View style={styles.logo}><Text style={styles.logoText}>T</Text></View><Text style={styles.brand}>TMD Messenger</Text></View>
        <View style={styles.welcomeCard}>
          
          <TouchableOpacity style={styles.bigButton} onPress={() => go('msg_home')}>
            <View style={styles.bigButtonIconCircle}><Text style={styles.bigButtonIcon}>💬</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Messagerie</Text>
              <Text style={styles.bigButtonSubtitle}>{account ? `Connecté: ${account.name}` : "Appuie pour te connecter"}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={() => go('soc_home')}>
            <View style={[styles.bigButtonIconCircle, { backgroundColor: C.blue }]}><Text style={styles.bigButtonIcon}>🌍</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Réseau Social</Text>
              <Text style={styles.bigButtonSubtitle}>{socialAccount ? `Connecté: ${socialAccount.name}` : "Appuie pour te connecter"}</Text>
            </View>
          </TouchableOpacity>
          
        </View>
      </SafeAreaView>
    );
  }

  // --- CONNEXION MESSAGERIE ---
  if (screen === 'msg_login') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Connexion Messagerie" onBack={() => go('welcome')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
            <Field label="Numéro de téléphone" value={loginPhone} onChangeText={setLoginPhone} placeholder="620000000" keyboardType="phone-pad" />
            <Field label="Mot de passe" value={loginPassword} onChangeText={setLoginPassword} isPassword={true} placeholder="Ton mot de passe" />
            <TouchableOpacity style={[styles.button, { marginBottom: 20 }]} onPress={loginMessaging}>
              <Text style={styles.buttonText}>{isLoading ? "Connexion..." : "Se connecter"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: C.green2 }]} onPress={() => go('msg_register')}>
              <Text style={[styles.buttonText, { color: C.green }]}>Créer un compte</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- INSCRIPTION MESSAGERIE ---
  if (screen === 'msg_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Messagerie" onBack={() => go('msg_login')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
            <Text style={styles.label}>Photo de profil</Text>
            <View style={styles.avatarRow}>
              {['👤', '😎', '👩', '🧑', '🦁'].map(a => (
                <TouchableOpacity key={a} style={[styles.avatarOption, msgAvatar === a && styles.avatarOptionSelected]} onPress={() => setMsgAvatar(a)}><Text style={styles.avatarOptionText}>{a}</Text></TouchableOpacity>
              ))}
            </View>
            <Field label="Nom complet" value={msgName} onChangeText={setMsgName} placeholder="Ton nom" />
            <Text style={styles.label}>Pays</Text>
            <TouchableOpacity style={styles.select} onPress={() => setShowCountries(true)}><Text style={styles.selectText}>{selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dial})</Text></TouchableOpacity>
            <Field label="Numéro de téléphone" value={msgPhone} onChangeText={setMsgPhone} placeholder="620000000" keyboardType="phone-pad" />
            <Field label="Date de naissance" value={msgBirth} onChangeText={v => setMsgBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
            <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} isPassword={true} />
            <TouchableOpacity style={[styles.button, { marginBottom: 40 }]} onPress={sendMsgOtp}>
              <Text style={styles.buttonText}>{isLoading ? "Chargement..." : "Continuer"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
        
        <Modal visible={showCountries} transparent animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.modalCard}>
            <FlatList data={COUNTRIES} keyExtractor={(i) => i.name} renderItem={({ item }) => (
              <TouchableOpacity style={styles.countryItem} onPress={() => { setSelectedCountry(item); setShowCountries(false); }}><Text style={styles.countryItemText}>{item.flag} {item.name} ({item.dial})</Text></TouchableOpacity>
            )}/>
          </View></View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_otp') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Code SMS" onBack={() => go('msg_register')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.page}>
            <Field label="Code (123456)" value={msgOtp} onChangeText={setMsgOtp} placeholder="123456" keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={[styles.button, { marginBottom: 40 }]} onPress={verifyMsgOtp}><Text style={styles.buttonText}>Vérifier</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_face_scan') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: '#000' }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.white, fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Vérification de présence</Text>
          <View style={{ width: 250, height: 250, borderRadius: 125, borderWidth: 4, borderColor: isScanning ? C.green : C.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            {isScanning && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(23, 107, 80, 0.3)' }} />}
            <Text style={{ fontSize: 80 }}>🧑</Text>
            {isScanning && <Text style={{ position: 'absolute', bottom: 20, color: C.white, fontWeight: 'bold' }}>{scanProgress}%</Text>}
          </View>
          <TouchableOpacity style={[styles.button, { width: 250, marginTop: 50, backgroundColor: isScanning ? C.muted : C.green }]} onPress={startFaceScan} disabled={isScanning}>
            <Text style={styles.buttonText}>{isScanning ? "Scan en cours..." : "Démarrer le scan"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- ACCUEIL MESSAGERIE ---
  if (screen === 'msg_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        
        <View style={styles.appHeader}>
          <Text style={styles.appTitle}>TMD</Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <TouchableOpacity onPress={() => go('soc_home')}>
              <Text style={{ fontSize: 24 }}>🌍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNewChatModal(true)}>
              <Text style={{ fontSize: 24 }}>📝</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={chats} keyExtractor={item => item.id} contentContainerStyle={{ padding: 10 }}
          ListEmptyComponent={<Text style={styles.bodyCenter}>Aucune discussion.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatRow} onPress={() => { setActiveChatId(item.id); go('msg_chat'); }}>
              <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>{item.avatar || '👤'}</Text></View>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: C.bg, paddingBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.chatName}>{item.name}</Text><Text style={{ fontSize: 12, color: C.muted }}>{item.messages.length > 0 ? item.messages[item.messages.length - 1].time : ''}</Text></View>
                <Text style={styles.chatLast} numberOfLines={1}>{item.messages.length > 0 ? item.messages[item.messages.length - 1].text : 'Nouvelle discussion'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        <View style={styles.bottomBar}>
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setShowSettings(true)}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
            <Text style={{ fontSize: 10, color: C.muted }}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showNewChatModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { borderRadius: 20, margin: 20 }]}>
              <Text style={styles.modalTitle}>Nouveau message</Text>
              <Field label="Numéro" value={recipientPhone} onChangeText={setRecipientPhone} placeholder="Ex: 611085739" keyboardType="phone-pad" />
              <TouchableOpacity style={styles.button} onPress={startNewChat}><Text style={styles.buttonText}>Discuter</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'transparent', marginTop: 5 }]} onPress={() => setShowNewChatModal(false)}><Text style={{ color: C.muted, fontWeight: 'bold' }}>Annuler</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <MsgSettingsModal />
      </SafeAreaView>
    );
  }

  // --- CHAT MESSAGERIE ---
  if (screen === 'msg_chat') {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return null;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.safe, { backgroundColor: C.chatBg }]}>
          <View style={[styles.header, { backgroundColor: C.green, justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => go('msg_home')} style={styles.backButton}><Text style={[styles.backText, { color: C.white }]}>‹</Text></TouchableOpacity>
              <View style={styles.chatAvatarSmall}><Text style={{ fontSize: 18 }}>{chat.avatar || '👤'}</Text></View>
              <Text style={[styles.headerTitle, { color: C.white, marginLeft: 10 }]}>{chat.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 15, paddingRight: 10 }}>
              <TouchableOpacity onPress={() => setNotice("Bientôt !")}><Text style={{ fontSize: 20, color: C.white }}>📞</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setNotice("Bientôt !")}><Text style={{ fontSize: 20, color: C.white }}>📹</Text></TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={chat.messages} keyExtractor={m => m.id} contentContainerStyle={{ padding: 15 }}
            renderItem={({ item: m }) => (
              <View style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', backgroundColor: m.mine ? '#DCF8C6' : C.white, padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%' }}>
                <Text style={{ color: C.dark, fontSize: 16 }}>{m.text}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: C.muted, fontSize: 11, marginRight: 4 }}>{m.time}</Text>
                  {m.mine && <Text style={{ fontSize: 12, color: m.status === 'failed' ? C.red : m.status === 'read' ? '#34B7F1' : C.muted }}>{m.status === 'failed' ? '⚠️' : m.status === 'sending' ? '🕒' : m.status === 'read' ? '✓✓' : '✓'}</Text>}
                </View>
              </View>
            )}
          />
          <View style={styles.inputBar}>
            <TouchableOpacity style={{ paddingHorizontal: 10 }} onPress={() => setNotice("Bientôt !")}><Text style={{ fontSize: 24, color: C.muted }}>📎</Text></TouchableOpacity>
            <TextInput style={styles.chatInput} placeholder="Message..." value={newMessageText} onChangeText={setNewMessageText} multiline />
            {newMessageText.trim().length > 0 ? (
              <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessageToChat(chat.phone)}><Text style={{ color: C.white, fontSize: 18 }}>➤</Text></TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: C.muted }]} onPress={() => setNotice("Bientôt !")}><Text style={{ color: C.white, fontSize: 18 }}>🎤</Text></TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // --- CONNEXION SOCIALE ---
  if (screen === 'soc_login') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Connexion Sociale" onBack={() => go('welcome')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
            <Field label="Email ou Téléphone" value={loginContact} onChangeText={setLoginContact} placeholder="contact@email.com" />
            <Field label="Mot de passe" value={loginSocPassword} onChangeText={setLoginSocPassword} isPassword={true} placeholder="Ton mot de passe" />
            <TouchableOpacity style={[styles.button, { backgroundColor: C.blueDark, marginBottom: 20 }]} onPress={loginSocial}>
              <Text style={styles.buttonText}>{isLoading ? "Connexion..." : "Se connecter"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: C.blue }]} onPress={() => go('soc_register')}>
              <Text style={[styles.buttonText, { color: C.blueDark }]}>Créer un compte</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- INSCRIPTION SOCIALE ---
  if (screen === 'soc_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Réseau Social" onBack={() => go('soc_login')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
            <Text style={styles.label}>Avatar public</Text>
            <View style={styles.avatarRow}>
              {['🌍', '🦄', '🐯', '🎨', '🎧', '🚀', '🔥'].map(a => (
                <TouchableOpacity key={a} style={[styles.avatarOption, socAvatar === a && styles.avatarOptionSelected]} onPress={() => setSocAvatar(a)}><Text style={styles.avatarOptionText}>{a}</Text></TouchableOpacity>
              ))}
            </View>
            <Field label="Nom public (Surnom / Pseudo)" value={socName} onChangeText={setSocName} placeholder="Ex: Tmd, AlPacino..." />
            <Field label="Email ou Téléphone (Privé)" value={socContact} onChangeText={setSocContact} placeholder="contact@email.com" />
            <Field label="Date de naissance" value={socBirth} onChangeText={v => setSocBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
            <Field label="Mot de passe" value={socPassword} onChangeText={setSocPassword} isPassword={true} />
            <TouchableOpacity style={[styles.button, { backgroundColor: C.blueDark, marginBottom: 40 }]} onPress={registerSocial}>
              <Text style={styles.buttonText}>{isLoading ? "Création..." : "Créer mon compte"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- ACCUEIL SOCIAL ---
  if (screen === 'soc_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        
        <View style={styles.appHeader}>
          <Text style={[styles.appTitle, { color: C.blueDark }]}>Social</Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <TouchableOpacity onPress={() => go('msg_home')}>
              <Text style={{ fontSize: 24 }}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => go('soc_chat_list')}>
              <Text style={{ fontSize: 24 }}>✉️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={feed} keyExtractor={item => item.id.toString()}
          ListHeaderComponent={
            socialAccount ? (
              <View style={styles.postCard}>
                <Text style={styles.label}>Nouvelle publication</Text>
                <TextInput placeholder="Quoi de neuf ?" style={[styles.input, { minHeight: 80, textAlignVertical: 'top', padding: 14 }]} multiline value={newPostText} onChangeText={setNewPostText} />
                <TouchableOpacity style={[styles.button, { backgroundColor: C.blueDark }]} onPress={publishPost}><Text style={styles.buttonText}>Publier</Text></TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={styles.chatAvatar}><Text style={{ fontSize: 20 }}>{item.author_avatar}</Text></View>
                <View><Text style={{ fontWeight: 'bold', fontSize: 16, color: C.dark }}>{item.author_name}</Text><Text style={{ fontSize: 12, color: C.muted }}>{item.created_at}</Text></View>
              </View>
              <Text style={{ fontSize: 16, color: C.dark, lineHeight: 22 }}>{item.text}</Text>
              <View style={{ flexDirection: 'row', marginTop: 15, gap: 20 }}><Text style={{ color: C.muted }}>❤️ J'aime</Text><Text style={{ color: C.muted }}>💬 Commenter</Text></View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.bodyCenter}>Aucune publication.</Text>}
        />

        <View style={styles.bottomBar}>
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setShowSettings(true)}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
            <Text style={{ fontSize: 10, color: C.muted }}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        <SocSettingsModal />
      </SafeAreaView>
    );
  }

  // --- LISTE CHATS SOCIAL ---
  if (screen === 'soc_chat_list') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.appHeader, { backgroundColor: C.blueDark }]}>
          <TouchableOpacity onPress={() => go('soc_home')}><Text style={{ fontSize: 24, color: C.white }}>‹</Text></TouchableOpacity>
          <Text style={[styles.appTitle, { color: C.white }]}>Messages Privés</Text>
          <TouchableOpacity onPress={() => setShowNewSocChatModal(true)}><Text style={{ fontSize: 24, color: C.white }}>📝</Text></TouchableOpacity>
        </View>
        <FlatList
          data={socChats} keyExtractor={item => item.id} contentContainerStyle={{ padding: 10 }}
          ListEmptyComponent={<Text style={styles.bodyCenter}>Aucun message privé.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatRow} onPress={() => { setActiveSocChatId(item.id); go('soc_chat'); }}>
              <View style={[styles.chatAvatar, { backgroundColor: C.blue }]}><Text style={styles.chatAvatarText}>{item.avatar}</Text></View>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: C.bg, paddingBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.chatName}>{item.name}</Text><Text style={{ fontSize: 12, color: C.muted }}>{item.messages.length > 0 ? item.messages[item.messages.length - 1].time : ''}</Text></View>
                <Text style={styles.chatLast} numberOfLines={1}>{item.messages.length > 0 ? item.messages[item.messages.length - 1].text : 'Nouveau'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
        <Modal visible={showNewSocChatModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { borderRadius: 20, margin: 20 }]}>
              <Text style={styles.modalTitle}>Chercher un ami</Text>
              <Field label="Nom / Surnom" value={socSearchName} onChangeText={setSocSearchName} placeholder="Ex: Tmd" />
              <TouchableOpacity style={[styles.button, { backgroundColor: C.blueDark }]} onPress={searchAndStartSocChat}><Text style={styles.buttonText}>{isLoading ? "Recherche..." : "Rechercher"}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'transparent', marginTop: 5 }]} onPress={() => setShowNewSocChatModal(false)}><Text style={{ color: C.muted, fontWeight: 'bold' }}>Annuler</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- CHAT SOCIAL ---
  if (screen === 'soc_chat') {
    const chat = socChats.find(c => c.id === activeSocChatId);
    if (!chat) return null;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
          <View style={[styles.header, { backgroundColor: C.blueDark, justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => go('soc_chat_list')} style={styles.backButton}><Text style={[styles.backText, { color: C.white }]}>‹</Text></TouchableOpacity>
              <View style={[styles.chatAvatarSmall, { backgroundColor: C.blue }]}><Text style={{ fontSize: 18 }}>{chat.avatar}</Text></View>
              <Text style={[styles.headerTitle, { color: C.white, marginLeft: 10 }]}>{chat.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 15, paddingRight: 10 }}>
              <TouchableOpacity onPress={() => setNotice("Bientôt !")}><Text style={{ fontSize: 20, color: C.white }}>📞</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setNotice("Bientôt !")}><Text style={{ fontSize: 20, color: C.white }}>📹</Text></TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={chat.messages} keyExtractor={m => m.id} contentContainerStyle={{ padding: 15 }}
            renderItem={({ item: m }) => (
              <View style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', backgroundColor: m.mine ? C.blueDark : C.white, padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%' }}>
                <Text style={{ color: m.mine ? C.white : C.dark, fontSize: 16 }}>{m.text}</Text>
                <Text style={{ color: m.mine ? C.blue : C.muted, fontSize: 11, marginTop: 4, textAlign: 'right' }}>{m.time}</Text>
              </View>
            )}
          />
          <View style={styles.inputBar}>
            <TextInput style={styles.chatInput} placeholder="Message privé..." value={socNewMessageText} onChangeText={setSocNewMessageText} multiline />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: C.blueDark }]} onPress={() => sendSocMessageToChat(chat.contact)}><Text style={{ color: C.white, fontSize: 18 }}>➤</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { flexGrow: 1, padding: 20 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  logo: { width: 80, height: 80, borderRadius: 25, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: C.white, fontSize: 42, fontWeight: '900' },
  brand: { color: C.dark, fontSize: 28, fontWeight: '900' },
  welcomeCard: { padding: 20 },
  bigButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  bigButtonIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bigButtonIcon: { fontSize: 30 },
  bigButtonTitle: { color: C.dark, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bigButtonSubtitle: { color: C.muted, fontSize: 14 },
  
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  appTitle: { fontSize: 24, fontWeight: '900', color: C.green },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  backButton: { paddingRight: 15 },
  backText: { fontSize: 34, color: C.green, lineHeight: 38, marginTop: -5 },
  headerTitle: { color: C.dark, fontSize: 18, fontWeight: '800' },
  fieldWrap: { marginBottom: 15 },
  label: { color: C.dark, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 10, color: C.dark, fontSize: 16 },
  button: { backgroundColor: C.green, borderRadius: 10, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: C.white, fontSize: 16, fontWeight: '800' },
  errorText: { color: C.red, fontSize: 14, textAlign: 'center', margin: 10, fontWeight: '700' },
  bodyCenter: { color: C.muted, fontSize: 15, textAlign: 'center', marginBottom: 20, marginTop: 20 },
  select: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 15, marginBottom: 15 },
  selectText: { color: C.dark, fontSize: 16 },
  
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, padding: 10, marginBottom: 2 },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  chatAvatarText: { fontSize: 24 },
  chatName: { color: C.dark, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  chatLast: { color: C.muted, fontSize: 14 },
  chatAvatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  
  inputBar: { flexDirection: 'row', padding: 10, backgroundColor: C.white, alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, maxHeight: 100, fontSize: 16 },
  sendBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  
  postCard: { backgroundColor: C.white, padding: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  avatarOption: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border },
  avatarOptionSelected: { borderColor: C.green, backgroundColor: C.green2 },
  avatarOptionText: { fontSize: 24 },

  bottomBar: { 
    backgroundColor: C.white, 
    borderTopWidth: 1, 
    borderTopColor: C.border, 
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalCard: { backgroundColor: C.white, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 15, textAlign: 'center' },
  countryItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.bg },
  countryItemText: { color: C.dark, fontSize: 16, textAlign: 'center' },
});