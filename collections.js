const db = firebase.firestore();
const auth = firebase.auth();

const collectionGrid = document.getElementById("collectionGrid");
const newCollectionBtn = document.getElementById("newCollectionBtn");

// ----------- Auth Check ----------
auth.onAuthStateChanged(user => {
    if (!user) return window.location.href = "login.html";
    loadCollections(user.uid);
});

// ----------- Load Collections ----------
function loadCollections(uid) {
    db.collection("users").doc(uid).collection("collections")
      .orderBy("createdAt", "desc")
      .onSnapshot(snapshot => {

        if (snapshot.empty) {
            collectionGrid.innerHTML = `<p class="muted">Keine Sammlungen vorhanden.</p>`;
            return;
        }

        collectionGrid.innerHTML = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;

            const card = document.createElement("div"); 
            card.className = "collection-card";
            // --- Random Pattern + Color ---
const patterns = ["p1","p2","p3","p4","p5"];
const colors = ["c1","c2","c3","c4","c5"];

const pattern = patterns[Math.floor(Math.random() * patterns.length)];
const color = colors[Math.floor(Math.random() * colors.length)];

card.classList.add(pattern, color);

            card.innerHTML = `
    <div class="inner">
        <div class="icon">${data.icon}</div>
        <h3>${data.name}</h3>
    </div>
`;


            card.onclick = () => {
                window.location.href = `collection-view.html?id=${id}`;
            };

            collectionGrid.appendChild(card);
        });
      });
}

// Modal Elemente
const newCollectionModal = document.getElementById("newCollectionModal");
const collectionNameInput = document.getElementById("collectionNameInput");
const collectionIconInput = document.getElementById("collectionIconInput");
const cancelNewCollection = document.getElementById("cancelNewCollection");
const createCollectionBtn = document.getElementById("createCollection");

// Öffnen
newCollectionBtn.onclick = () => {
    newCollectionModal.classList.add("show");
    collectionNameInput.value = "";
    collectionIconInput.value = "";
    collectionNameInput.focus();
};

// Schließen
cancelNewCollection.onclick = () => {
    newCollectionModal.classList.remove("show");
};

// Sammlung erstellen
createCollectionBtn.onclick = async () => {
    const name = collectionNameInput.value.trim();
    const icon = collectionIconInput.value.trim() || "📁";

    if (!name) return alert("Bitte einen Namen eingeben.");

    const user = auth.currentUser;

    await db.collection("users")
        .doc(user.uid)
        .collection("collections")
        .add({
            name,
            icon,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    newCollectionModal.classList.remove("show");
};

