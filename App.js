import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';

const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
};

const COUNTRIES = [{ name: 'Guinée', dial: '+224' }, { name: 'France', dial: '+33' }];

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

function Button({ title, onPress, secondary = false }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
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

function Header({ title, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 35 }} />
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('welcome'); 
  const [notice, setNotice] = useState('');

  // ÉTATS MESSAGERIE
  const [msgUser, setMsgUser] = useState(null);
  const [msgName, setMsgName] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgBirth, setMsgBirth] = useState('');
  const [msgOtp, setMsgOtp] = useState('');

  // ÉTATS SOCIAL
  const [socUser, setSocUser] = useState(null);
  const [socName, setSocName] = useState('');
  const [socContact, setSocContact] = useState('');
  const [socPassword, setSocPassword] = useState('');
  const [socBirth, setSocBirth] = useState('');
  const [socOtp, setSocOtp] = useState('');

  // ÉTATS CHAT
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  function go(next) { setNotice(''); setScreen(next); }

  // --- MESSAGERIE : Envoi du code ---
  async function sendMsgOtp() {
    if (!msgName || !msgPhone || !msgPassword) return setNotice('Remplis tous les champs.');
    setNotice('Envoi du code...');
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: msgPhone, country_dial: COUNTRIES[0].dial })
      });
      go('msg_scan');
    } catch { setNotice('Erreur de connexion.'); }
  }

  // --- SCAN VISAGE (Simulation) ---
  function finishMsgScan() { go('msg_otp'); setNotice('Visage vérifié (simulation) !'); }
  function finishSocScan() { go('soc_otp'); setNotice('Visage vérifié (simulation) !'); }

  // --- MESSAGERIE : Vérification OTP ---
  async function verifyMsgOtp() {
    if (msgOtp !== '123456') return setNotice('Code incorrect (utilise 123456).');
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: msgPhone, country_dial: COUNTRIES[0].dial, code: msgOtp, name: msgName, birth_date: msgBirth, password: demoHash(msgPassword) })
      });
      if (res.ok) {
        setMsgUser({ name: msgName, phone: msgPhone });
        go('msg_home');
      } else { setNotice('Erreur serveur.'); }
    } catch { setNotice('Erreur de connexion.'); }
  }

  // --- SOCIAL : Envoi du code ---
  async function sendSocOtp() {
    if (!socName || !socContact || !socPassword) return setNotice('Remplis tous les champs.');
    setNotice('Envoi du code...');
    try {
      await fetch(`${API_URL}/social/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: socContact, name: socName, birth_date: socBirth, password: socPassword })
      });
      go('soc_scan');
    } catch { setNotice('Erreur de connexion.'); }
  }

  // --- SOCIAL : Vérification OTP ---
  async function verifySocOtp() {
    if (socOtp !== '123456') return setNotice('Code incorrect (utilise 123456).');
    try {
      const res = await fetch(`${API_URL}/social/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: socContact, name: socName, birth_date: socBirth, password: socPassword, code: socOtp })
      });
      if (res.ok) {
        setSocUser({ name: socName, contact: socContact });
        go('soc_home');
      } else { setNotice('Erreur serveur.'); }
    } catch { setNotice('Erreur de connexion.'); }
  }

  // --- ENVOYER UN MESSAGE ---
  async function sendMessage() {
    if (!newMessageText || !recipientPhone) return setNotice('Remplis le texte et le destinataire.');
    setNotice('Envoi...');
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
    } catch { setNotice('Erreur de connexion.'); }
  }

  // --- PASSERELLE ---
  function toSocial() {
    if (socUser) go('soc_home');
    else go('soc_register');
  }
  function toMessaging() {
    if (msgUser) go('msg_home');
    else go('msg_register');
  }

  // =========================================================
  // ÉCRANS
  // =========================================================
  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
        </View>
        <View style={styles.card}>
          <Button title="Messagerie" onPress={() => go('msg_login')} />
          <Button title="Réseau Social" secondary onPress={() => go('soc_login')} />
        </View>
      </SafeAreaView>
    );
  }

  // --- LOGIN MESSAGERIE ---
  if (screen === 'msg_login') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Messagerie" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          <Button title="Créer un compte" onPress={() => go('msg_register')} />
          <Button title="Se connecter (bientôt)" secondary onPress={() => setNotice('Fonctionnalité à venir.')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- REGISTER MESSAGERIE ---
  if (screen === 'msg_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Messagerie" onBack={() => go('msg_login')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Nom complet" value={msgName} onChangeText={setMsgName} placeholder="Ton nom" />
          <Field label="Téléphone" value={msgPhone} onChangeText={setMsgPhone} placeholder="620000000" keyboardType="phone-pad" />
          <Field label="Date de naissance" value={msgBirth} onChangeText={v => setMsgBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} secureTextEntry />
          <Button title="Continuer vers le scan" onPress={sendMsgOtp} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- SCAN VISAGE (Avant OTP) ---
  if (screen === 'msg_scan' || screen === 'soc_scan') {
    const isMsg = screen === 'msg_scan';
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.faceHero}>
          <View style={styles.faceIcon}><Text style={{ fontSize: 54 }}>🙂</Text></View>
          <Text style={styles.title}>Vérification du visage</Text>
          <Text style={styles.bodyCenter}>Simulation du scan de présence réelle avant l'envoi du code SMS.</Text>
          <Button title="Terminer le scan" onPress={isMsg ? finishMsgScan : finishSocScan} />
        </View>
      </SafeAreaView>
    );
  }

  // --- OTP MESSAGERIE ---
  if (screen === 'msg_otp') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Code SMS" onBack={() => go('msg_register')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Text style={styles.body}>Code envoyé au {msgPhone}.</Text>
          <Field label="Code (123456)" value={msgOtp} onChangeText={setMsgOtp} placeholder="123456" keyboardType="number-pad" maxLength={6} />
          <Button title="Vérifier et créer le compte" onPress={verifyMsgOtp} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- ACCUEIL MESSAGERIE ---
  if (screen === 'msg_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        <View style={styles.homeHeader}>
          <Text style={styles.homeName}>Messagerie : {msgUser?.name}</Text>
          <TouchableOpacity style={styles.switchButton} onPress={toSocial}><Text style={styles.switchText}>🌍 Social</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.homeContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Envoyer un message</Text>
            <Field label="Numéro du destinataire" value={recipientPhone} onChangeText={setRecipientPhone} placeholder="620000000" keyboardType="phone-pad" />
            <Field label="Message" value={newMessageText} onChangeText={setNewMessageText} placeholder="Ton message" />
            <Button title="Envoyer" onPress={sendMessage} />
          </View>
          {messages.map((m, i) => (
            <View key={i} style={styles.messageBubble}>
              <Text style={styles.messageText}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- LOGIN SOCIAL ---
  if (screen === 'soc_login') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Réseau Social" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          <Button title="Créer un compte" onPress={() => go('soc_register')} />
          <Button title="Se connecter (bientôt)" secondary onPress={() => setNotice('Fonctionnalité à venir.')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- REGISTER SOCIAL ---
  if (screen === 'soc_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Sociale" onBack={() => go('soc_login')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Field label="Nom et prénom" value={socName} onChangeText={setSocName} placeholder="Ton nom public" />
          <Field label="Date de naissance (Privée)" value={socBirth} onChangeText={v => setSocBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Field label="Email ou Téléphone" value={socContact} onChangeText={setSocContact} placeholder="Contact" />
          <Field label="Mot de passe" value={socPassword} onChangeText={setSocPassword} secureTextEntry />
          <Button title="Continuer vers le scan" onPress={sendSocOtp} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- OTP SOCIAL ---
  if (screen === 'soc_otp') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Code Social" onBack={() => go('soc_register')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Text style={styles.body}>Code envoyé au {socContact}.</Text>
          <Field label="Code (123456)" value={socOtp} onChangeText={setSocOtp} placeholder="123456" keyboardType="number-pad" maxLength={6} />
          <Button title="Vérifier et créer le compte" onPress={verifySocOtp} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- ACCUEIL SOCIAL ---
  if (screen === 'soc_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        <View style={styles.homeHeader}>
          <Text style={styles.homeName}>Social : {socUser?.name}</Text>
          <TouchableOpacity style={styles.switchButton} onPress={toMessaging}><Text style={styles.switchText}>💬 Messagerie</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.homeContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nouvelle publication</Text>
            <TextInput placeholder="Quoi de neuf ?" style={[styles.input, { minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]} multiline />
            <Button title="Publier" onPress={() => setNotice('Publication simulée !')} />
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
  brand: { color: C.dark, fontSize: 32, fontWeight: '900' },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#E9EFEB' },
  title: { color: C.dark, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  body: { color: C.muted, fontSize: 16, marginBottom: 12 },
  bodyCenter: { color: C.muted, fontSize: 15, textAlign: 'center', marginTop: 10, marginBottom: 18 },
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: C.white, fontSize: 17, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },
  fieldWrap: { marginBottom: 14 },
  label: { color: C.dark, fontWeight: '700', fontSize: 15, marginBottom: 8, marginTop: 12 },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, borderRadius: 13, paddingHorizontal: 14, color: C.dark, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, color: C.green, lineHeight: 38, marginTop: -4 },
  headerTitle: { color: C.dark, fontSize: 19, fontWeight: '800', flex: 1 },
  faceHero: { flex: 1, justifyContent: 'center', padding: 24 },
  faceIcon: { width: 104, height: 104, borderRadius: 52, borderWidth: 6, borderColor: '#368460', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 28 },
  homeHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border },
  homeName: { color: C.dark, fontSize: 20, fontWeight: '900' },
  switchButton: { backgroundColor: C.green2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: C.green, fontWeight: '800', fontSize: 13 },
  homeContent: { padding: 20 },
  sectionTitle: { color: C.dark, fontSize: 22, fontWeight: '800', marginBottom: 16 },
  errorText: { color: C.red, fontSize: 13, textAlign: 'center', marginBottom: 10, fontWeight: '600' },
  messageBubble: { backgroundColor: C.green2, padding: 12, borderRadius: 12, marginBottom: 8, alignSelf: 'flex-end' },
  messageText: { color: C.dark, fontSize: 15 },
});