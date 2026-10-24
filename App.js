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
  { name: 'Maroc', dial: '+212' }, { name: 'Canada', dial: '+1' },
  { name: 'États-Unis', dial: '+1' }, { name: 'Royaume-Uni', dial: '+44' },
  { name: 'Allemagne', dial: '+49' }, { name: 'Espagne', dial: '+34' },
  { name: 'Italie', dial: '+39' }, { name: 'Nigeria', dial: '+234' },
  { name: 'Cameroun', dial: '+237' }, { name: 'Gambie', dial: '+220' },
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

function maskPhone() {
  return '•• •• •• ••';
}

function maskBirthDate() {
  return '••/••/••••';
}

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

/* =========================================================
   COMPOSANTS
   ========================================================= */
function Button({ title, onPress, secondary = false, danger = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType = 'default', maxLength, autoCapitalize = 'none', returnKeyType = 'next', onSubmitEditing }) {
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#9AA59F" secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} maxLength={maxLength}
        autoCapitalize={autoCapitalize} autoCorrect={false}
        returnKeyType={returnKeyType} onSubmitEditing={onSubmitEditing}
        blurOnSubmit={returnKeyType === 'done'} style={styles.input}
      />
    </View>
  );
}

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 35 }} />
    </View>
  );
}

function ConfirmDialog({ visible, title, message, confirmText, cancelText, onConfirm, onCancel, danger }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtnCancel} onPress={onCancel}>
              <Text style={styles.dialogBtnCancelText}>{cancelText || 'Annuler'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogBtnConfirm, danger && { backgroundColor: C.red }]}
              onPress={onConfirm}
            >
              <Text style={styles.dialogBtnConfirmText}>{confirmText || 'Confirmer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Page({ children, notice, clearNotice, onBack, title }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      {!!notice && (
        <TouchableOpacity style={styles.notice} onPress={clearNotice} activeOpacity={0.8}>
          <Text style={styles.noticeText}>{notice}</Text>
        </TouchableOpacity>
      )}
      {title ? <Header title={title} onBack={onBack} /> : null}
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   APP
   ========================================================= */
