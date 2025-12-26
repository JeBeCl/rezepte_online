// ================================
// FIREBASE + CONSTANTS
// ================================
const db = firebase.firestore();
const auth = firebase.auth();

const params = new URLSearchParams(window.location.search);
const collectionId = params.get("id");

const titleEl = document.getElementById("collectionTitle");
const recipesGrid = document.getElementById("recipesGrid");

// ---- Fancy Modal Elements ----
const renameModal = document.getElementById("renameCollectionModal");
const deleteModal = document.getElementById("deleteCollectionModal");
const removeRecipeModal = document.getElementById("removeRecipeModal");

const renameInput = document.getElementById("renameInput");
const renameIconInput = document.getElementById("renameIconInput");

let recipeToRemove = null;

// ================================
// AUTH CHECK
// ================================
auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "login.html";
    loadCollection(user.uid);
    loadRecipes(user.uid);
});


// ================================
// COLLECTION INFO LOADEN
// ================================
async function loadCollection(uid) {
    const snap = await db.collection("users")
        .doc(uid)
        .collection("collections")
        .doc(collectionId)
        .get();

    if (!snap.exists) {
        titleEl.textContent = "Sammlung nicht gefunden";
        return;
    }

    const data = snap.data();
    titleEl.textContent = `${data.icon} ${data.name}`;
}


// ================================
// SAMMLUNG → REZEPTE LADEN
// ================================
function loadRecipes(uid) {
    db.collection("users")
        .doc(uid)
        .collection("collections")
        .doc(collectionId)
        .collection("recipes")
        .onSnapshot((snapshot) => {

            if (snapshot.empty) {
                recipesGrid.innerHTML = `<p class="muted">Keine Rezepte in dieser Sammlung.</p>`;
                return;
            }

            recipesGrid.innerHTML = "";

            snapshot.forEach(doc => {
                const data = doc.data();
                const recipeId = doc.id;

                const card = document.createElement("div");
                card.className = "collection-recipe-card fancy-card";
                card.innerHTML = `
                    <div class="recipe-img-wrapper">
                        <img src="${data.imageUrl}" alt="${data.title}">
                        <span class="recipe-chip">${data.title}</span>

                        <button class="remove-recipe-btn">✖</button>
                    </div>
                `;

                // ---- Rezept entfernen → Modal öffnen ----
                card.querySelector(".remove-recipe-btn").onclick = (e) => {
                    e.stopPropagation();
                    recipeToRemove = recipeId;
                    openModal(removeRecipeModal);
                };

                // ---- Rezept öffnen ----
                card.onclick = () => {
                    window.location.href = `recipe.html?id=${recipeId}`;
                };

                recipesGrid.appendChild(card);
            });
        });
}


// ================================
// SAMMLUNG UMBENENNEN
// ================================
document.getElementById("renameCollectionBtn").onclick = () => {
    openModal(renameModal);
};

document.getElementById("cancelRename").onclick = () => {
    closeModal(renameModal);
};

document.getElementById("confirmRename").onclick = async () => {
    const newName = renameInput.value.trim();
    const newIcon = renameIconInput.value.trim() || "📁";

    if (!newName) return;

    const user = auth.currentUser;

    await db.collection("users")
        .doc(user.uid)
        .collection("collections")
        .doc(collectionId)
        .update({
            name: newName,
            icon: newIcon
        });

    titleEl.textContent = `${newIcon} ${newName}`;

    closeModal(renameModal);
};


// ================================
// SAMMLUNG LÖSCHEN
// ================================
document.getElementById("deleteCollectionBtn").onclick = () => {
    openModal(deleteModal);
};

document.getElementById("cancelDelete").onclick = () => {
    closeModal(deleteModal);
};

document.getElementById("confirmDelete").onclick = async () => {
    const user = auth.currentUser;

    const recipesSnap = await db.collection("users")
        .doc(user.uid)
        .collection("collections")
        .doc(collectionId)
        .collection("recipes")
        .get();

    const batch = db.batch();
    recipesSnap.forEach(doc => batch.delete(doc.ref));

    batch.delete(
        db.collection("users")
            .doc(user.uid)
            .collection("collections")
            .doc(collectionId)
    );

    await batch.commit();

    closeModal(deleteModal);
    window.location.href = "collections.html";
};


// ================================
// REZEPT AUS SAMMLUNG ENTFERNEN
// ================================
document.getElementById("cancelRemoveRecipe").onclick = () => {
    closeModal(removeRecipeModal);
};

document.getElementById("confirmRemoveRecipe").onclick = async () => {
    const user = auth.currentUser;

    await db.collection("users")
        .doc(user.uid)
        .collection("collections")
        .doc(collectionId)
        .collection("recipes")
        .doc(recipeToRemove)
        .delete();

    closeModal(removeRecipeModal);
};


// ================================
// FANCY MODAL FUNCTIONS
// ================================
function openModal(modal) {
    modal.classList.add("show");

    // smooth animation
    setTimeout(() => {
        modal.classList.add("visible");
    }, 10);
}

function closeModal(modal) {
    modal.classList.remove("visible");
    setTimeout(() => {
        modal.classList.remove("show");
    }, 200);
}
