import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';

const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
  yellow: '#FFF0D6',
};

const COUNTRIES = [
  { name: 'Guinée', dial: '+224' }, { name: 'France', dial: '+33' },
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

// Formate la date (JJ/MM/AAAA) automatiquement
const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

// Valide la date (y compris les jours existants)
const isValidDate = (dateStr) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
  const [d, m, y] = dateStr.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  const age = (Date.now() - date.getTime()) / (365.2425 * 86400000);
  return age >= 13 && age <= 120;
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
  const [screen, setScreen] = useState('welcome'); 
  const [notice, setNotice] = useState('');

  // --- ÉTATS MESSAGERIE ---
  const [messagingAccount, setMessagingAccount] = useState(null);
  const [msgFullName, setMsgFullName] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgBirthDate, setMsgBirthDate] = useState('');

  // --- ÉTATS SOCIAL ---
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
    if (!isValidDate(msgBirthDate)) return setNotice('Date de naissance invalide.');
    
    const newAcc = { name: msgFullName, phone: msgPhone, country: COUNTRIES[0] };
    setMessagingAccount(newAcc);
    go('home_messaging');
    setNotice('Compte messagerie créé !');
  }

  // --- LOGIQUE SOCIAL ---
  async function registerSocial() {
    if (!socName.trim() || !socContact.trim() || !socPassword) return setNotice('Remplis tous les champs.');
    if (!isValidDate(socBirthDate)) return setNotice('Date de naissance invalide.');
    
    setNotice('Vérification du visage en cours...');
    setTimeout(() => {
      const newAcc = { name: socName, contact: socContact };
      setSocialAccount(newAcc);
      go('home_social');
      setNotice('Compte social créé avec succès !');
    }, 1500);
  }

  // --- DÉCONNEXION POUR PASSER D'UN ESPACE À L'AUTRE ---
  function switchSpace() {
    // Au lieu de passer directement à l'autre compte, on déconnecte et on ramène à l'accueil
    setMessagingAccount(null);
    setSocialAccount(null);
    go('welcome');
    setNotice('Choisis l\'espace de ton choix.');
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
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          
          <Field label="Nom complet" value={msgFullName} onChangeText={setMsgFullName} placeholder="Ex. TMD Diallo" />
          <Field label="Pays" value={COUNTRIES[0].name} editable={false} />
          <Field label="Téléphone" value={msgPhone} onChangeText={setMsgPhone} keyboardType="phone-pad" placeholder="620000000" />
          <Field 
            label="Date de naissance" 
            value={msgBirthDate} 
            onChangeText={v => setMsgBirthDate(formatDateInput(v))} 
            placeholder="JJ/MM/AAAA" 
            keyboardType="number-pad" 
            maxLength={10}
          />
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
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          
          <Field label="Nom et prénom" value={socName} onChangeText={setSocName} placeholder="Ton nom public" />
          <Field 
            label="Date de naissance (Privée)" 
            value={socBirthDate} 
            onChangeText={v => setSocBirthDate(formatDateInput(v))} 
            placeholder="JJ/MM/AAAA" 
            keyboardType="number-pad" 
            maxLength={10}
          />
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
          <TouchableOpacity style={styles.switchButton} onPress={switchSpace}>
            <Text style={styles.switchText}>🌍 Aller au Social</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.homeContent}>
          <Text style={styles.sectionTitle}>Tes conversations</Text>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.bodyCenter}>Commence une conversation.</Text>
          </View>
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
          <TouchableOpacity style={styles.switchButton} onPress={switchSpace}>
            <Text style={styles.switchText}>💬 Aller à la Messagerie</Text>
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
            <Button title="Publier" onPress={() => setNotice('Publication envoyée !')} />
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

  postCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAF0EC' },
  postAuthor: { color: C.green, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  postText: { color: C.dark, fontSize: 15, lineHeight: 22 },
  postTime: { color: C.muted, fontSize: 11, marginTop: 8, textAlign: 'right' },

  errorText: { color: C.red, fontSize: 13, textAlign: 'center', marginBottom: 10, fontWeight: '600' },
  emptyBox: { backgroundColor: C.white, borderRadius: 18, padding: 22, marginTop: 12, alignItems: 'center' },
  emptyTitle: { color: C.dark, fontSize: 17, fontWeight: '800', marginBottom: 5 },
  bodyCenter: { color: C.muted, fontSize: 15, lineHeight: 24, textAlign: 'center' },
});