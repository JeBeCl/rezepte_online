const DEFAULT_IMAGE = "https://img.freepik.com/vektoren-premium/lassen-sie-uns-illustration-kochen_53562-10006.jpg?semt=ais_incoming&w=740&q=80";

const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {


    // =============================
    // AUTH SETUP
    // =============================
    const auth = firebase.auth();

let currentUser = null;
const userIcon = document.getElementById("userIcon");
const userDropdown = document.getElementById("userDropdown");
const dropdownEmail = document.getElementById("dropdownEmail");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

let currentUsername = null;

auth.onAuthStateChanged(async (user) => {
    currentUser = user;

    if (user) {
        loginBtn.style.display = "none";
        document.getElementById("userBox").style.display = "block";

        // Username laden
        const snap = await db.collection("users").doc(user.uid).get();
        currentUsername = snap.exists ? snap.data().username : null;
        console.log("Geladener Username:", currentUsername);
    } 
    else {
        loginBtn.style.display = "inline-block";
        document.getElementById("userBox").style.display = "none";
        currentUsername = null;
    }
});

// Login Button: Weiterleitung zur Login-Seite
loginBtn.addEventListener("click", () => {
    window.location.href = "login.html";
});

// Logout Button
logoutBtn.addEventListener("click", () => {
    firebase.auth().signOut();
});






// Dropdown öffnen/schließen
let menuOpen = false;

userIcon.onclick = () => {
    menuOpen = !menuOpen;
    userDropdown.style.display = menuOpen ? "flex" : "none";
};

// Logout
document.getElementById("logoutBtn").onclick = () => {
    auth.signOut();
};



    // =============================
    // DOM ELEMENTE
    // =============================
    const sortSelect = document.getElementById("sortSelect");
    const openModalBtn = document.getElementById("openModalBtn");
    const modal = document.getElementById("recipeModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const recipeForm = document.getElementById("recipeForm");
    const recipeContainer = document.getElementById("recipeContainer");
    const modalTitle = document.getElementById("modalTitle");
    const searchInput = document.getElementById("searchInput");
    const uploadStatus = document.getElementById("uploadStatus");

    let recipes = [];
    let editingId = null;

    // ImgBB API Key
    const IMGBB_API_KEY = "186bb693f04c26f1865334c2de621c04";

    // URL-Parameter (für ?edit=ID)
    const urlParams = new URLSearchParams(window.location.search);
    const editIdFromUrl = urlParams.get("edit");
    let editChecked = false;


    // =============================
    // ImgBB Upload
    // =============================
    async function uploadToImgBB(file) {
        const formData = new FormData();
        formData.append("image", file);

        uploadStatus.innerText = "Bild wird hochgeladen…";

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (!data.success) {
            uploadStatus.innerText = "Upload fehlgeschlagen.";
            throw new Error("ImgBB Upload failed.");
        }

        uploadStatus.innerText = "Bild hochgeladen ✓";

        return data.data.url;
    }


    // =============================
    // Modal öffnen/schließen
    // =============================
    function openModal(isEdit = false) {

        if (!currentUser) {
            alert("Zum Erstellen von Rezepten musst du eingeloggt sein.");
            return;
        }

        modal.classList.add("show");
        modalTitle.textContent = isEdit ? "Rezept bearbeiten" : "Neues Rezept";
        uploadStatus.innerText = "";
    }

    function closeModal() {
        modal.classList.remove("show");
        recipeForm.reset();
        editingId = null;
        uploadStatus.innerText = "";
    }

    openModalBtn.addEventListener("click", () => openModal());
    closeModalBtn.addEventListener("click", closeModal);

    window.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });


    // =============================
    // Rezepte rendern
    // =============================
    function renderRecipes(filter = "") {
    recipeContainer.innerHTML = "";
    const search = filter.toLowerCase();

    let filtered = recipes.filter(r => {
        const blob = [
            r.title,
            r.description,
            (r.tags || []).join(" ")
        ].join(" ").toLowerCase();
        return blob.includes(search);
    });

    if (sortSelect.value === "alphabet") {
        filtered.sort((a, b) => a.title.localeCompare(b.title, "de"));
    }

    filtered.forEach(recipe => {
        const card = document.createElement("article");
        card.classList.add("recipe-card");
        card.dataset.id = recipe.id;

        card.addEventListener("click", () => {
            window.location.href = `recipe.html?id=${recipe.id}`;
        });

        // Bild
        const img = document.createElement("img");
        img.src = recipe.imageUrl || DEFAULT_IMAGE;
        img.classList.add("recipe-img");
        card.appendChild(img);

        // Titel
        const title = document.createElement("h3");
        title.textContent = recipe.title;
        card.appendChild(title);

        // ⭐ Rating-Row
        const ratingRow = document.createElement("div");
        ratingRow.classList.add("card-rating-row");

        const starsContainer = document.createElement("div");
        starsContainer.classList.add("star-container");

        // 5 Sterne erzeugen
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            star.classList.add("star");
            star.textContent = "★";
            starsContainer.appendChild(star);
        }

        const ratingText = document.createElement("span");
        ratingText.classList.add("card-rating-text");
        ratingText.textContent = "–";

        ratingRow.appendChild(starsContainer);
        ratingRow.appendChild(ratingText);
        card.appendChild(ratingRow);

        // ⭐ Live Ratings laden
        db.collection("recipes")
            .doc(recipe.id)
            .collection("ratings")
            .onSnapshot(snapshot => {
                let sum = 0;
                let count = snapshot.size;

                snapshot.forEach(d => {
                    sum += d.data().value;
                });

                const avg = count > 0 ? sum / count : 0;

                // Sterne färben
                starsContainer.querySelectorAll(".star").forEach((star, index) => {
                    if (index < avg) star.classList.add("filled");
                    else star.classList.remove("filled");
                });

                ratingText.textContent =
                    count > 0 ? `${avg.toFixed(1)} / 5` : "–";
            });

        // Tags
        if (recipe.tags?.length) {
            const tagContainer = document.createElement("div");
            tagContainer.classList.add("tag-container");

            recipe.tags.forEach(tag => {
                const span = document.createElement("span");
                span.classList.add("tag-pill");
                span.textContent = tag;
                tagContainer.appendChild(span);
            });

            card.appendChild(tagContainer);
        }

        recipeContainer.appendChild(card);
    });
}



    // =============================
    // Firestore Listener
    // =============================
    db.collection("recipes")
      .orderBy("createdAt", "desc")
      .onSnapshot(snapshot => {
          recipes = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          }));

          renderRecipes(searchInput.value);

          if (editIdFromUrl && !editChecked) {
              const r = recipes.find(x => x.id === editIdFromUrl);
              if (r) {
                  document.getElementById("title").value = r.title;
                  document.getElementById("description").value = r.description || "";
                  document.getElementById("tags").value = (r.tags || []).join(", ");
                  document.getElementById("ingredients").value = (r.ingredients || []).join("\n");
                  document.getElementById("steps").value = (r.steps || []).join("\n");

                  editingId = editIdFromUrl;
                  openModal(true);
              }
              editChecked = true;
          }
      });


    // =============================
    // Rezept speichern
    // =============================
    recipeForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("Du musst eingeloggt sein.");
            return;
        }

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const imageFile = document.getElementById("imageFile").files[0];
        const tags = document.getElementById("tags").value.split(",").map(t => t.trim()).filter(Boolean);
        const ingredients = document.getElementById("ingredients").value.split("\n").map(i => i.trim()).filter(Boolean);
        const steps = document.getElementById("steps").value.split("\n").map(s => s.trim()).filter(Boolean);

        if (!title) {
            alert("Bitte Titel eingeben.");
            return;
        }

        let imageUrl = null;

        if (imageFile) {
            imageUrl = await uploadToImgBB(imageFile);
        }

        const data = {
            title,
            description,
            tags,
            ingredients,
            steps,
            imageUrl: imageFile
                ? imageUrl
                : (editingId
                    ? (recipes.find(r => r.id === editingId)?.imageUrl || DEFAULT_IMAGE)
                    : DEFAULT_IMAGE),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdByName: currentUsername
        };

        if (editingId) {
            await db.collection("recipes").doc(editingId).update(data);
        } else {
            await db.collection("recipes").add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid,
                createdByName: currentUsername
            });
        }

        if (editIdFromUrl) {
            window.history.replaceState({}, "", "index.html");
        }

        

        closeModal();
    });


    sortSelect.addEventListener("change", () => {
        renderRecipes(searchInput.value);
    });

    searchInput.addEventListener("input", () => {
        renderRecipes(searchInput.value);
    });

});

const userIcon = document.getElementById("userIcon");
const userMenu = document.getElementById("userMenu");

userIcon?.addEventListener("click", () => {
    userMenu.style.display =
        userMenu.style.display === "block" ? "none" : "block";
});

// Klick außerhalb → Menü schließen
document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target) && e.target !== userIcon) {
        userMenu.style.display = "none";
    }
});


