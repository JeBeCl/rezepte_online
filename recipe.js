// ==========================================
// KONSTANTEN & FIREBASE
// ==========================================
const DEFAULT_IMAGE = "https://i.imgur.com/9P94w6M.png";

const params = new URLSearchParams(window.location.search);
const recipeId = params.get("id");
const content = document.getElementById("recipeContent");

const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let recipeData = null;

// Buttons
const saveBtn = document.getElementById("saveToCollectionBtn");
const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");


// ==========================================
// USER STATUS HANDLING
// ==========================================
auth.onAuthStateChanged(async (user) => {
    currentUser = user;

    if (!user) {
        saveBtn.style.display = "none";
        editBtn.style.display = "none";
        deleteBtn.style.display = "none";
        return;
    }

    saveBtn.style.display = "inline-block";

    if (recipeData) updateOwnerButtons();
});


// ==========================================
// OWNER BUTTON VISIBILITY
// ==========================================
function updateOwnerButtons() {
    if (!currentUser || !recipeData) return;

    const isOwner = recipeData.createdBy === currentUser.uid;
    const isAdmin = currentUser.email === "admin@admin.de";

    if (isOwner || isAdmin) {
        editBtn.style.display = "inline-block";
        deleteBtn.style.display = "inline-block";
    } else {
        editBtn.style.display = "none";
        deleteBtn.style.display = "none";
    }
}


// ==========================================
// REZEPT LADEN
// ==========================================
async function loadRecipe() {
    if (!recipeId) {
        content.innerHTML = "<p>Kein Rezept gefunden.</p>";
        return;
    }

    const docSnap = await db.collection("recipes").doc(recipeId).get();
    if (!docSnap.exists) {
        content.innerHTML = "<p>Rezept nicht gefunden.</p>";
        return;
    }

    recipeData = docSnap.data();
    updateOwnerButtons();

    const r = recipeData;

    // Render HTML
    content.innerHTML = `
        <img src="${r.imageUrl || DEFAULT_IMAGE}" class="detail-img">

        <h1 class="detail-title">${r.title}</h1>

        <p style="color:#555;margin-top:-10px;">
            Erstellt von: <b>${r.createdByName || "Unbekannt"}</b>
        </p>

        <div class="rating-row">
            <div id="ratingStars" class="star-container">
                <span class="star" data-value="1">★</span>
                <span class="star" data-value="2">★</span>
                <span class="star" data-value="3">★</span>
                <span class="star" data-value="4">★</span>
                <span class="star" data-value="5">★</span>
            </div>
            <span class="rating-text">Lade Bewertung…</span>
        </div>

        <div class="detail-tags">
            ${(r.tags || []).map(t => `<span class="tag-pill">${t}</span>`).join("")}
        </div>

        ${r.description ? `<p class="detail-desc">${r.description}</p>` : ""}

        ${r.ingredients?.length ? `
            <h2>Zutaten</h2>
            <ul class="detail-list">
                ${r.ingredients.map(i => `<li>${i}</li>`).join("")}
            </ul>` : ""}

        ${r.steps?.length ? `
            <h2>Zubereitung</h2>
            <ol class="detail-list">
                ${r.steps.map(s => `<li>${s}</li>`).join("")}
            </ol>` : ""}

        <hr class="comment-divider">

        <h2 id="commentHeader">Kommentare</h2>

        <div id="commentList" class="comment-list">
            <p class="comment-placeholder">Kommentare werden geladen…</p>
        </div>

        <div class="comment-box">
            <input type="text" id="commentName" placeholder="Dein Name">
            <textarea id="commentText" placeholder="Dein Kommentar..."></textarea>
            <button id="commentSendBtn" class="comment-btn">Kommentar senden</button>
        </div>
    `;

    initRatingSystem();
    initComments();
}

loadRecipe();


