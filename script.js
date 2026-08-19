const habitInput = document.getElementById('habitInput');
const addBtn = document.getElementById('addBtn');
const habitsList = document.getElementById('habitsList');

// 👑 ADMIN KULLANICI ADI (bu kullanıcı adıyla kayıt olan/hesap admin rozetini görür)
const ADMIN_USERNAME = "Efehaei";

// 🔥 FIREBASE YAPILANDIRMASI
const firebaseConfig = {
    apiKey: "AIzaSyDWCo4uxYnBzZE2GrySIyPpG01yvts9AyQ",
    authDomain: "step-35a2b.firebaseapp.com",
    projectId: "step-35a2b",
    storageBucket: "step-35a2b.firebasestorage.app",
    messagingSenderId: "759360554165",
    appId: "1:759360554165:web:cb4ff313d75e43b97d6afc",
    measurementId: "G-Y1HTMZMJBZ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🎵 SES
function playSuccessSound() {
    try {
        const audio = new Audio('success.mp3');
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Ses oynatma hatası:", e));
    } catch (e) {
        console.log("Ses yükleme hatası:", e);
    }
}

// GÜVENLİ STORAGE (sadece tema tercihi için kullanılıyor)
function setSafeStorage(key, val) {
    try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch (e) {}
}
function getSafeStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return raw; }
    } catch (e) {
        return null;
    }
}

let currentUser = null; // { uid, username }
let habits = [];

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (!errorEl) return;
    errorEl.innerText = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => { errorEl.classList.add('hidden'); }, 3500);
}

// TEMA (DARK / LIGHT MODE)
const themeToggleBtn = document.getElementById('themeToggle');
let currentTheme = getSafeStorage('1step_theme') || 'dark';

if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
    updateThemeIcon('light');
}

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    currentTheme = isLight ? 'light' : 'dark';
    setSafeStorage('1step_theme', currentTheme);
    updateThemeIcon(currentTheme);
});

function updateThemeIcon(theme) {
    themeToggleBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

// Firebase Authentication e-posta ister; kullanıcı adını sahte bir e-postaya çeviriyoruz
function usernameToEmail(username) {
    return username.toLowerCase().replace(/[^a-z0-9]/g, '') + "@1step-users.app";
}

// 📌 GİRİŞ YAPMA İŞLEMİ
async function handleLogin(e) {
    if (e) { try { e.preventDefault(); } catch (err) {} }

    const uNameInput = (document.getElementById('loginUsername').value || '').trim();
    const uPassInput = document.getElementById('loginPassword').value;

    if (uNameInput === "" || uPassInput === "") {
        showError('loginError', 'Lütfen tüm alanları doldurun!');
        return;
    }

    const pseudoEmail = usernameToEmail(uNameInput);

    try {
        const cred = await auth.signInWithEmailAndPassword(pseudoEmail, uPassInput);
        const docSnap = await db.collection('users').doc(cred.user.uid).get();
        const data = docSnap.data() || {};
        currentUser = { uid: cred.user.uid, username: data.username || uNameInput };
        habits = data.habits || [];
        initUserSession();
    } catch (err) {
        showError('loginError', 'Kullanıcı adı veya şifre hatalı!');
    }
}

// 📌 KAYIT OLMA İŞLEMİ
async function handleRegister(e) {
    if (e) { try { e.preventDefault(); } catch (err) {} }

    const uNameInput = (document.getElementById('regUsername').value || '').trim();
    const uPassInput = document.getElementById('regPassword').value;

    if (uNameInput === "" || uPassInput === "") {
        showError('regError', 'Lütfen tüm alanları doldurun!');
        return;
    }
    if (uPassInput.length < 6) {
        showError('regError', 'Şifre en az 6 karakter olmalı!');
        return;
    }

    const usernameLower = uNameInput.toLowerCase();
    const pseudoEmail = usernameToEmail(uNameInput);

    try {
        const existing = await db.collection('users').where('usernameLower', '==', usernameLower).limit(1).get();
        if (!existing.empty) {
            showError('regError', 'Bu kullanıcı adı zaten alınmış!');
            return;
        }

        const cred = await auth.createUserWithEmailAndPassword(pseudoEmail, uPassInput);
        await db.collection('users').doc(cred.user.uid).set({
            username: uNameInput,
            usernameLower: usernameLower,
            habits: []
        });

        currentUser = { uid: cred.user.uid, username: uNameInput };
        habits = [];
        initUserSession();
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            showError('regError', 'Bu kullanıcı adı zaten alınmış!');
        } else if (err.code === 'auth/weak-password') {
            showError('regError', 'Şifre çok zayıf, en az 6 karakter olmalı!');
        } else {
            showError('regError', 'Kayıt sırasında bir hata oluştu.');
            console.log(err);
        }
    }
}

function initUserSession() {
    if (!currentUser) {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('appContent').classList.add('hidden');
        document.getElementById('userBar').classList.add('hidden');
        return;
    }

    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('userBar').classList.remove('hidden');

    const userBadge = document.getElementById('userBadge');
    const adminBtn = document.getElementById('adminPanelBtn');

    if (currentUser.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        userBadge.innerHTML = <div class="badge-admin"><i class="fa-solid fa-crown crown-icon"></i> <span>${currentUser.username}</span> <span class="badge-tag">FOUNDER & ADMIN</span></div>;
        adminBtn.classList.remove('hidden');
    } else {
        userBadge.innerHTML = <span class="badge-user">👤 ${currentUser.username}</span>;
        adminBtn.classList.add('hidden');
    }

    renderHabits();
}

function logout() {
    auth.signOut();
    currentUser = null;
    habits = [];
    initUserSession();
}

// Oturum devamlılığı: Firebase sayfa yenilendiğinde otomatik kontrol eder
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const docSnap = await db.collection('users').doc(user.uid).get();
        const data = docSnap.data();
        if (data) {
            currentUser = { uid: user.uid, username: data.username };
            habits = data.habits || [];
        }
    } else {
        currentUser = null;
        habits = [];
    }
    initUserSession();
});

async function saveHabitsToFirestore() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({ habits });
    } catch (e) {
        console.log("Kaydetme hatası:", e);
    }
}

async function openAdminModal() {
    if (!currentUser || currentUser.username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) return;

    const modal = document.getElementById('adminModal');
    const listContainer = document.getElementById('adminUsersList');
    listContainer.innerHTML = "<p>Yükleniyor...</p>";
    modal.classList.remove('hidden');

    const snapshot = await db.collection('users').get();
    let totalHabits = 0;
    listContainer.innerHTML = "";

    snapshot.forEach(doc => {
        const u = doc.data();
        const uHabits = u.habits ? u.habits.length : 0;
        totalHabits += uHabits;

        const row = document.createElement('div');
        row.className = 'admin-user-row';
        row.innerHTML = `
            <span><strong>${u.username}</strong> ${u.username.toLowerCase() === ADMIN_USERNAME.toLowerCase() ? '(Admin)' : ''}</span>
            <span>${uHabits} Alışkanlık</span>
        `;
        listContainer.appendChild(row);
    });

    document.getElementById('adminTotalUsers').innerText = snapshot.size;
    document.getElementById('adminTotalHabits').innerText = totalHabits;
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.add('hidden');
}

function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
