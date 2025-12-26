const auth = firebase.auth();
const db = firebase.firestore();

const profileNameEl = document.getElementById("profileName");
const profileEmailEl = document.getElementById("profileEmail");
const profileAvatarEl = document.getElementById("profileAvatar");

const darkToggle = document.getElementById("darkModeToggle");
const logoutBtn = document.getElementById("logoutBtn");

const changeNameBtn = document.getElementById("changeNameBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");

let currentUsername = null;

// Load user & username
auth.onAuthStateChanged(async (user) => {
    if (!user) return window.location.href = "login.html";

    profileEmailEl.textContent = user.email;
    profileAvatarEl.src = "Bilder/user.png";

    // ► Username aus Firestore holen
    const snap = await db.collection("users").doc(user.uid).get();
    currentUsername = snap.exists ? snap.data().username : "Unbekannt";

    profileNameEl.textContent = currentUsername;

    // Dark mode restore
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
        darkToggle.checked = true;
    }
});

// Dark Mode Toggle
darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", darkToggle.checked);
});

// ► Benutzername ändern
changeNameBtn.addEventListener("click", async () => {
    const newName = prompt("Neuer Benutzername:");
    if (!newName || newName.length < 3) return alert("Mindestens 3 Zeichen.");

    // prüfen ob vergeben
    const query = await db.collection("users")
        .where("username", "==", newName)
        .get();

    if (!query.empty) {
        return alert("Dieser Benutzername ist schon vergeben.");
    }

    const user = auth.currentUser;

    // Firestore updaten
    await db.collection("users").doc(user.uid).update({
        username: newName
    });

    // UI updaten
    profileNameEl.textContent = newName;
    currentUsername = newName;

    alert("Benutzername erfolgreich geändert!");
});

// Passwort ändern
changePasswordBtn.addEventListener("click", () => {
    auth.sendPasswordResetEmail(auth.currentUser.email);
    alert("Du hast eine E-Mail zum Zurücksetzen deines Passworts erhalten.");
});

// Logout
logoutBtn.addEventListener("click", () => {
    auth.signOut();
    window.location.href = "index.html";
});
