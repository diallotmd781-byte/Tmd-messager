import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Modal, FlatList, Image, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
  blue: '#EAF2FF', yellow: '#FFF0D6'
};

const COUNTRIES = [
  { name: 'Guinée', dial: '+224', flag: '🇬🇳' }, { name: 'France', dial: '+33', flag: '🇫🇷' },
  { name: 'Sénégal', dial: '+221', flag: '🇸🇳' }, { name: 'Côte d’Ivoire', dial: '+225', flag: '🇨🇮' },
  { name: 'Mali', dial: '+223', flag: '🇲🇱' }, { name: 'Canada', dial: '+1', flag: '🇨🇦' },
];

const isValidDate = (dateString) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--;
  return age >= 13 && age <= 120;
};

const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const demoHash = (input) => {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
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

  // MESSAGERIE
  const [msgAccount, setMsgAccount] = useState(null);
  const [msgPhoto, setMsgPhoto] = useState(null);
  const [msgName, setMsgName] = useState('');
  const [msgBirth, setMsgBirth] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgOtp, setMsgOtp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountries, setShowCountries] = useState(false);
  const [chats, setChats] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  // SOCIAL
  const [socAccount, setSocAccount] = useState(null);
  const [socPhoto, setSocPhoto] = useState(null);
  const [socName, setSocName] = useState('');
  const [socContact, setSocContact] = useState('');
  const [socOtp, setSocOtp] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const go = (next) => { setNotice(''); setScreen(next); };

  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!result.canceled) {
      if (type === 'msg') setMsgPhoto(result.assets[0].uri);
      else setSocPhoto(result.assets[0].uri);
    }
  };

  // --- MESSAGERIE ---
  const registerMessaging = async () => {
    if (!msgName.trim() || !msgPhone.trim()) return setNotice('Remplis ton nom et ton numéro.');
    if (!isValidDate(msgBirth)) return setNotice('Date invalide (ex: 31/02 interdit).');
    
    setLoading(true);
    setNotice('Connexion au serveur (patiente si Render dort)...');
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: msgPhone.replace(/\D/g, ''), country_dial: selectedCountry.dial })
      });
      go('msg_otp');
    } catch { setNotice('Erreur réseau.'); } finally { setLoading(false); }
  };

  const verifyMsgOtp = async () => {
    if (msgOtp !== '123456') return setNotice('Code incorrect (utilise 123456).');
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: msgPhone.replace(/\D/g, ''), country_dial: selectedCountry.dial, code: msgOtp, name: msgName, birth_date: msgBirth, password: demoHash(msgPassword), avatar: msgPhoto })
      });
      setMsgAccount({ name: msgName, phone: msgPhone, avatar: msgPhoto });
      go('msg_home');
    } catch { setNotice('Erreur réseau.'); } finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!newMessageText.trim() || !recipientPhone.trim()) return setNotice('Remplis le message et le destinataire.');
    const text = newMessageText.trim();
    setLoading(true);
    
    // Ajout local immédiat pour l'interface
    const newMsg = { id: Date.now().toString(), text, mine: true, time: new Date().toLocaleTimeString() };
    setChats(prev => {
      const existing = prev.find(c => c.phone === recipientPhone);
      if (existing) return prev.map(c => c.phone === recipientPhone ? { ...c, messages: [...c.messages, newMsg] } : c);
      return [{ id: Date.now().toString(), name: recipientPhone, phone: recipientPhone, messages: [newMsg] }, ...prev];
    });
    setNewMessageText('');

    try {
      const res = await fetch(`${API_URL}/messages/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_phone: msgPhone.replace(/\D/g, ''), recipient_phone: recipientPhone.replace(/\D/g, ''), text })
      });
      if (res.ok) setNotice('Message envoyé sur le serveur !');
      else setNotice('Message local (destinataire introuvable).');
    } catch { setNotice('Message local (serveur injoignable).'); } finally { setLoading(false); }
  };

  // --- SOCIAL ---
  const registerSocial = async () => {
    if (!socName.trim() || !socContact.trim()) return setNotice('Remplis tes infos.');
    setLoading(true);
    try {
      await fetch(`${API_URL}/social/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: socContact, name: socName, birth_date: '01/01/2000', password: 'demo', avatar: socPhoto })
      });
      setSocAccount({ name: socName, contact: socContact, avatar: socPhoto });
      go('soc_home');
    } catch { setNotice('Erreur réseau.'); } finally { setLoading(false); }
  };

  const toSocial = () => socAccount ? go('soc_home') : go('soc_register');
  const toMessaging = () => msgAccount ? go('msg_home') : go('msg_register');

  // =========================================================
  // RENDU
  // =========================================================
  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
          <Text style={styles.subtitle}>Choisis ton espace.</Text>
        </View>
        <View style={{ padding: 20 }}>
          <TouchableOpacity style={styles.bigButton} onPress={() => go('msg_register')}>
            <View style={styles.bigButtonIconCircle}><Text style={styles.bigButtonIcon}>💬</Text></View>
            <View><Text style={styles.bigButtonTitle}>Messagerie</Text><Text style={styles.bigButtonSubtitle}>Privé</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={toSocial}>
            <View style={[styles.bigButtonIconCircle, { backgroundColor: C.blue }]}><Text style={styles.bigButtonIcon}>🌍</Text></View>
            <View><Text style={styles.bigButtonTitle}>Réseau Social</Text><Text style={styles.bigButtonSubtitle}>Public</Text></View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <TouchableOpacity onPress={() => go('welcome')}><Text style={styles.backText}>‹ Retour</Text></TouchableOpacity>
          <Text style={styles.title}>Compte Messagerie</Text>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}

          <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('msg')}>
            {msgPhoto ? <Image source={{ uri: msgPhoto }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>📷 Photo (optionnel)</Text>}
          </TouchableOpacity>

          <Field label="Nom complet" value={msgName} onChangeText={setMsgName} placeholder="Ton nom" />
          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity style={styles.select} onPress={() => setShowCountries(true)}>
            <Text style={styles.selectText}>{selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dial})</Text>
          </TouchableOpacity>
          <Field label="Téléphone" value={msgPhone} onChangeText={setMsgPhone} placeholder="620000000" keyboardType="phone-pad" />
          <Field label="Date de naissance" value={msgBirth} onChangeText={v => setMsgBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} secureTextEntry />
          
          <Button title="Continuer" onPress={registerMessaging} loading={loading} />
        </ScrollView>

        <Modal visible={showCountries} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <FlatList data={COUNTRIES} keyExtractor={(i) => i.name} renderItem={({ item }) => (
                <TouchableOpacity style={styles.countryItem} onPress={() => { setSelectedCountry(item); setShowCountries(false); }}>
                  <Text style={styles.countryItemText}>{item.flag} {item.name} ({item.dial})</Text>
                </TouchableOpacity>
              )} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_otp') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <TouchableOpacity onPress={() => go('msg_register')}><Text style={styles.backText}>‹ Retour</Text></TouchableOpacity>
          <Text style={styles.title}>Code SMS</Text>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Text style={styles.body}>Code envoyé au {selectedCountry.dial} {msgPhone}.</Text>
          <Field label="Code (123456)" value={msgOtp} onChangeText={setMsgOtp} keyboardType="number-pad" maxLength={6} />
          <Button title="Vérifier" onPress={verifyMsgOtp} loading={loading} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {msgAccount?.avatar ? <Image source={{ uri: msgAccount.avatar }} style={styles.avatarImg} /> : <View style={styles.avatar}><Text>👤</Text></View>}
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.greeting}>Messagerie</Text>
              <Text style={styles.headerTitle}>{msgAccount?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.switchBtn} onPress={toSocial}><Text style={styles.switchText}>🌍 Social</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Envoyer un message</Text>
            <Field label="Destinataire (Numéro)" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" />
            <Field label="Message" value={newMessageText} onChangeText={setNewMessageText} />
            <Button title={loading ? "Envoi..." : "Envoyer"} onPress={sendMessage} loading={loading} />
          </View>

          <Text style={styles.sectionTitle}>Discussions</Text>
          {chats.length === 0 ? <Text style={styles.mutedText}>Aucun message.</Text> : chats.map(chat => (
            <View key={chat.id} style={styles.chatRow}>
              <View style={styles.avatar}><Text>👤</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatLast}>{chat.messages[chat.messages.length - 1]?.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'soc_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <TouchableOpacity onPress={() => go('welcome')}><Text style={styles.backText}>‹ Retour</Text></TouchableOpacity>
          <Text style={styles.title}>Compte Social</Text>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('soc')}>
            {socPhoto ? <Image source={{ uri: socPhoto }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>📷 Photo (optionnel)</Text>}
          </TouchableOpacity>
          <Field label="Nom" value={socName} onChangeText={setSocName} />
          <Field label="Email / Téléphone" value={socContact} onChangeText={setSocContact} />
          <Button title="Créer le compte" onPress={registerSocial} loading={loading} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'soc_home') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {socAccount?.avatar ? <Image source={{ uri: socAccount.avatar }} style={styles.avatarImg} /> : <View style={styles.avatar}><Text>🌍</Text></View>}
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.greeting}>Réseau Social</Text>
              <Text style={styles.headerTitle}>{socAccount?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.switchBtn} onPress={toMessaging}><Text style={styles.switchText}>💬 Messagerie</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nouvelle publication</Text>
            <TextInput placeholder="Quoi de neuf ?" style={[styles.input, { height: 80 }]} multiline />
            <Button title="Publier" onPress={() => setNotice('Post ajouté !')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  logo: { width: 80, height: 80, borderRadius: 25, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: C.white, fontSize: 42, fontWeight: '900' },
  brand: { color: C.dark, fontSize: 28, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 16, marginTop: 6 },
  bigButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  bigButtonIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bigButtonIcon: { fontSize: 30 },
  bigButtonTitle: { color: C.dark, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bigButtonSubtitle: { color: C.muted, fontSize: 14 },
  backText: { fontSize: 16, color: C.green, fontWeight: '700', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: C.dark, marginBottom: 20 },
  label: { color: C.dark, fontWeight: '700', fontSize: 15, marginBottom: 8, marginTop: 12 },
  input: { minHeight: 50, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 13, paddingHorizontal: 14, fontSize: 16 },
  fieldWrap: { marginBottom: 14 },
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { color: C.white, fontSize: 17, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },
  errorText: { color: C.red, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  mutedText: { color: C.muted, fontSize: 14, textAlign: 'center' },
  select: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 15, marginBottom: 14 },
  selectText: { color: C.dark, fontSize: 16 },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  greeting: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { color: C.dark, fontSize: 20, fontWeight: '900' },
  switchBtn: { backgroundColor: C.green2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: C.green, fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 50, height: 50, borderRadius: 25 },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  chatName: { color: C.dark, fontSize: 16, fontWeight: '700' },
  chatLast: { color: C.muted, fontSize: 13, marginTop: 4 },
  photoPicker: { height: 100, width: 100, borderRadius: 50, backgroundColor: C.white, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { color: C.muted, fontSize: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  countryItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: C.bg },
  countryItemText: { color: C.dark, fontSize: 16, textAlign: 'center' },
});