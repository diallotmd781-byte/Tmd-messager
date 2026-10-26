import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Modal, FlatList, Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  
  // --- ÉTATS MESSAGERIE ---
  const [account, setAccount] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [msgAvatar, setMsgAvatar] = useState('👤');

  // Formulaire Messagerie
  const [msgName, setMsgName] = useState('');
  const [msgBirth, setMsgBirth] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgOtp, setMsgOtp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountries, setShowCountries] = useState(false);

  // --- ÉTATS SOCIAL ---
  const [socialAccount, setSocialAccount] = useState(null);
  const [socAvatar, setSocAvatar] = useState('🌍');
  const [socName, setSocName] = useState('');
  const [socContact, setSocContact] = useState('');
  const [socPassword, setSocPassword] = useState('');

  // --- ÉTATS CHAT ---
  const [newMessageText, setNewMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  // Charger l'historique à l'arrivée sur l'accueil
  useEffect(() => {
    if (screen === 'msg_home' && account) {
      loadChats();
    }
  }, [screen, account]);

  function go(next) { Keyboard.dismiss(); setNotice(''); setScreen(next); }

  // --- FONCTIONS MESSAGERIE ---
  async function loadChats() {
    try {
      const res = await fetch(`${API_URL}/messages/chats/${normalizePhone(account.phone)}`);
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      
      const grouped = {};
      data.forEach(msg => {
        const key = msg.other_phone;
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            name: msg.other_name,
            phone: key,
            avatar: msg.other_avatar,
            messages: []
          };
        }
        grouped[key].messages.push({
          id: msg.id.toString(),
          text: msg.text,
          mine: msg.mine,
          time: msg.time
        });
      });

      setChats(Object.values(grouped));
    } catch (err) {
      console.log("Erreur chargement chats", err);
    }
  }

  async function sendMsgOtp() {
    if (!msgName.trim() || normalizePhone(msgPhone).length < 5) return setNotice('Remplis ton nom et ton numéro.');
    setNotice('Envoi du code...');
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(msgPhone), country_dial: selectedCountry.dial })
      });
      go('msg_otp');
    } catch { setNotice('Erreur de connexion.'); }
  }

  async function verifyMsgOtp() {
    if (msgOtp !== '123456') return setNotice('Code incorrect (utilise 123456).');
    try {
      await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: normalizePhone(msgPhone), 
          country_dial: selectedCountry.dial, 
          code: msgOtp,
          name: msgName, 
          birth_date: msgBirth, 
          password: demoHash(msgPassword),
          avatar: msgAvatar // On envoie l'avatar maintenant
        })
      });
      setAccount({ name: msgName, phone: normalizePhone(msgPhone), dial: selectedCountry.dial, avatar: msgAvatar });
      go('msg_home');
    } catch { setNotice('Erreur serveur.'); }
  }

  // Envoyer un message depuis l'écran d'accueil (nouveau destinataire)
  async function sendMessageFromHome() {
    if (!newMessageText.trim() || !recipientPhone.trim()) return setNotice('Remplis le message et le destinataire.');
    const text = newMessageText.trim();
    const phone = normalizePhone(recipientPhone);
    
    const newMsg = { id: makeId(), text, mine: true, time: nowTime() };
    setChats(prev => {
      const existing = prev.find(c => normalizePhone(c.phone) === phone);
      if (existing) {
        return prev.map(c => normalizePhone(c.phone) === phone ? { ...c, messages: [...c.messages, newMsg] } : c);
      } else {
        return [{ id: phone, name: phone, phone: phone, avatar: '👤', messages: [newMsg] }, ...prev];
      }
    });
    setNewMessageText('');
    setRecipientPhone('');

    try {
      await fetch(`${API_URL}/messages/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_phone: normalizePhone(account.phone), recipient_phone: phone, text })
      });
      setNotice('Message envoyé !');
    } catch { setNotice('Message local (serveur injoignable).'); }
  }

  // Envoyer un message depuis l'écran de chat
  async function sendMessageToChat(recipient) {
    if (!newMessageText.trim()) return;
    const text = newMessageText.trim();
    
    const newMsg = { id: makeId(), text, mine: true, time: nowTime() };
    setChats(prev => prev.map(c => c.phone === recipient ? { ...c, messages: [...c.messages, newMsg] } : c));
    setNewMessageText('');

    try {
      await fetch(`${API_URL}/messages/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sender_phone: normalizePhone(account.phone), 
          recipient_phone: normalizePhone(recipient), 
          text 
        })
      });
    } catch { 
      setNotice('Message non envoyé. Vérifie ta connexion.'); 
    }
  }

  // --- FONCTIONS SOCIAL ---
  function registerSocial() {
    if (!socName.trim() || !socContact.trim()) return setNotice('Remplis ton nom et ton contact.');
    setSocialAccount({ name: socName, contact: socContact, avatar: socAvatar });
    go('soc_home');
  }

  function toSocial() { socialAccount ? go('soc_home') : go('soc_register'); }
  function toMessaging() { account ? go('msg_home') : go('msg_register'); }

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
          <TouchableOpacity style={styles.bigButton} onPress={() => go('msg_register')}>
            <View style={styles.bigButtonIconCircle}><Text style={styles.bigButtonIcon}>💬</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Messagerie</Text>
              <Text style={styles.bigButtonSubtitle}>Discussions privées</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={toSocial}>
            <View style={[styles.bigButtonIconCircle, { backgroundColor: C.blue }]}><Text style={styles.bigButtonIcon}>🌍</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Réseau Social</Text>
              <Text style={styles.bigButtonSubtitle}>Partage public</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- MESSAGERIE ---
  if (screen === 'msg_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Messagerie" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}

          <Text style={styles.label}>Choisis un avatar</Text>
          <View style={styles.avatarRow}>
            {['👤', '😎', '👩', '🧑', '👨', '🦁', '🐼', '🌟'].map(a => (
              <TouchableOpacity key={a} style={[styles.avatarOption, msgAvatar === a && styles.avatarOptionSelected]} onPress={() => setMsgAvatar(a)}>
                <Text style={styles.avatarOptionText}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label="Nom complet" value={msgName} onChangeText={setMsgName} placeholder="Ton nom" />
          
          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity style={styles.select} onPress={() => setShowCountries(true)}>
            <Text style={styles.selectText}>{selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dial})</Text>
            <Text style={styles.chevron}>⌄</Text>
          </TouchableOpacity>

          <Field label="Numéro de téléphone" value={msgPhone} onChangeText={setMsgPhone} placeholder="620000000" keyboardType="phone-pad" />
          <Field label="Date de naissance" value={msgBirth} onChangeText={v => setMsgBirth(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} />
          <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} secureTextEntry />
          
          <Button title="Continuer" onPress={sendMsgOtp} />
        </ScrollView>

        <Modal visible={showCountries} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Choisir un pays</Text>
              <FlatList
                data={COUNTRIES}
                keyExtractor={(i) => i.name}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.countryItem} onPress={() => { setSelectedCountry(item); setShowCountries(false); }}>
                    <Text style={styles.countryItemText}>{item.flag} {item.name} ({item.dial})</Text>
                  </TouchableOpacity>
                )}
              />
              <Button title="Fermer" secondary onPress={() => setShowCountries(false)} />
            </View>
          </View>
        </Modal>
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
          <Field label="Code (123456)" value={msgOtp} onChangeText={setMsgOtp} placeholder="123456" keyboardType="number-pad" maxLength={6} />
          <Button title="Vérifier" onPress={verifyMsgOtp} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'msg_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        <View style={styles.homeHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>{account?.avatar}</Text></View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.greeting}>Messagerie</Text>
              <Text style={styles.homeName}>{account?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.switchButton} onPress={toSocial}><Text style={styles.switchText}>🌍 Social</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.homeContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nouveau message</Text>
            <Field label="Numéro du destinataire" value={recipientPhone} onChangeText={setRecipientPhone} placeholder="620000000" keyboardType="phone-pad" />
            <Field label="Message" value={newMessageText} onChangeText={setNewMessageText} placeholder="Ton message" />
            <Button title="Envoyer" onPress={sendMessageFromHome} />
          </View>

          <Text style={styles.sectionTitle}>Tes discussions</Text>
          {chats.length === 0 ? (
            <Text style={styles.bodyCenter}>Aucune discussion pour le moment.</Text>
          ) : (
            chats.map(chat => (
              <TouchableOpacity 
                key={chat.id} 
                style={styles.chatRow}
                onPress={() => { setActiveChatId(chat.id); go('msg_chat'); }}
              >
                <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>{chat.avatar || '👤'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatLast} numberOfLines={1}>
                    {chat.messages[chat.messages.length - 1]?.text || 'Nouveau'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- ÉCRAN DE CHAT ---
  if (screen === 'msg_chat') {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return null;

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safe}>
          <Header 
            title={chat.name} 
            onBack={() => go('msg_home')} 
          />
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {chat.messages.map(m => (
              <View key={m.id} style={{ 
                alignSelf: m.mine ? 'flex-end' : 'flex-start',
                backgroundColor: m.mine ? C.green : C.white,
                padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%',
                borderWidth: m.mine ? 0 : 1, borderColor: C.border
              }}>
                <Text style={{ color: m.mine ? C.white : C.dark, fontSize: 16 }}>{m.text}</Text>
                <Text style={{ color: m.mine ? '#A5D6C3' : C.muted, fontSize: 11, marginTop: 4, textAlign: 'right' }}>{m.time}</Text>
              </View>
            ))}
          </ScrollView>
          
          <View style={{ flexDirection: 'row', padding: 14, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border }}>
            <TextInput 
              style={[styles.input, { flex: 1, marginRight: 10, minHeight: 45 }]} 
              placeholder="Écris un message..." 
              value={newMessageText}
              onChangeText={setNewMessageText}
            />
            <TouchableOpacity 
              style={{ backgroundColor: C.green, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 13 }}
              onPress={() => sendMessageToChat(chat.phone)}
            >
              <Text style={{ color: C.white, fontWeight: '800' }}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // --- SOCIAL ---
  if (screen === 'soc_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription Sociale" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}

          <Text style={styles.label}>Choisis un avatar</Text>
          <View style={styles.avatarRow}>
            {['🌍', '🦄', '🐯', '🎨', '🎧', '🚀', '🔥', '🌈'].map(a => (
              <TouchableOpacity key={a} style={[styles.avatarOption, socAvatar === a && styles.avatarOptionSelected]} onPress={() => setSocAvatar(a)}>
                <Text style={styles.avatarOptionText}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label="Nom et prénom" value={socName} onChangeText={setSocName} placeholder="Ton nom public" />
          <Field label="Email ou Téléphone" value={socContact} onChangeText={setSocContact} placeholder="Contact" />
          <Field label="Mot de passe" value={socPassword} onChangeText={setSocPassword} secureTextEntry />
          
          <Button title="Créer mon compte Social" onPress={registerSocial} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'soc_home') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.homeHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarSmall, { backgroundColor: C.blue }]}><Text style={styles.avatarSmallText}>{socialAccount?.avatar}</Text></View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.greeting}>Réseau Social</Text>
              <Text style={styles.homeName}>{socialAccount?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.switchButton} onPress={toMessaging}><Text style={styles.switchText}>💬 Messagerie</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.homeContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nouvelle publication</Text>
            <TextInput placeholder="Quoi de neuf ?" style={[styles.input, { minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]} multiline />
            <Button title="Publier" onPress={() => setNotice('Publication (bientôt) !')} />
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
  label: { color: C.dark, fontWeight: '700', fontSize: 15, marginBottom: 8, marginTop: 12 },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 13, paddingHorizontal: 14, color: C.dark, fontSize: 16 },
  
  button: { backgroundColor: C.green, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: C.white, fontSize: 17, fontWeight: '800' },
  buttonSecondary: { backgroundColor: C.green2, borderWidth: 1, borderColor: '#D1E8DC' },
  buttonSecondaryText: { color: C.green },

  body: { color: C.muted, fontSize: 16, marginBottom: 12 },
  bodyCenter: { color: C.muted, fontSize: 15, textAlign: 'center', marginBottom: 18 },
  errorText: { color: C.red, fontSize: 13, textAlign: 'center', marginBottom: 10, fontWeight: '600' },

  select: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 15, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  selectText: { color: C.dark, fontSize: 16 },
  chevron: { color: C.muted, fontSize: 18 },
  
  homeHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border },
  greeting: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  homeName: { color: C.dark, fontSize: 20, fontWeight: '900' },
  switchButton: { backgroundColor: C.green2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  switchText: { color: C.green, fontWeight: '800', fontSize: 13 },
  homeContent: { padding: 20 },
  sectionTitle: { color: C.dark, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#E9EFEB' },
  
  avatarSmall: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { fontSize: 22 },
  chatRow: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#EAF0EC' },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chatAvatarText: { fontSize: 22 },
  chatName: { color: C.dark, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  chatLast: { color: C.muted, fontSize: 13 },

  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  avatarOption: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border },
  avatarOptionSelected: { borderColor: C.green, backgroundColor: C.green2 },
  avatarOptionText: { fontSize: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 16, textAlign: 'center' },
  countryItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  countryItemText: { color: C.dark, fontSize: 16, textAlign: 'center' },
});