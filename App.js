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

// ... (Je garde COUNTRIES, starterChats, et les fonctions utilitaires identiques) ...
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
const demoHash = (input) => { let h = 5381; for (let i = 0; i < input.length; i++) { h = (h * 33) ^ input.charCodeAt(i); } return (h >>> 0).toString(16); };

// ... Composants réutilisables ...

export default function App() {
  const [screen, setScreen] = useState('welcome'); // 'welcome' | 'messaging_register' | 'social_register' | 'home_messaging' | 'home_social'
  const [notice, setNotice] = useState('');
  
  // --- ÉTATS MESSAGERIE ---
  const [messagingAccount, setMessagingAccount] = useState(null);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // --- ÉTATS SOCIAL ---
  const [socialAccount, setSocialAccount] = useState(null);
  const [socialName, setSocialName] = useState('');
  const [socialBirthDate, setSocialBirthDate] = useState('');
  const [socialContact, setSocialContact] = useState('');
  const [socialPassword, setSocialPassword] = useState('');

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

  // --- FONCTIONS MESSAGERIE ---
  async function registerMessaging() {
    if (!fullName.trim() || !phone.trim()) return setNotice('Remplis tous les champs.');
    // ... (Logique d'inscription existante) ...
    // Ici, on simule l'envoi du code
    go('messaging_verify_otp');
  }

  async function verifyOtp() {
    // ... (Logique de vérification OTP existante) ...
    // Après succès :
    const newAcc = { name: fullName, phone: phone, country };
    setMessagingAccount(newAcc);
    go('home_messaging');
  }

  // --- FONCTIONS SOCIAL ---
  async function registerSocial() {
    if (!socialName.trim() || !socialContact.trim() || !socialPassword) return setNotice('Remplis tous les champs.');
    
    setNotice('Vérification du visage...');
    // On simule le scan visage (obligatoire)
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/social/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: socialName, 
            birth_date: socialBirthDate, 
            contact: socialContact, 
            password: socialPassword 
          })
        });
        
        if (res.ok) {
          setSocialAccount({ name: socialName, contact: socialContact });
          go('home_social');
          setNotice('Compte social créé !');
        } else {
          setNotice('Erreur lors de la création.');
        }
      } catch (e) {
        setNotice('Erreur de connexion.');
      }
    }, 1500); // 1.5 seconde pour simuler le scan
  }

  // =========================================================
  // RENDU : ÉCRAN D'ACCUEIL (Choix Messagerie ou Social)
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
            <Text style={styles.bigButtonSubtitle}>Discussions privées et sécurisées</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={() => go('social_auth')}>
            <Text style={styles.bigButtonIcon}>🌍</Text>
            <Text style={styles.bigButtonTitle}>Réseau Social</Text>
            <Text style={styles.bigButtonSubtitle}>Partage public et communauté</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================
  // RENDU : AUTHENTIFICATION (Boutons Créer / Se connecter)
  // =========================================================
  if (screen === 'messaging_auth' || screen === 'social_auth') {
    const isSocial = screen === 'social_auth';
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => go('welcome')} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isSocial ? 'Réseau Social' : 'Messagerie'}</Text>
          <View style={{ width: 35 }} />
        </View>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.title}>{isSocial ? 'Bienvenue sur le Social' : 'Bienvenue sur la Messagerie'}</Text>
          <Text style={styles.body}>
            {isSocial ? 'Partage avec le monde, garde ton identité privée.' : 'Discute en privé avec tes contacts.'}
          </Text>
          <Button title="Créer un compte" onPress={() => go(isSocial ? 'social_register' : 'messaging_register')} />
          <Button title="Se connecter" secondary onPress={() => setNotice('Connexion à venir.')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================
  // RENDU : INSCRIPTION MESSAGERIE
  // =========================================================
  if (screen === 'messaging_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => go('messaging_auth')} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un compte Messagerie</Text>
        </View>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Ton nom" />
          
          <Text style={styles.label}>Pays</Text>
          <TextInput style={styles.input} value={country.name} editable={false} />
          
          <Text style={styles.label}>Téléphone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="620000000" />
          
          <Text style={styles.label}>Date de naissance</Text>
          <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="JJ/MM/AAAA" />
          
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
          
          <Button title="Continuer" onPress={registerMessaging} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================
  // RENDU : INSCRIPTION SOCIAL (avec Scan Visage)
  // =========================================================
  if (screen === 'social_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => go('social_auth')} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un compte Social</Text>
        </View>
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.label}>Nom et prénom</Text>
          <TextInput style={styles.input} value={socialName} onChangeText={setSocialName} placeholder="Ton nom public" />
          
          <Text style={styles.label}>Date de naissance (Privé)</Text>
          <TextInput style={styles.input} value={socialBirthDate} onChangeText={setSocialBirthDate} placeholder="JJ/MM/AAAA" />
          
          <Text style={styles.label}>Email ou Téléphone</Text>
          <TextInput style={styles.input} value={socialContact} onChangeText={setSocialContact} placeholder="Pour récupérer ton compte" />
          
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput style={styles.input} value={socialPassword} onChangeText={setSocialPassword} secureTextEntry />
          
          <View style={styles.scanBox}>
            <Text style={styles.scanIcon}>🙂</Text>
            <Text style={styles.scanText}>Vérification du visage obligatoire</Text>
          </View>
          
          <Button title="Créer mon compte" onPress={registerSocial} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================
  // RENDU : ACCUEIL MESSAGERIE (avec bouton passerelle)
  // =========================================================
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

  // =========================================================
  // RENDU : ACCUEIL SOCIAL (avec bouton passerelle)
  // =========================================================
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
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} 
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
  // ... (Je garde tous tes styles, j'ajoute juste ceux pour les gros boutons et le switch) ...
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
  
  // ... Styles des chats et posts ...
});