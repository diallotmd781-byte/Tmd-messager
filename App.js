import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList, Keyboard, ActivityIndicator
} from 'react-native';

const API_URL = 'https://tmd-messager.onrender.com';

const C = {
  bg: '#F4F7F5', white: '#FFFFFF', green: '#176B50', green2: '#E7F5EE',
  dark: '#17251F', muted: '#75827B', border: '#DDE5E0', red: '#B42318',
  blue: '#EAF2FF', chatBg: '#E5DDD5' // Fond style WhatsApp
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

// --- COMPOSANTS RÉUTILISABLES ---
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
  const [isLoading, setIsLoading] = useState(false);
  
  // --- ÉTATS MESSAGERIE ---
  const [account, setAccount] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [msgAvatar, setMsgAvatar] = useState('👤');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Formulaires
  const [msgName, setMsgName] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPassword, setMsgPassword] = useState('');
  const [msgOtp, setMsgOtp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountries, setShowCountries] = useState(false);

  const [newMessageText, setNewMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  // --- ÉTATS SOCIAL ---
  const [socialAccount, setSocialAccount] = useState(null);
  const [feed, setFeed] = useState([]);
  const [newPostText, setNewPostText] = useState('');

  // --- EFFETS ---
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (screen === 'msg_home' && account) loadChats();
    if (screen === 'soc_home' && socialAccount) loadFeed();
  }, [screen, account, socialAccount]);

  function go(next) { Keyboard.dismiss(); setNotice(''); setScreen(next); }

  // --- LOGIQUE MESSAGERIE ---
  async function loadChats() {
    try {
      const res = await fetch(`${API_URL}/messages/chats/${normalizePhone(account.phone)}`);
      if (!res.ok) return;
      const data = await res.json();
      const grouped = {};
      data.forEach(msg => {
        const key = msg.other_phone;
        if (!grouped[key]) grouped[key] = { id: key, name: msg.other_name, phone: key, avatar: msg.other_avatar, messages: [] };
        grouped[key].messages.push({ id: msg.id.toString(), text: msg.text, mine: msg.mine, time: msg.time });
      });
      setChats(Object.values(grouped));
    } catch (err) { console.log(err); }
  }

  async function verifyMsgOtp() {
    if (msgOtp !== '123456') return setNotice('Code incorrect (utilise 123456).');
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(msgPhone), country_dial: selectedCountry.dial, code: msgOtp, name: msgName, birth_date: '', password: demoHash(msgPassword), avatar: msgAvatar })
      });
      setAccount({ name: msgName, phone: normalizePhone(msgPhone), dial: selectedCountry.dial, avatar: msgAvatar });
      go('msg_home');
    } catch (err) { setNotice("Impossible de valider le code."); } 
    finally { setIsLoading(false); }
  }

  async function sendMsgOtp() {
    if (!msgName.trim() || normalizePhone(msgPhone).length < 5) return setNotice('Remplis ton nom et ton numéro.');
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(msgPhone), country_dial: selectedCountry.dial })
      });
      go('msg_otp');
    } catch (err) { setNotice("Erreur réseau. Render est peut-être endormi."); } 
    finally { setIsLoading(false); }
  }

  // Ouvre un chat ou en crée un nouveau
  function startNewChat() {
    if (!recipientPhone.trim()) return setNotice('Entre un numéro.');
    const phone = normalizePhone(recipientPhone);
    const existing = chats.find(c => c.phone === phone);
    if (existing) {
      setActiveChatId(existing.id);
    } else {
      setChats(prev => [{ id: phone, name: phone, phone: phone, avatar: '👤', messages: [] }, ...prev]);
      setActiveChatId(phone);
    }
    setRecipientPhone('');
    setShowNewChatModal(false);
    go('msg_chat');
  }

  async function sendMessageToChat(recipient) {
    if (!newMessageText.trim()) return;
    const text = newMessageText.trim();
    const newMsg = { id: makeId(), text, mine: true, time: nowTime() };
    
    setChats(prev => prev.map(c => c.phone === recipient ? { ...c, messages: [...c.messages, newMsg] } : c));
    setNewMessageText('');

    try {
      await fetch(`${API_URL}/messages/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_phone: normalizePhone(account.phone), recipient_phone: normalizePhone(recipient), text })
      });
    } catch { console.log('Message non envoyé au serveur'); }
  }

  // --- LOGIQUE SOCIAL ---
  async function loadFeed() {
    try {
      const res = await fetch(`${API_URL}/social/feed`);
      const data = await res.json();
      setFeed(data);
    } catch (err) { console.log(err); }
  }

  async function publishPost() {
    if (!newPostText.trim() || !socialAccount) return;
    try {
      await fetch(`${API_URL}/social/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_contact: socialAccount.contact, text: newPostText })
      });
      setNewPostText('');
      loadFeed();
    } catch { setNotice('Erreur lors de la publication.'); }
  }

  function registerSocial() {
    // Simulation rapide pour tester le social
    setSocialAccount({ name: msgName || 'Utilisateur', contact: msgPhone, avatar: '🌍' });
    go('soc_home');
  }

  // =========================================================
  // INTERFACES (ÉCRANS)
  // =========================================================

  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.logo}><Text style={styles.logoText}>T</Text></View>
          <Text style={styles.brand}>TMD Messenger</Text>
        </View>
        <View style={styles.welcomeCard}>
          <TouchableOpacity style={styles.bigButton} onPress={() => go('msg_register')}>
            <View style={styles.bigButtonIconCircle}><Text style={styles.bigButtonIcon}>💬</Text></View>
            <View>
              <Text style={styles.bigButtonTitle}>Messagerie</Text>
              <Text style={styles.bigButtonSubtitle}>Discussions privées</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bigButton, { marginTop: 16 }]} onPress={() => go('soc_home')}>
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

  // --- INSCRIPTION MESSAGERIE ---
  if (screen === 'msg_register') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Inscription" onBack={() => go('welcome')} />
        <ScrollView contentContainerStyle={styles.page}>
          {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
          <Text style={styles.label}>Photo de profil (Optionnel)</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity style={[styles.avatarOption, msgAvatar === '' && styles.avatarOptionSelected]} onPress={() => setMsgAvatar('')}>
              <Text style={{ fontSize: 12, color: C.muted }}>Aucun</Text>
            </TouchableOpacity>
            {['👤', '😎', '👩', '🧑', '🦁'].map(a => (
              <TouchableOpacity key={a} style={[styles.avatarOption, msgAvatar === a && styles.avatarOptionSelected]} onPress={() => setMsgAvatar(a)}>
                <Text style={styles.avatarOptionText}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Nom complet" value={msgName} onChangeText={setMsgName} placeholder="Ton nom" />
          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity style={styles.select} onPress={() => setShowCountries(true)}>
            <Text style={styles.selectText}>{selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dial})</Text>
          </TouchableOpacity>
          <Field label="Numéro de téléphone" value={msgPhone} onChangeText={setMsgPhone} placeholder="620000000" keyboardType="phone-pad" />
          <Field label="Mot de passe" value={msgPassword} onChangeText={setMsgPassword} isPassword={true} />
          <TouchableOpacity style={styles.button} onPress={sendMsgOtp}>
            <Text style={styles.buttonText}>{isLoading ? "Chargement..." : "Continuer"}</Text>
          </TouchableOpacity>
        </ScrollView>
        
        <Modal visible={showCountries} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <FlatList data={COUNTRIES} keyExtractor={(i) => i.name} renderItem={({ item }) => (
                <TouchableOpacity style={styles.countryItem} onPress={() => { setSelectedCountry(item); setShowCountries(false); }}>
                  <Text style={styles.countryItemText}>{item.flag} {item.name} ({item.dial})</Text>
                </TouchableOpacity>
              )}/>
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
        <View style={styles.page}>
          <Field label="Code (123456)" value={msgOtp} onChangeText={setMsgOtp} placeholder="123456" keyboardType="number-pad" maxLength={6} />
          <TouchableOpacity style={styles.button} onPress={verifyMsgOtp}>
             <Text style={styles.buttonText}>{isLoading ? "Vérification..." : "Vérifier"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- ACCUEIL MESSAGERIE (WHATSAPP STYLE) ---
  if (screen === 'msg_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        
        <View style={styles.appHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.appTitle}>TMD</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={() => setShowNewChatModal(true)}>
              <Text style={{ fontSize: 24 }}>📝</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => go('soc_home')}>
              <Text style={{ fontSize: 24 }}>🌍</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 10 }}
          ListEmptyComponent={<Text style={styles.bodyCenter}>Aucune discussion. Appuie sur 📝 pour commencer.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatRow} onPress={() => { setActiveChatId(item.id); go('msg_chat'); }}>
              <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>{item.avatar || '👤'}</Text></View>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: C.bg, paddingBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>{item.messages.length > 0 ? item.messages[item.messages.length - 1].time : ''}</Text>
                </View>
                <Text style={styles.chatLast} numberOfLines={1}>
                  {item.messages.length > 0 ? item.messages[item.messages.length - 1].text : 'Nouvelle discussion'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* MODAL NOUVEAU CHAT */}
        <Modal visible={showNewChatModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { borderRadius: 20, margin: 20 }]}>
              <Text style={styles.modalTitle}>Nouveau message</Text>
              <Field label="Numéro du destinataire" value={recipientPhone} onChangeText={setRecipientPhone} placeholder="Ex: 611085739" keyboardType="phone-pad" />
              <TouchableOpacity style={styles.button} onPress={startNewChat}>
                <Text style={styles.buttonText}>Discuter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'transparent', marginTop: 5 }]} onPress={() => setShowNewChatModal(false)}>
                <Text style={{ color: C.muted, fontWeight: 'bold' }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- ÉCRAN DE CHAT (SIGNAL STYLE) ---
  if (screen === 'msg_chat') {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return null;

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.safe, { backgroundColor: C.chatBg }]}>
          <View style={[styles.header, { backgroundColor: C.green }]}>
            <TouchableOpacity onPress={() => go('msg_home')} style={styles.backButton}><Text style={[styles.backText, { color: C.white }]}>‹</Text></TouchableOpacity>
            <View style={styles.chatAvatarSmall}><Text style={{ fontSize: 18 }}>{chat.avatar || '👤'}</Text></View>
            <Text style={[styles.headerTitle, { color: C.white, marginLeft: 10 }]}>{chat.name}</Text>
          </View>

          <FlatList
            data={chat.messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item: m }) => (
              <View style={{ 
                alignSelf: m.mine ? 'flex-end' : 'flex-start',
                backgroundColor: m.mine ? '#DCF8C6' : C.white,
                padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%',
                shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1,
              }}>
                <Text style={{ color: C.dark, fontSize: 16 }}>{m.text}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 4, textAlign: 'right' }}>{m.time} {m.mine ? '✓✓' : ''}</Text>
              </View>
            )}
          />
          
          <View style={styles.inputBar}>
            <TextInput 
              style={styles.chatInput} placeholder="Message..." value={newMessageText} onChangeText={setNewMessageText} multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessageToChat(chat.phone)}>
              <Text style={{ color: C.white, fontSize: 20 }}>➤</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // --- RÉSEAU SOCIAL (INSTAGRAM/TWITTER STYLE) ---
  if (screen === 'soc_home') {
    return (
      <SafeAreaView style={styles.safe}>
        {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
        
        <View style={styles.appHeader}>
          <Text style={[styles.appTitle, { color: '#1DA1F2' }]}>Social</Text>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={() => go('msg_home')}>
              <Text style={{ fontSize: 24 }}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => go('welcome')}>
              <Text style={{ fontSize: 24 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={feed}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={
            <View style={styles.postCard}>
              <Text style={styles.label}>Nouvelle publication</Text>
              <TextInput 
                placeholder="Quoi de neuf ?" style={[styles.input, { minHeight: 80, textAlignVertical: 'top', padding: 14 }]} 
                multiline value={newPostText} onChangeText={setNewPostText}
              />
              <TouchableOpacity style={[styles.button, { backgroundColor: '#1DA1F2' }]} onPress={publishPost}>
                <Text style={styles.buttonText}>Publier</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={styles.chatAvatar}><Text style={{ fontSize: 20 }}>{item.author_avatar}</Text></View>
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: C.dark }}>{item.author_name}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>{item.created_at}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 16, color: C.dark, lineHeight: 22 }}>{item.text}</Text>
              <View style={{ flexDirection: 'row', marginTop: 15, gap: 20 }}>
                <Text style={{ color: C.muted }}>❤️ J'aime</Text>
                <Text style={{ color: C.muted }}>💬 Commenter</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.bodyCenter}>Aucune publication pour le moment.</Text>}
        />
      </SafeAreaView>
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
  bodyCenter: { color: C.muted, fontSize: 15, textAlign: 'center', marginTop: 40 },

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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalCard: { backgroundColor: C.white, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 15, textAlign: 'center' },
  countryItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.bg },
  countryItemText: { color: C.dark, fontSize: 16, textAlign: 'center' },
});