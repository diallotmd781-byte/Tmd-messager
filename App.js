import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator
} from 'react-native';

const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
};

const COUNTRIES = [
  { name: 'Guinée', dial: '+224' }, { name: 'France', dial: '+33' },
  { name: 'Sénégal', dial: '+221' }, { name: 'Côte d’Ivoire', dial: '+225' },
];

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

function Button({ title, onPress, secondary = false, loading = false }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={loading} style={[styles.button, secondary && styles.buttonSecondary, loading && { opacity: 0.7 }]}>
      {loading ? <ActivityIndicator color={secondary ? C.green : C.white} /> : <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>}
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', maxLength }) {
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#9AA59F" secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} maxLength={maxLength} autoCapitalize="none"
        autoCorrect={false} style={styles.input} />
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('welcome'); 
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ÉTATS MESSAGERIE ---
  const [msgUser, setMsgUser] = useState(null);
  const [msgName, setMsgName] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgBirth, setMsgBirth] = useState('');
  const [msgOtp, setMsgOtp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountries, setShowCountries] = useState(false);

  // --- ÉTATS SOCIAL ---
  const [socUser, setSocUser] = useState(null);
  const [socName, setSocName] = useState('');
  const [socContact, setSocContact] = useState('');
  const [socPassword, setSocPassword] = useState('');
  const [socBirth, setSocBirth] = useState('');

  // --- ÉTATS CHAT & FEED ---
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function go(next) { setNotice(''); setScreen(next); }

  // --- MESSAGERIE ---
  async function sendMsgOtp() {
    if (!msgName || !msgPhone || !msgPassword) return setNotice('Remplis tous les champs.');
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: msgPhone, country_dial: selectedCountry.dial })
      });
      go('msg_scan');
    } catch { setNotice('Erreur de connexion.'); } finally { setLoading(false); }
  }

  function finishMsgScan() { go('msg_otp'); setNotice('Visage vérifié !'); }

  async function verifyMsgOtp() {
    if (msgOtp !== '123456') return setNotice('Code incorrect (utilise 123456).');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: msgPhone, country_dial: selectedCountry.dial, code: msgOtp, name: msgName, birth_date: msgBirth, password: demoHash(msgPassword) })
      });
      if (res.ok) {
        setMsgUser({ name: msgName, phone: msgPhone });
        go('msg_home');
      } else { setNotice('Erreur serveur.'); }
    } catch { setNotice('Erreur de connexion.'); } finally { setLoading(false); }
  }

  async function sendMessage() {
    if (!newMessageText || !recipientPhone) return setNotice('Remplis le texte et le destinataire.');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_phone: msgUser.phone, recipient_phone: recipientPhone, text: newMessageText })
      });
      if (res.ok) {
        setMessages([...messages, { text: newMessageText, mine: true }]);
        setNewMessageText('');
        setNotice('Message envoyé !');
      } else { setNotice('Destinataire introuvable.'); }
    } catch { setNotice('Erreur de connexion.'); } finally { setLoading(false); }
  }

  // --- SOCIAL ---
  function createPost() {
    const newPost = { id: Date.now(), author: socUser.name, text: 'Nouveau post publié !', likes: 0 };
    setPosts([newPost, ...posts]);
    setNotice('Post publié !');
  }

  // --- PASSERELLE ---
  function toSocial() { socUser ? go('soc_home') : go('soc_register'); }
  function toMessaging() { msgUser ? go('msg_home') : go('msg_register'); }

  // =========================================================
  // ÉCRANS
  // =========================================================
  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
          <Text style={styles.subtitle}>Choisis ton espace.</Text>
        </View>
        <View style={styles.welcomeCard}>
          <TouchableOpacity style={styles.bigButton} onPress={() => go('msg_login')}>
            <View style={styles.bigButtonIconCircle}><Text style={styles.bigButtonIcon}>💬</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Messagerie</Text>
              <Text style={styles.bigButtonSubtitle}>Discussions privées</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={() => go('soc_login')}>
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
  if (screen === 'msg_login') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><TouchableOpacity onPress={() => go('welcome')}><Text style={styles.backText}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>Messagerie</Text></View>
        <ScrollView contentContainerStyle={styles.page}>
          <Button title="Créer un compte" onPress={() => go('msg_register')} />
          <Button title="Se connecter (bientôt)" secondary onPress={() => setNotice('Bientôt.')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><TouchableOpacity onPress={() => go('msg_login')}><Text style={styles.backText}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>Inscription</Text></View>
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Nom complet" value={msgName} onChangeText={setMsgName} placeholder="Ton nom" />
          <TouchableOpacity style={styles.countrySelect} onPress={() => setShowCountries(true)}>
            <Text style={styles.countryText}>{selectedCountry.name} ({selectedCountry.dial})</Text>
          </TouchableOpacity>
          <Field label="Téléphone" value={msgPhone} onChangeText={setMsgPhone} placeholder="620000000" keyboardType="phone-pad" />
          <Field label="Date de naissance" value={msgBirth} onChangeText={v => setMsgBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} secureTextEntry />
          <Button title="Continuer" onPress={sendMsgOtp} loading={loading} />
        </ScrollView>
        <Modal visible={showCountries} transparent animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.modalCard}>
            <FlatList data={COUNTRIES} keyExtractor={(i) => i.name} renderItem={({ item }) => (
              <TouchableOpacity style={styles.countryItem} onPress={() => { setSelectedCountry(item); setShowCountries(false); }}>
                <Text style={styles.countryItemText}>{item.name} ({item.dial})</Text>
              </TouchableOpacity>
            )} />
          </View></View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_scan') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.faceHero}>
          <View style={styles.faceIcon}><Text style={{ fontSize: 54 }}>🙂</Text></View>
          <Text style={styles.title}>Vérification du visage</Text>
          <Button title="Terminer le scan" onPress={finishMsgScan} />
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_otp') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><TouchableOpacity onPress={() => go('msg_register')}><Text style={styles.backText}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>Code SMS</Text></View>
        <ScrollView contentContainerStyle={styles.page}>
          <Field label="Code (123456)" value={msgOtp} onChangeText={setMsgOtp} placeholder="123456" keyboardType="number-pad" maxLength={6} />
          <Button title="Vérifier" onPress={verifyMsgOtp} loading={loading} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- MESSAGERIE (Accueil type WhatsApp) ---
  if (screen === 'msg_home') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.whatsappHeader}>
          <Text style={styles.whatsappTitle}>WhatsApp (TMD)</Text>
          <TouchableOpacity style={styles.switchButton} onPress={toSocial}><Text style={styles.switchText}>🌍 Social</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.chatList}>
          <View style={styles.chatRow}>
            <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>A</Text></View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>Aminata</Text>
              <Text style={styles.chatLast}>Salut, ça va ?</Text>
            </View>
          </View>
          <View style={styles.chatRow}>
            <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>M</Text></View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>Mamadou</Text>
              <Text style={styles.chatLast}>On se voit demain.</Text>
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.fab} onPress={() => setNotice('Fonction en cours...')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- SOCIAL (Inscription) ---
  if (screen === 'soc_login') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><TouchableOpacity onPress={() => go('welcome')}><Text style={styles.backText}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>Réseau Social</Text></View>
        <ScrollView contentContainerStyle={styles.page}>
          <Button title="Créer un compte" onPress={() => go('soc_register')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'soc_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><TouchableOpacity onPress={() => go('soc_login')}><Text style={styles.backText}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>Inscription Sociale</Text></View>
        <ScrollView contentContainerStyle={styles.page}>
          <Field label="Nom" value={socName} onChangeText={setSocName} placeholder="Nom" />
          <Field label="Date de naissance" value={socBirth} onChangeText={v => setSocBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Field label="Email/Téléphone" value={socContact} onChangeText={setSocContact} placeholder="Contact" />
          <Field label="Mot de passe" value={socPassword} onChangeText={setSocPassword} secureTextEntry />
          <Button title="Créer le compte" onPress={() => { setSocUser({ name: socName }); go('soc_home'); }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- SOCIAL (Accueil type Instagram/Facebook) ---
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
              <View style={styles.postAvatar}><Text style={styles.postAvatarText}>T</Text></View>
              <Text style={styles.postAuthor}>Thierno</Text>
            </View>
            <Text style={styles.postText}>Bienvenue sur le réseau social TMD ! 🚀</Text>
            <View style={styles.postActions}>
              <Text style={styles.actionText}>❤️ J'aime</Text>
              <Text style={styles.actionText}>💬 Commenter</Text>
            </View>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.fab} onPress={createPost}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { padding: 20 },
  hero: { alignItems: 'center', paddingTop: 50, paddingBottom: 20 },
  logo: { width: 80, height: 80, borderRadius: 25, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: C.white, fontSize: 42, fontWeight: '900' },
  brand: { color: C.dark, fontSize: 28, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 16, marginTop: 6, textAlign: 'center' },
  welcomeCard: { padding: 20 },
  
  // Accueil Welcome
  bigButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  bigButtonIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bigButtonIcon: { fontSize: 30 },
  bigButtonTitle: { color: C.dark, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bigButtonSubtitle: { color: C.muted, fontSize: 14 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backText: { fontSize: 34, color: C.green, marginRight: 12, lineHeight: 38, marginTop: -4 },
  headerTitle: { color: C.dark, fontSize: 19, fontWeight: '800' },

  // Inputs
  fieldWrap: { marginBottom: 14 },
  label: { color: C.dark, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 13, paddingHorizontal: 14, color: C.dark, fontSize: 16 },
  
  // Boutons
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: C.white, fontSize: 17, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },

  // Face Scan
  faceHero: { flex: 1, justifyContent: 'center', padding: 24 },
  faceIcon: { width: 104, height: 104, borderRadius: 52, borderWidth: 6, borderColor: '#368460', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 28 },
  title: { color: C.dark, fontSize: 26, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  bodyCenter: { color: C.muted, fontSize: 15, textAlign: 'center', marginBottom: 18 },

  // Country Selector
  countrySelect: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 15, marginBottom: 14 },
  countryText: { color: C.dark, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 16, textAlign: 'center' },
  countryItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  countryItemText: { color: C.dark, fontSize: 16, textAlign: 'center' },

  // Erreurs
  errorText: { color: C.red, fontSize: 13, textAlign: 'center', marginBottom: 10, fontWeight: '600' },

  // WhatsApp (Messagerie Home)
  whatsappHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  whatsappTitle: { fontSize: 24, fontWeight: '900', color: C.green },
  switchButton: { backgroundColor: C.green2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: C.green, fontWeight: '800', fontSize: 13 },
  chatList: { padding: 10 },
  chatRow: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: C.white, borderRadius: 12, marginBottom: 8 },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chatAvatarText: { color: C.green, fontSize: 20, fontWeight: '800' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '700', color: C.dark },
  chatLast: { fontSize: 14, color: C.muted, marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  fabText: { color: C.white, fontSize: 30, fontWeight: '400', marginTop: -2 },

  // Instagram (Social Home)
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
});