export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const [savedAccount, setSavedAccount] = useState(null);
  const [account, setAccount] = useState(null);

  const [chats, setChats] = useState(starterChats);
  const [activeChatId, setActiveChatId] = useState(null);
  const [tab, setTab] = useState('messages');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const [newContactPseudonym, setNewContactPseudonym] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => { loadSavedData(); }, []);

  useEffect(() => {
    if (loading) return;
    const data = { savedAccount, chats, pseudonym, notificationsEnabled };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(err => {
      console.log('Erreur de sauvegarde :', err);
    });
  }, [savedAccount, chats, pseudonym, notificationsEnabled, loading]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function loadSavedData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.savedAccount) setSavedAccount(data.savedAccount);
        if (Array.isArray(data.chats)) setChats(data.chats);
        if (typeof data.pseudonym === 'string') setPseudonym(data.pseudonym);
        if (typeof data.notificationsEnabled === 'boolean') setNotificationsEnabled(data.notificationsEnabled);
      }
    } catch (err) {
      console.log('Erreur de lecture locale :', err);
    } finally {
      setLoading(false);
    }
  }

  function go(next) {
    Keyboard.dismiss();
    setNotice('');
    setScreen(next);
  }

  // ✅ NOUVELLE FONCTION D'INSCRIPTION CONNECTÉE AU SERVEUR
  async function register() {
    if (!fullName.trim()) return setNotice('Entre ton nom complet.');
    if (!validBirthDate(birthDate)) return setNotice('Date invalide. JJ/MM/AAAA, âge 13-120.');
    if (normalizePhone(phone).length < 5) return setNotice('Numéro invalide.');
    if (password.length < 8) return setNotice('Mot de passe : au moins 8 caractères.');
    if (password !== confirmPassword) return setNotice('Les mots de passe ne correspondent pas.');

    setNotice('Création du compte...');

    try {
      // On envoie une vraie requête à ton serveur Render
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), country_dial: country.dial })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Si le serveur répond OK, on passe à l'écran suivant
        const newAccount = { fullName: fullName.trim(), birthDate, country, phone: normalizePhone(phone), passwordHash: demoHash(password) };
        setSavedAccount(newAccount);
        setAccount(newAccount);
        setPseudonym(fullName.trim().split(/\s+/)[0]);
        setPassword(''); setConfirmPassword('');
        go('face');
        setNotice('Code envoyé ! Vérifie ton SMS.');
      } else {
        setNotice(data.detail || 'Erreur serveur.');
      }
    } catch (error) {
      setNotice('Erreur de connexion au serveur.');
    }
  }

  function login() {
    if (!savedAccount) return setNotice('Aucun compte enregistré.');
    const entered = normalizePhone(loginPhone);
    const local = normalizePhone(savedAccount.phone);
    const inter = normalizePhone(`${savedAccount.country.dial}${savedAccount.phone}`);
    const phoneMatches = [local, inter].includes(entered);
    const passwordMatches = demoHash(loginPassword) === savedAccount.passwordHash;

    if (!phoneMatches || !passwordMatches) {
      return setNotice('Numéro ou mot de passe incorrect.');
    }

    setAccount(savedAccount);
    setLoginPassword('');
    go(savedAccount.securityCodeHash ? 'unlock' : 'home');
  }

  function finishFaceDemo() {
    setNotice('Démonstration : aucun visage scanné.');
    go('setcode');
  }

  function saveSecurityCode() {
    if (securityCode.length !== 8) return setNotice('Le code doit contenir 8 caractères.');
    if (securityCode !== confirmSecurityCode) return setNotice('Les codes ne correspondent pas.');

    const updated = { ...account, securityCodeHash: demoHash(securityCode) };
    setAccount(updated);
    setSavedAccount(updated);
    setSecurityCode('');
    setConfirmSecurityCode('');
    go('home');
    setNotice('Code de sécurité enregistré.');
  }

  function changeSecurityCode() {
    if (securityCode.length !== 8) return setNotice('Le code doit contenir 8 caractères.');
    if (securityCode !== confirmSecurityCode) return setNotice('Les codes ne correspondent pas.');

    const updated = { ...account, securityCodeHash: demoHash(securityCode) };
    setAccount(updated);
    setSavedAccount(updated);
    setSecurityCode('');
    setConfirmSecurityCode('');
    go('home');
    setNotice('Code modifié.');
  }

  function unlock() {
    if (!account?.securityCodeHash || enteredCode.length !== 8 ||
        demoHash(enteredCode) !== account.securityCodeHash) {
      return setNotice('Code incorrect.');
    }
    setEnteredCode('');
    go('home');
  }

  function openChat(id) {
    setActiveChatId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    go('chat');
  }

  // ✅ FONCTION D'ENVOI DE MESSAGE CONNECTÉE AU SERVEUR
  async function sendMessage() {
    const text = messageText.trim();
    if (!text || !activeChatId) return;
    
    const newMessage = { id: makeId(), text, mine: true, time: nowTime(), status: 'Envoi...' };

    setChats(prev => prev.map(c => c.id === activeChatId
      ? { ...c, last: text, messages: [...c.messages, newMessage] } : c));
    setMessageText('');
    Keyboard.dismiss();

    try {
      // Envoi au serveur Render (simulation)
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '000', country_dial: '+000' }) 
      });
      
      // Une fois envoyé, on met le statut à jour
      setChats(prev => prev.map(c => c.id === activeChatId
        ? { ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: 'Envoyé' } : m) } : c));
        
    } catch (error) {
      setChats(prev => prev.map(c => c.id === activeChatId
        ? { ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: 'Échec' } : m) } : c));
    }
  }

  function addContact() {
    const name = newContactName.trim();
    const number = normalizePhone(newContactPhone);
    if (!name) return setNotice('Entre le nom du contact.');
    if (number.length < 5) return setNotice('Numéro invalide.');
    if (chats.some(c => c.phone && normalizePhone(c.phone) === number)) {
      return setNotice('Ce numéro est déjà dans tes conversations.');
    }
    const newChat = {
      id: makeId(), name,
      pseudonym: newContactPseudonym.trim() || name,
      phone: number, last: 'Nouvelle conversation', unread: 0, messages: [],
    };
    setChats(prev => [newChat, ...prev]);
    setNewContactName(''); setNewContactPhone(''); setNewContactPseudonym('');
    setTab('messages'); go('home');
    setNotice('Conversation locale créée.');
  }

  function askDeleteMessage(chatId, messageId) {
    setConfirmDialog({
      title: 'Supprimer ce message ?',
      message: 'Le message sera supprimé de cet historique local.',
      confirmText: 'Supprimer', danger: true,
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
      title: 'Supprimer la conversation ?',
      message: 'Elle sera supprimée de cet appareil.',
      confirmText: 'Supprimer', danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
          go('home');
        }
      },
    });
  }

  function logout() {
    setAccount(null);
    setActiveChatId(null);
    setLoginPhone(''); setLoginPassword(''); setEnteredCode(''); setMessageText('');
    go('welcome');
    setNotice('Tu es déconnecté.');
  }

  function askClearLocalData() {
    setConfirmDialog({
      title: 'Effacer les données ?',
      message: 'Le compte et les conversations enregistrés seront supprimés.',
      confirmText: 'Tout effacer', danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setSavedAccount(null); setAccount(null);
          setChats(starterChats); setPseudonym('');
          setNotificationsEnabled(true); setActiveChatId(null); setTab('messages');
          setFullName(''); setBirthDate(''); setPhone('');
          setPassword(''); setConfirmPassword('');
          setLoginPhone(''); setLoginPassword('');
          go('welcome');
        } catch { setNotice('Impossible de supprimer les données.'); }
      },
    });
  }

  const activeChat = useMemo(
    () => chats.find(c => c.id === activeChatId),
    [chats, activeChatId]
  );
  const filteredChats = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.pseudonym || '').toLowerCase().includes(q) ||
      (c.last || '').toLowerCase().includes(q)
    );
  }, [chats, search]);

  /* =========================================================
     ÉCRANS
     ========================================================= */
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
        <Text style={styles.brand}>TMD Messenger</Text>
        <Text style={styles.body}>Chargement des données locales…</Text>
      </SafeAreaView>
    );
  }

  if (screen === 'welcome') {
    return (
      <Page notice={notice} clearNotice={() => setNotice('')}>
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
          <Text style={styles.subtitle}>Une messagerie pensée pour toi.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Bienvenue 👋</Text>
          <Text style={styles.body}>
            Discute, organise tes conversations et gère ton profil.
          </Text>
          <Button
            title={savedAccount ? 'Continuer vers mon compte' : 'Créer un compte'}
            onPress={() => go(savedAccount ? 'login' : 'register')}
          />
          <Button title="Se connecter" secondary onPress={() => go('login')} />
          <Text style={styles.smallNote}>
            Prototype local : les messages ne sont pas encore envoyés sur Internet.
          </Text>
        </View>
      </Page>
    );
  }

  if (screen === 'register') {
    return (
      <Page title="Créer un compte" onBack={() => go('welcome')}
        notice={notice} clearNotice={() => setNotice('')}>
        <View style={styles.card}>
          <Text style={styles.title}>Tes informations</Text>
          <Field label="Nom complet" value={fullName} onChangeText={setFullName}
            placeholder="Ex. TMD Diallo" autoCapitalize="words" />
          <Field label="Date de naissance" value={birthDate}
            onChangeText={v => setBirthDate(formatDate(v))}
            placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity style={styles.select}
            onPress={() => { Keyboard.dismiss(); setShowCountries(v => !v); }}>
            <Text style={styles.selectText}>{country.name} ({country.dial})</Text>
            <Text style={styles.selectArrow}>{showCountries ? '−' : '+'}</Text>
          </TouchableOpacity>
          {showCountries && (
            <View style={styles.countryList}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always">
                {COUNTRIES.map(item => (
                  <TouchableOpacity key={item.name} style={styles.countryItem}
                    onPress={() => { setCountry(item); setShowCountries(false); }}>
                    <Text style={styles.countryText}>{item.name} ({item.dial})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <Field label="Téléphone sans indicatif" value={phone} onChangeText={setPhone}
            placeholder="Ex. 620000000" keyboardType="phone-pad" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword}
            placeholder="Au moins 8 caractères" secureTextEntry />
          <Field label="Confirmer le mot de passe" value={confirmPassword}
            onChangeText={setConfirmPassword} placeholder="Retape ton mot de passe"
            secureTextEntry returnKeyType="done" />
          <Button title="Continuer" onPress={register} />
          <Button title="J’ai déjà un compte" secondary onPress={() => go('login')} />
        </View>
      </Page>
    );
  }

  if (screen === 'login') {
    return (
      <Page title="Connexion" onBack={() => go('welcome')}
        notice={notice} clearNotice={() => setNotice('')}>
        <View style={styles.card}>
          <Text style={styles.title}>Ravi de te revoir</Text>
          <Text style={styles.body}>Connecte-toi avec les informations enregistrées.</Text>
          <Field label="Numéro de téléphone" value={loginPhone} onChangeText={setLoginPhone}
            placeholder="Ton numéro" keyboardType="phone-pad" />
          <Field label="Mot de passe" value={loginPassword} onChangeText={setLoginPassword}
            placeholder="Ton mot de passe" secureTextEntry returnKeyType="done" />
          <Button title="Se connecter" onPress={login} />
          <Button title="Créer un compte" secondary onPress={() => go('register')} />
        </View>
      </Page>
    );
  }

  if (screen === 'face') {
    return (
      <Page notice={notice} clearNotice={() => setNotice('')}>
        <View style={styles.faceHero}>
          <View style={styles.faceIcon}><Text style={{ fontSize: 54 }}>✓</Text></View>
          <Text style={styles.title}>Vérification du visage</Text>
          <Text style={styles.bodyCenter}>
            Cet écran est une démonstration. Aucun scan facial, aucune donnée biométrique.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Aucune donnée biométrique n’est collectée.</Text>
          </View>
          <Button title="Continuer" onPress={finishFaceDemo} />
          <Button title="Retour à l’accueil" secondary onPress={() => go('welcome')} />
        </View>
      </Page>
    );
  }

  if (screen === 'setcode' || screen === 'changeCode') {
    const changing = screen === 'changeCode';
    return (
      <Page title={changing ? 'Changer le code' : 'Code de sécurité'}
        onBack={() => go(changing ? 'home' : 'face')}
        notice={notice} clearNotice={() => setNotice('')}>
        <View style={styles.card}>
          <Text style={styles.title}>{changing ? 'Nouveau code' : 'Crée ton code'}</Text>
          <Text style={styles.body}>Choisis exactement 8 caractères.</Text>
          <Field label="Code de sécurité" value={securityCode} onChangeText={setSecurityCode}
            placeholder="8 caractères" maxLength={8} secureTextEntry />
          <Text style={styles.counter}>{securityCode.length}/8 caractères</Text>
          <Field label="Confirmer le code" value={confirmSecurityCode}
            onChangeText={setConfirmSecurityCode} placeholder="Retape le même code"
            maxLength={8} secureTextEntry returnKeyType="done" />
          <Button
            title={changing ? 'Enregistrer le code' : 'Enregistrer et ouvrir TMD'}
            onPress={changing ? changeSecurityCode : saveSecurityCode}
          />
          <Text style={styles.smallNote}>
            Prototype : code hashé localement. En production : verrou biométrique + stockage sécurisé.
          </Text>
        </View>
      </Page>
    );
  }

  if (screen === 'unlock') {
    return (
      <Page notice={notice} clearNotice={() => setNotice('')}>
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Code de sécurité</Text>
          <Field label="Saisis ton code" value={enteredCode} onChangeText={setEnteredCode}
            placeholder="8 caractères" maxLength={8} secureTextEntry returnKeyType="done" />
          <Button title="Déverrouiller" onPress={unlock} />
          <Button title="Retour à l’accueil" secondary onPress={logout} />
        </View>
      </Page>
    );
  }

  if (screen === 'addContact') {
    return (
      <Page title="Nouvelle conversation" onBack={() => go('home')}
        notice={notice} clearNotice={() => setNotice('')}>
        <View style={styles.card}>
          <Text style={styles.title}>Ajouter un contact</Text>
          <Text style={styles.body}>
            Crée une conversation locale. Ne recherche pas de vrais utilisateurs.
          </Text>
          <Field label="Nom du contact" value={newContactName}
            onChangeText={setNewContactName} placeholder="Nom à afficher" autoCapitalize="words" />
          <Field label="Pseudonyme (facultatif)" value={newContactPseudonym}
            onChangeText={setNewContactPseudonym} placeholder="Pseudonyme public" />
          <Field label="Numéro de téléphone" value={newContactPhone}
            onChangeText={setNewContactPhone} placeholder="Numéro du contact"
            keyboardType="phone-pad" returnKeyType="done" />
          <Button title="Créer la conversation" onPress={addContact} />
        </View>
      </Page>
    );
  }

  if (screen === 'chat') {
    if (!activeChat) {
      return (
        <Page notice={notice} clearNotice={() => setNotice('')}>
          <Text style={styles.title}>Conversation introuvable</Text>
          <Button title="Retour aux messages" onPress={() => go('home')} />
        </Page>
      );
    }
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        {!!notice && (
          <TouchableOpacity style={styles.notice} onPress={() => setNotice('')}>
            <Text style={styles.noticeText}>{notice}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => go('home')} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{activeChat.name}</Text>
            <Text style={styles.onlineText}>Conversation locale de démonstration</Text>
          </View>
          <TouchableOpacity onPress={() => askDeleteConversation(activeChat.id)}>
            <Text style={styles.deleteIcon}>⌫</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.chatMessages}
            keyboardShouldPersistTaps="always" keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
            {activeChat.messages.map(message => (
              <TouchableOpacity key={message.id} activeOpacity={0.9}
                onLongPress={() => askDeleteMessage(activeChat.id, message.id)}
                style={[styles.bubble, message.mine ? styles.myBubble : styles.theirBubble]}>
                <Text style={[styles.bubbleText, message.mine && { color: C.white }]}>
                  {message.text}
                </Text>
                <View style={styles.messageFooter}>
                  <Text style={[styles.time, message.mine && { color: '#D9F4E7' }]}>
                    {message.time}
                  </Text>
                  {message.mine && (
                    <Text style={styles.statusText}>
                      {message.status === 'Envoyé' ? '✓' : message.status === 'Distribué' ? '✓✓' : message.status}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {activeChat.messages.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Nouvelle conversation</Text>
                <Text style={styles.bodyCenter}>Envoie ton premier message.</Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput value={messageText} onChangeText={setMessageText}
              placeholder="Écrire un message…" placeholderTextColor="#9AA59F"
              style={styles.composerInput} multiline blurOnSubmit={false} />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.smallFootnote}>
            Appuie longuement sur un message pour le supprimer.
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === 'home') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        {!!notice && (
          <TouchableOpacity style={styles.notice} onPress={() => setNotice('')}>
            <Text style={styles.noticeText}>{notice}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.homeName}>{account?.fullName || 'TMD'}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => setTab('profile')}>
            <Text style={styles.avatarText}>
              {(account?.fullName || 'T').slice(0, 1).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'messages' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.homeContent}
            keyboardShouldPersistTaps="always" keyboardDismissMode="none">
            <TextInput value={search} onChangeText={setSearch}
              placeholder="⌕ Rechercher une conversation" placeholderTextColor="#98A49D"
              style={styles.searchInput} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Messages</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => go('addContact')}>
                <Text style={styles.addButtonText}>＋</Text>
              </TouchableOpacity>
            </View>
            {filteredChats.map(chat => (
              <TouchableOpacity key={chat.id} style={styles.chatRow}
                onPress={() => openChat(chat.id)}
                onLongPress={() => askDeleteConversation(chat.id)}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>
                    {(chat.pseudonym || chat.name).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatLast} numberOfLines={1}>{chat.last}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
            {filteredChats.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Aucun résultat</Text>
                <Text style={styles.bodyCenter}>Essaie un autre nom ou crée une conversation.</Text>
              </View>
            )}
            <View style={styles.noticeCard}>
              <Text style={styles.noticeCardTitle}>État du prototype</Text>
              <Text style={styles.body}>
                Les comptes et messages sont stockés localement. La messagerie
                entre appareils, les appels et le chiffrement E2E nécessitent une infrastructure réelle.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.homeContent}
            keyboardShouldPersistTaps="always">
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {(account?.fullName || 'T').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>{account?.fullName || 'Utilisateur TMD'}</Text>
              <Text style={styles.profileMeta}>@{pseudonym || 'tmd_utilisateur'}</Text>
              <Text style={styles.profileMeta}>{maskPhone()}</Text>
              <Text style={styles.privacyTag}>🔒 Numéro masqué (politique TMD)</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Mon profil</Text>
              <Field label="Pseudonyme public" value={pseudonym} onChangeText={setPseudonym}
                placeholder="Choisis ton pseudonyme" />

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Pays</Text>
                <Text style={styles.settingValue}>{account?.country?.name || '—'}</Text>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Date de naissance</Text>
                <Text style={styles.settingValue}>
                  {account?.birthDate ? `${maskBirthDate()} (vérifiée)` : '—'}
                </Text>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Code de sécurité</Text>
                <Text style={styles.settingValue}>
                  {account?.securityCodeHash ? 'Configuré' : 'Non configuré'}
                </Text>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Notifications (prototype)</Text>
                <TouchableOpacity
                  style={[styles.toggle, notificationsEnabled && styles.toggleOn]}
                  onPress={() => setNotificationsEnabled(v => !v)}>
                  <Text style={styles.toggleText}>{notificationsEnabled ? 'OUI' : 'NON'}</Text>
                </TouchableOpacity>
              </View>

              <Button title="Changer le code de sécurité" secondary onPress={() => {
                setSecurityCode(''); setConfirmSecurityCode(''); go('changeCode');
              }} />
              <Button title="Se déconnecter" onPress={logout} />
              <Button title="Effacer les données locales" danger onPress={askClearLocalData} />
              <Text style={styles.smallNote}>
                Ton numéro reste masqué par défaut. Ce choix reflète la politique de confidentialité de TMD.
              </Text>
            </View>
          </ScrollView>
        )}

        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setTab('messages')}>
            <Text style={[styles.tabIcon, tab === 'messages' && styles.activeTab]}>▤</Text>
            <Text style={[styles.tabLabel, tab === 'messages' && styles.activeTab]}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setTab('profile')}>
            <Text style={[styles.tabIcon, tab === 'profile' && styles.activeTab]}>◉</Text>
            <Text style={[styles.tabLabel, tab === 'profile' && styles.activeTab]}>Profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Page notice={notice} clearNotice={() => setNotice('')}>
      <Text style={styles.title}>TMD Messenger</Text>
      <Text style={styles.body}>Écran inconnu.</Text>
      <Button title="Retour à l’accueil" onPress={() => go('welcome')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { flexGrow: 1, padding: 20, paddingBottom: 34 },
  hero: { alignItems: 'center', paddingTop: 35, paddingBottom: 24 },
  logo: { width: 78, height: 78, borderRadius: 25, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: C.white, fontSize: 42, fontWeight: '900' },
  brand: { color: C.dark, fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: C.muted, fontSize: 16, marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 20, marginTop: 12,
    borderWidth: 1, borderColor: '#E9EFEB' },
  title: { color: C.dark, fontSize: 25, fontWeight: '800', marginBottom: 12 },
  body: { color: C.muted, fontSize: 15, lineHeight: 23, marginBottom: 18 },
  bodyCenter: { color: C.muted, fontSize: 15, lineHeight: 24, textAlign: 'center',
    marginTop: 10, marginBottom: 18 },
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 52,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 },
  buttonText: { color: C.white, fontSize: 16, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },
  buttonDanger: { backgroundColor: C.red },
  smallNote: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center' },
  fieldWrap: { marginBottom: 14 },
  label: { color: C.dark, fontWeight: '700', fontSize: 14, marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
    borderRadius: 13, paddingHorizontal: 14, color: C.dark, fontSize: 16 },
  select: { borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, borderRadius: 13,
    paddingHorizontal: 14, minHeight: 50, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'space-between', marginBottom: 14 },
  selectText: { color: C.dark, fontSize: 16 },
  selectArrow: { color: C.green, fontSize: 22, fontWeight: '700' },
  countryList: { borderWidth: 1, borderColor: C.border, borderRadius: 12,
    maxHeight: 190, marginBottom: 14, overflow: 'hidden', backgroundColor: C.white },
  countryItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  countryText: { color: C.dark, fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { fontSize: 34, color: C.green, lineHeight: 38, marginTop: -4 },
  headerTitle: { color: C.dark, fontSize: 19, fontWeight: '800', flex: 1 },
  onlineText: { color: C.muted, fontSize: 12, marginTop: 3 },
  notice: { backgroundColor: C.yellow, borderRadius: 12, padding: 12,
    marginHorizontal: 14, marginTop: 8 },
  noticeText: { color: '#7A4D00', fontSize: 14, fontWeight: '600' },
  counter: { textAlign: 'right', color: C.muted, fontSize: 12, marginTop: -8, marginBottom: 12 },
  faceHero: { flex: 1, justifyContent: 'center', paddingHorizontal: 6, paddingTop: 26, paddingBottom: 22 },
  faceIcon: { width: 104, height: 104, borderRadius: 52, borderWidth: 6,
    borderColor: '#368460', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 28 },
  infoBox: { backgroundColor: '#E8F5EE', padding: 20, borderRadius: 22, marginBottom: 18 },
  infoText: { color: '#28684F', fontSize: 16, lineHeight: 25, fontWeight: '700' },
  homeHeader: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: C.muted, fontSize: 15 },
  homeName: { color: C.dark, fontSize: 26, fontWeight: '900', marginTop: 3 },
  avatar: { width: 48, height: 48, borderRadius: 17, backgroundColor: C.green2,
    alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.green, fontSize: 22, fontWeight: '900' },
  homeContent: { paddingHorizontal: 18, paddingBottom: 24 },
  searchInput: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 15, padding: 14, marginBottom: 20, color: C.dark, fontSize: 15 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: C.dark, fontSize: 21, fontWeight: '800', marginBottom: 10 },
  addButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: C.white, fontSize: 28, lineHeight: 32 },
  chatRow: { backgroundColor: C.white, borderRadius: 18, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: '#EAF0EC' },
  chatAvatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: C.green2,
    alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chatAvatarText: { color: C.green, fontSize: 21, fontWeight: '900' },
  chatName: { color: C.dark, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  chatLast: { color: C.muted, fontSize: 13 },
  chevron: { color: C.muted, fontSize: 28, paddingLeft: 8 },
  noticeCard: { backgroundColor: '#EAF2FF', padding: 18, borderRadius: 18, marginTop: 16 },
  noticeCardTitle: { color: C.dark, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  tabBar: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1,
    borderTopColor: C.border, paddingTop: 10, paddingBottom: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 22, color: C.muted },
  tabLabel: { fontSize: 12, color: C.muted, marginTop: 3, fontWeight: '700' },
  activeTab: { color: C.green },
  profileCard: { backgroundColor: C.white, borderRadius: 22, alignItems: 'center',
    padding: 24, marginBottom: 16 },
  profileAvatar: { width: 76, height: 76, borderRadius: 26, backgroundColor: C.green2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { color: C.green, fontSize: 34, fontWeight: '900' },
  profileName: { color: C.dark, fontSize: 22, fontWeight: '900' },
  profileMeta: { color: C.muted, fontSize: 14, marginTop: 5 },
  privacyTag: { color: C.green, fontSize: 11, marginTop: 8, fontWeight: '700' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  settingLabel: { color: C.muted, fontSize: 14, flex: 1, paddingRight: 8 },
  settingValue: { color: C.dark, fontSize: 14, fontWeight: '700' },
  toggle: { backgroundColor: '#E5E9E6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  toggleOn: { backgroundColor: C.green2 },
  toggleText: { color: C.green, fontSize: 12, fontWeight: '900' },
  chatMessages: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14,
    paddingTop: 11, paddingBottom: 7, marginVertical: 5 },
  myBubble: { backgroundColor: C.green, alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: C.white, alignSelf: 'flex-start',
    borderBottomLeftRadius: 5, borderWidth: 1, borderColor: C.border },
  bubbleText: { color: C.dark, fontSize: 15, lineHeight: 21 },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end',
    alignItems: 'center', marginTop: 5 },
  time: { color: C.muted, fontSize: 10 },
  statusText: { color: '#D9F4E7', fontSize: 11, marginLeft: 5, fontWeight: '900' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
  composerInput: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: C.bg,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: C.dark, fontSize: 15 },
  sendButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendText: { color: C.white, fontSize: 21, fontWeight: '900' },
  smallFootnote: { backgroundColor: C.white, textAlign: 'center', color: C.muted,
    fontSize: 11, paddingBottom: 5 },
  emptyBox: { backgroundColor: C.white, borderRadius: 18, padding: 22,
    marginTop: 12, alignItems: 'center' },
  emptyTitle: { color: C.dark, fontSize: 17, fontWeight: '800', marginBottom: 5 },
  deleteIcon: { color: C.red, fontSize: 25, paddingHorizontal: 8 },
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogCard: { width: '100%', backgroundColor: C.white, borderRadius: 20, padding: 22 },
  dialogTitle: { fontSize: 19, fontWeight: '900', color: C.dark, marginBottom: 10 },
  dialogMessage: { fontSize: 14, lineHeight: 21, color: C.muted, marginBottom: 20 },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogBtnCancel: { flex: 1, minHeight: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  dialogBtnConfirm: { flex: 1, minHeight: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.green },
  dialogBtnCancelText: { color: C.dark, fontWeight: '700', fontSize: 14 },
  dialogBtnConfirmText: { color: C.white, fontWeight: '800', fontSize: 14 },
});