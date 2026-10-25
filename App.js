import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Modal, Keyboard
} from 'react-native';

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

const demoHash = (input) => {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
};

/* =========================================================
   COMPOSANTS
   ========================================================= */
function Button({ title, onPress, secondary = false, danger = false }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}
      style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType = 'default', maxLength, autoCapitalize = 'none', returnKeyType = 'next', onSubmitEditing }) {
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#9AA59F" secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} maxLength={maxLength} autoCapitalize={autoCapitalize}
        autoCorrect={false} returnKeyType={returnKeyType} onSubmitEditing={onSubmitEditing}
        blurOnSubmit={returnKeyType === 'done'} style={styles.input} />
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

/* =========================================================
   APP
   ========================================================= */
export default function App() {
  // Navigation: 'welcome', 'messaging_auth', 'social_auth', 'messaging_register', 'social_register', 'home_messaging', 'home_social'
  const [screen, setScreen] = useState('welcome');
  const [notice, setNotice] = useState('');

  // États Messagerie
  const [messagingAccount, setMessagingAccount] = useState(null);
  const [msgFullName, setMsgFullName] = useState('');
  const [msgCountry] = useState(COUNTRIES[0]);
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgBirthDate, setMsgBirthDate] = useState('');

  // États Social
  const [socialAccount, setSocialAccount] = useState(null);
  const [socName, setSocName] = useState('');
  const [socBirthDate, setSocBirthDate] = useState('');
  const [socContact, setSocContact] = useState('');
  const [socPassword, setSocPassword] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  function go(next) {
    Keyboard.dismiss();
    setNotice('');
    setScreen(next);
  }

  // --- LOGIQUE MESSAGERIE ---
  async function registerMessaging() {
    if (!msgFullName.trim() || !msgPhone.trim() || !msgPassword) return setNotice('Remplis tous les champs.');
    // Simulation d'inscription
    const newAcc = { name: msgFullName, phone: msgPhone, country: msgCountry };
    setMessagingAccount(newAcc);
    go('home_messaging');
    setNotice('Compte messagerie créé (simulation) !');
  }

  // --- LOGIQUE SOCIAL ---
  async function registerSocial() {
    if (!socName.trim() || !socContact.trim() || !socPassword) return setNotice('Remplis tous les champs.');
    
    setNotice('Vérification du visage en cours...');
    // Simulation du scan visage (obligatoire)
    setTimeout(() => {
      const newAcc = { name: socName, contact: socContact };
      setSocialAccount(newAcc);
      go('home_social');
      setNotice('Compte social créé avec succès !');
    }, 1500);
  }

  // =========================================================
  // RENDU DES ÉCRANS
  // =========================================================

  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
          <Text style={styles.subtitle}>Choisis ton espace.</Text>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.bigButton} onPress={() => go('messaging_auth')}>
            <Text style={styles.bigButtonIcon}>💬</Text>
            <Text style={styles.bigButtonTitle}>Messagerie</Text>
            <Text style={styles.bigButtonSubtitle}>Discussions privées</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={() => go('social_auth')}>
            <Text style={styles.bigButtonIcon}>🌍</Text>
            <Text style={styles.bigButtonTitle}>Réseau Social</Text>
            <Text style={styles.bigButtonSubtitle}>Partage public</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'messaging_auth' || screen === 'social_auth') {
    const isSocial = screen === 'social_auth';
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={isSocial ? 'Réseau Social' : 'Messagerie'} onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.title}>{isSocial ? 'Bienvenue sur le Social' : 'Bienvenue sur la Messagerie'}</Text>
          <Text style={styles.body}>
            {isSocial ? 'Partage avec le monde.' : 'Discute en privé avec tes contacts.'}
          </Text>
          <Button title="Créer un compte" onPress={() => go(isSocial ? 'social_register' : 'messaging_register')} />
          <Button title="Se connecter" secondary onPress={() => setNotice('Connexion à venir.')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'messaging_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Messagerie" onBack={() => go('messaging_auth')} />
        <ScrollView contentContainerStyle={styles.page}>
          <Field label="Nom complet" value={msgFullName} onChangeText={setMsgFullName} placeholder="Ex. TMD Diallo" />
          <Field label="Pays" value={msgCountry.name} editable={false} />
          <Field label="Téléphone" value={msgPhone} onChangeText={setMsgPhone} keyboardType="phone-pad" placeholder="620000000" />
          <Field label="Date de naissance" value={msgBirthDate} onChangeText={setMsgBirthDate} placeholder="JJ/MM/AAAA" />
          <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} secureTextEntry />
          <Button title="Continuer" onPress={registerMessaging} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'social_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Sociale" onBack={() => go('social_auth')} />
        <ScrollView contentContainerStyle={styles.page}>
          <Field label="Nom et prénom" value={socName} onChangeText={setSocName} placeholder="Ton nom public" />
          <Field label="Date de naissance (Privée)" value={socBirthDate} onChangeText={setSocBirthDate} placeholder="JJ/MM/AAAA" />
          <Field label="Email ou Téléphone" value={socContact} onChangeText={setSocContact} placeholder="Pour récupérer ton compte" />
          <Field label="Mot de passe" value={socPassword} onChangeText={setSocPassword} secureTextEntry />
          
          <View style={styles.scanBox}>
            <Text style={styles.scanIcon}>🙂</Text>
            <Text style={styles.scanText}>Vérification du visage obligatoire à la création</Text>
          </View>
          
          <Button title="Créer mon compte Social" onPress={registerSocial} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'home_messaging') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.greeting}>Messagerie</Text>
            <Text style={styles.homeName}>{messagingAccount?.name}</Text>
          </View>
          <TouchableOpacity style={styles.switchButton} onPress={() => go('home_social')}>
            <Text style={styles.switchText}>🌍 Passer au Social</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.homeContent}>
          <Text style={styles.sectionTitle}>Tes conversations</Text>
          {starterChats.map(chat => (
            <View key={chat.id} style={styles.chatRow}>
              <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>{chat.name.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatLast}>{chat.last}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'home_social') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.greeting}>Réseau Social</Text>
            <Text style={styles.homeName}>{socialAccount?.name}</Text>
          </View>
          <TouchableOpacity style={styles.switchButton} onPress={() => go('home_messaging')}>
            <Text style={styles.switchText}>💬 Passer à la Messagerie</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.homeContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nouvelle publication</Text>
            <TextInput 
              placeholder="Quoi de neuf ?" 
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]} 
              multiline 
            />
            <Button title="Publier" onPress={() => setNotice('Publication envoyée (simulation) !')} />
          </View>
          
          <Text style={styles.sectionTitle}>Le Feed</Text>
          <View style={styles.postCard}>
            <Text style={styles.postAuthor}>Thierno</Text>
            <Text style={styles.postText}>Bienvenue sur le réseau social TMD ! 🚀</Text>
            <Text style={styles.postTime}>À l'instant</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { flexGrow: 1, padding: 20, paddingBottom: 34 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  logo: { width: 90, height: 90, borderRadius: 30, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText: { color: C.white, fontSize: 48, fontWeight: '900' },
  brand: { color: C.dark, fontSize: 32, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: C.muted, fontSize: 18, marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#E9EFEB' },
  title: { color: C.dark, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  body: { color: C.muted, fontSize: 16, lineHeight: 24, marginBottom: 24 },
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 16 },
  buttonText: { color: C.white, fontSize: 17, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },
  fieldWrap: { marginBottom: 14 },
  label: { color: C.dark, fontWeight: '700', fontSize: 15, marginBottom: 8, marginTop: 12 },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, borderRadius: 13, paddingHorizontal: 14, color: C.dark, fontSize: 16 },
  
  bigButton: { backgroundColor: C.bg, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  bigButtonIcon: { fontSize: 48, marginBottom: 12 },
  bigButtonTitle: { color: C.dark, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  bigButtonSubtitle: { color: C.muted, fontSize: 14, textAlign: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, color: C.green, lineHeight: 38, marginTop: -4 },
  headerTitle: { color: C.dark, fontSize: 19, fontWeight: '800', flex: 1 },
  
  homeHeader: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border },
  greeting: { color: C.muted, fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  homeName: { color: C.dark, fontSize: 24, fontWeight: '900', marginTop: 4 },
  switchButton: { backgroundColor: C.green2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: C.green, fontWeight: '800', fontSize: 13 },
  
  homeContent: { padding: 20 },
  sectionTitle: { color: C.dark, fontSize: 22, fontWeight: '800', marginBottom: 16 },
  
  scanBox: { backgroundColor: '#E8F5EE', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  scanIcon: { fontSize: 50, marginBottom: 10 },
  scanText: { color: '#28684F', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  chatRow: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#EAF0EC' },
  chatAvatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chatAvatarText: { color: C.green, fontSize: 21, fontWeight: '900' },
  chatName: { color: C.dark, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  chatLast: { color: C.muted, fontSize: 13 },

  postCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAF0EC' },
  postAuthor: { color: C.green, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  postText: { color: C.dark, fontSize: 15, lineHeight: 22 },
  postTime: { color: C.muted, fontSize: 11, marginTop: 8, textAlign: 'right' },
});