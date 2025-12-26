const db = firebase.firestore();
const auth = firebase.auth();

const userGreetingEl = document.getElementById("userGreeting");
const userAvatarEl = document.getElementById("userAvatar");
const userDropdownEl = document.getElementById("userDropdown");
const logoutBtn = document.getElementById("logoutBtn");

const recipesGrid = document.getElementById("recipesGrid");
const recipeCountEl = document.getElementById("recipeCount");

// USER LADEN
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Username aus Firestore holen
    const snap = await db.collection("users").doc(user.uid).get();
    const username = snap.exists ? snap.data().username : null;

    userGreetingEl.textContent = username
        ? `Hallo, ${username}!`
        : `Hallo, ${user.email.split("@")[0]}!`;

    userAvatarEl.src = "Bilder/user.png";

    loadMyRecipes(user.uid);
});

// Dropdown togglen
let dropdownOpen = false;
userAvatarEl.addEventListener("click", () => {
    dropdownOpen = !dropdownOpen;
    userDropdownEl.style.display = dropdownOpen ? "block" : "none";
});

document.addEventListener("click", (e) => {
    if (!userDropdownEl.contains(e.target) && e.target !== userAvatarEl) {
        dropdownOpen = false;
        userDropdownEl.style.display = "none";
    }
});

// Logout
logoutBtn.addEventListener("click", () => {
    auth.signOut();
});

// Eigene Rezepte laden
// Eigene Rezepte laden
function loadMyRecipes(uid) {
    db.collection("recipes")
        .where("createdBy", "==", uid)
        .onSnapshot(snapshot => {

            if (snapshot.empty) {
                recipesGrid.innerHTML = `<p class="muted">Du hast noch keine Rezepte erstellt.</p>`;
                recipeCountEl.textContent = "(0)";
                return;
            }

            recipesGrid.innerHTML = "";
            recipeCountEl.textContent = `(${snapshot.size})`;

            snapshot.forEach(doc => {
                const r = doc.data();
                const id = doc.id;

                const title = r.title || "Unbenanntes Rezept";
                const img = r.imageUrl || "https://i.imgur.com/9P94w6M.png";
                const tags = Array.isArray(r.tags) ? r.tags.join(", ") : "";
                const chip = r.tags && r.tags[0] ? r.tags[0] : "Rezept";

                const card = document.createElement("article");
                card.className = "recipe-card";

                card.innerHTML = `
                    <div class="recipe-img-wrapper">
                        <img src="${img}" alt="${title}">
                        <span class="recipe-chip">${chip}</span>
                    </div>
                    <div class="recipe-body">
                        <h3 class="recipe-title">${title}</h3>
                        <p class="recipe-tags">${tags}</p>
                    </div>
                `;

                card.addEventListener("click", () => {
                    window.location.href = `recipe.html?id=${id}`;
                });

                recipesGrid.appendChild(card);
            });
        });
}