// ==========================================
// BEWERTUNG
// ==========================================
function initRatingSystem() {
    const starsEl = document.getElementById("ratingStars");
    const ratingTextEl = document.querySelector(".rating-text");
    const starEls = starsEl.querySelectorAll(".star");

    let currentAvg = 0;
    let currentUserRating = 0;

    async function setRating(val) {
        if (!currentUser) return alert("Du musst eingeloggt sein.");

        await db.collection("recipes")
            .doc(recipeId)
            .collection("ratings")
            .doc(currentUser.uid)
            .set({
                value: val,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        currentUserRating = val;
        updateStars(val);
    }

    function updateStars(val) {
        starEls.forEach((star, index) => {
            star.classList.toggle("filled", index < val);
        });
    }

    starEls.forEach(star =>
        star.addEventListener("click", () => setRating(Number(star.dataset.value)))
    );

    starsEl.addEventListener("mouseleave", () =>
        updateStars(currentUserRating || currentAvg)
    );

    db.collection("recipes").doc(recipeId).collection("ratings")
        .onSnapshot(snapshot => {
            let sum = 0;
            let count = snapshot.size;
            currentUserRating = 0;

            snapshot.forEach(doc => {
                const d = doc.data();
                sum += d.value;
                if (currentUser && doc.id === currentUser.uid) {
                    currentUserRating = d.value;
                }
            });

            currentAvg = count ? sum / count : 0;

            ratingTextEl.textContent =
                count === 0
                    ? "Noch keine Bewertungen"
                    : `${currentAvg.toFixed(1)} / 5 (${count})`;

            updateStars(currentUserRating || currentAvg);
        });
}


// ==========================================
// KOMMENTARE
// ==========================================
function initComments() {
    const commentList = document.getElementById("commentList");
    const commentHeader = document.getElementById("commentHeader");
    const commentNameInput = document.getElementById("commentName");
    const commentTextInput = document.getElementById("commentText");
    const commentSendBtn = document.getElementById("commentSendBtn");

    db.collection("recipes")
        .doc(recipeId)
        .collection("comments")
        .orderBy("createdAt", "desc")
        .onSnapshot(snapshot => {

            const count = snapshot.size;
            commentHeader.textContent = `Kommentare (${count})`;

            commentList.innerHTML =
                count === 0
                    ? `<p class="comment-placeholder">Noch keine Kommentare.</p>`
                    : "";

            snapshot.forEach(doc => {
                const c = doc.data();
                const id = doc.id;

                const dateStr = c.createdAt?.toDate().toLocaleString("de-DE") || "";
                const user = c.name || "Anonym";
                const avatar = user.charAt(0).toUpperCase();

                const deleteAllowed =
                    currentUser &&
                    (c.userId === currentUser.uid || currentUser.email === "admin@admin.de");

                commentList.innerHTML += `
                    <div class="comment-item">
                        <div class="comment-header-row">
                            <div class="comment-avatar">${avatar}</div>
                            <div class="comment-meta">
                                <strong>${user}</strong>
                                <span class="comment-date">${dateStr}</span>
                            </div>
                            ${deleteAllowed ?
                                `<button class="comment-delete" data-id="${id}">Löschen</button>`
                                : ""}
                        </div>
                        <p>${c.text}</p>
                    </div>
                `;
            });
        });

    commentSendBtn.onclick = async () => {
        const name = commentNameInput.value.trim() || "Anonym";
        const text = commentTextInput.value.trim();
        if (!text) return alert("Bitte Kommentar eingeben.");

        await db.collection("recipes")
            .doc(recipeId)
            .collection("comments")
            .add({
                name,
                text,
                userId: currentUser ? currentUser.uid : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        commentTextInput.value = "";
    };
}


// ==========================================
// REZEPT IN SAMMLUNG SPEICHERN
// ==========================================
const collectionSelectModal = document.getElementById("collectionSelectModal");
const collectionSelectList = document.getElementById("collectionSelectList");
const closeCollectionSelect = document.getElementById("closeCollectionSelect");

saveBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("Du musst eingeloggt sein.");
    if (!recipeData) return;

    collectionSelectModal.classList.add("show");
    collectionSelectList.innerHTML =
        "<p style='color:white;text-align:center;'>Lade...</p>";

    const snap = await db.collection("users")
        .doc(currentUser.uid)
        .collection("collections")
        .get();

    if (snap.empty) {
        collectionSelectList.innerHTML =
            "<p style='color:white;text-align:center;'>Keine Sammlungen vorhanden.</p>";
        return;
    }

    collectionSelectList.innerHTML = "";

    snap.forEach(doc => {
        const data = doc.data();
        const id = doc.id;

        const item = document.createElement("div");
        item.className = "collection-select-item";
        item.textContent = `${data.icon} ${data.name}`;

        item.addEventListener("click", async () => {
            await db.collection("users")
                .doc(currentUser.uid)
                .collection("collections")
                .doc(id)
                .collection("recipes")
                .doc(recipeId)
                .set({
                    recipeId,
                    title: recipeData.title,
                    imageUrl: recipeData.imageUrl || DEFAULT_IMAGE,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            collectionSelectModal.classList.remove("show");
        });

        collectionSelectList.appendChild(item);
    });
});

closeCollectionSelect.addEventListener("click", () => {
    collectionSelectModal.classList.remove("show");
});

collectionSelectModal.addEventListener("click", (e) => {
    if (e.target === collectionSelectModal)
        collectionSelectModal.classList.remove("show");
});


// ==========================================
// EDIT / DELETE
// ==========================================
editBtn.onclick = () => {
    window.location.href = `index.html?edit=${recipeId}`;
};

deleteBtn.onclick = async () => {
    if (!confirm("Rezept wirklich löschen?")) return;
    await db.collection("recipes").doc(recipeId).delete();
    window.location.href = "index.html";
};
