const API_BASE = "https://corsproxy.io/?https://flavortown.hackclub.com/api/v1";
let uid = localStorage.getItem("ft_uid");
let apiKey = localStorage.getItem("ft_key");
const loginEl = document.getElementById("login");
const appEl = document.getElementById("app");

// ---------- AUTH ----------
function showApp() {
  loginEl.classList.add("hidden");
  appEl.classList.remove("hidden");
  initApp();
}

function showLogin() {
  loginEl.classList.remove("hidden");
  appEl.classList.add("hidden");
}

document.getElementById("loginBtn").onclick = () => {
  uid = document.getElementById("uid").value.trim();
  apiKey = document.getElementById("apikey").value.trim();

  if (!uid || !apiKey) {
    alert("Fill in UID and API key.");
    return;
  }

  localStorage.setItem("ft_uid", uid);
  localStorage.setItem("ft_key", apiKey);
  showApp();
};

document.getElementById("logout").onclick = () => {
  localStorage.clear();
  location.reload();
};

if (uid && apiKey) showApp();
else showLogin();

// ---------- API ----------
async function apiFetch(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        alert("Invalid login credentials.");
        localStorage.clear();
        showLogin();
        throw new Error("Unauthorized");
      }

      alert(`API error: ${res.status}`);
      throw new Error(`API error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
}

// ---------- APP ----------
let allItems = [];
let wishlist = [];
let userCookies = 0;

const storeEl = document.getElementById("store");
const storeLoadingEl = document.getElementById("storeLoading");
const noResultsEl = document.getElementById("noResults");
const wishlistEl = document.getElementById("wishlist");
const wishlistEmptyEl = document.getElementById("wishlistEmpty");
const neededEl = document.getElementById("needed");
const ownedEl = document.getElementById("owned");
const diffEl = document.getElementById("diff");

// Filtrovací elementy
const searchInput = document.getElementById("searchInput");
const priceRange = document.getElementById("priceRange");
const priceValue = document.getElementById("priceValue");
const sortSelect = document.getElementById("sortSelect");
const limitedOnly = document.getElementById("limitedOnly");

async function initApp() {
  try {
    await loadUser();
    await loadStore();
    setupFilters();
  } catch (error) {
    console.error("Error while inizialization:", error);
    storeLoadingEl.textContent = "Error while loading data";
  }
}

async function loadUser() {
  const user = await apiFetch(`/users/${uid}`);
  userCookies = user.cookies ?? 0;
  ownedEl.textContent = `${userCookies} 🍪`;
}

async function loadStore() {
  storeLoadingEl.style.display = "block";
  allItems = await apiFetch("/store");
  storeLoadingEl.style.display = "none";
  sortSelect.value = "price-asc";
  applyFilters();
  renderStore(allItems);
}

function setupFilters() {
  // Vyhledávání
  searchInput.addEventListener("input", applyFilters);

  // Cena slider
  priceRange.addEventListener("input", (e) => {
    priceValue.textContent = e.target.value;
    applyFilters();
  });

  // Třídění
  sortSelect.addEventListener("change", applyFilters);

  // Limitované
  limitedOnly.addEventListener("change", applyFilters);
}

function applyFilters() {
  let filtered = [...allItems];

  // Vyhledávání
  const search = searchInput.value.toLowerCase();
  if (search) {
    filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search) ||
        (item.description && item.description.toLowerCase().includes(search))
    );
  }

  // Cena
  const maxPrice = parseInt(priceRange.value);
  filtered = filtered.filter(item => parseFloat(item.ticket_cost.base_cost) <= maxPrice);

  // Limitované
  if (limitedOnly.checked) {
    filtered = filtered.filter(item => item.limited);
  }

  // Třídění
  const sort = sortSelect.value;
  filtered.sort((a, b) => {
    switch(sort) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "price-asc":
        return parseFloat(a.ticket_cost.base_cost) - parseFloat(b.ticket_cost.base_cost);
      case "price-desc":
        return parseFloat(b.ticket_cost.base_cost) - parseFloat(a.ticket_cost.base_cost);
      default:
        return 0;
    }
  });

  renderStore(filtered);
}

function renderStore(items) {
  storeEl.innerHTML = "";

  if (items.length === 0) {
    noResultsEl.classList.remove("hidden");
    return;
  }

  noResultsEl.classList.add("hidden");

  // Pouze položky co jsou buyable_by_self
  const buyableItems = items.filter(item => item.buyable_by_self);

  buyableItems.forEach((item) => {
    const price = parseFloat(item.ticket_cost.base_cost);
    const card = document.createElement("div");
    card.className = "bg-white/90 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-[#c88a3d] relative";

    // Badge pro limitované
    const limitedBadge = item.limited && item.stock
        ? `<div class="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
           In stock: ${item.stock}
         </div>`
        : "";

    card.innerHTML = `
      ${limitedBadge}
      <img 
        src="${item.image_url}" 
        class="w-full h-40 object-contain mb-3" 
        alt="${item.name}"
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%23999%22%3E%F0%9F%8D%AA%3C/text%3E%3C/svg%3E'"
      >
      <h3 class="font-bold text-lg mb-2 text-gray-800 line-clamp-1">${item.name}</h3>
      ${item.description ? `<p class="text-sm text-gray-600 mb-3 line-clamp-2">${item.description}</p>` : ""}
      <div class="flex items-center justify-between mb-3">
        <span class="text-2xl font-bold text-[#c88a3d]">${price} 🍪</span>
        ${item.limited ? '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">Limited!</span>' : ""}
      </div>
      <button class="w-full bg-gradient-to-r from-[#8bbf4d] to-[#7aa63d] px-4 py-3 rounded-lg text-white font-bold hover:from-[#7aa63d] hover:to-[#699530] transition shadow-md">
        Add to wishlist
      </button>
    `;

    card.querySelector("button").onclick = () => {
      wishlist.push({
        id: item.id,
        name: item.name,
        price
      });
      renderWishlist();
    };

    storeEl.appendChild(card);
  });
}

function renderWishlist() {
  wishlistEl.innerHTML = "";
  let needed = 0;

  if (wishlist.length === 0) {
    wishlistEmptyEl.style.display = "block";
  } else {
    wishlistEmptyEl.style.display = "none";
  }

  wishlist.forEach((w, index) => {
    needed += w.price;
    const li = document.createElement("li");
    li.className = "flex justify-between items-center bg-gradient-to-r from-[#e8b86d]/20 to-[#c88a3d]/20 px-3 py-3 rounded-lg hover:from-[#e8b86d]/30 hover:to-[#c88a3d]/30 transition";
    li.innerHTML = `
      <span class="flex-1 font-medium text-gray-700">${w.name}</span>
      <div class="flex items-center gap-3">
        <span class="font-bold text-[#c88a3d]">${w.price} 🍪</span>
        <button class="text-red-500 hover:text-red-700 font-bold text-xl w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 transition" data-index="${index}">×</button>
      </div>
    `;

    li.querySelector("button").onclick = () => {
      wishlist.splice(index, 1);
      renderWishlist();
    };

    wishlistEl.appendChild(li);
  });

  neededEl.textContent = `${needed} 🍪`;
  const diff = userCookies - needed;

  if (diff >= 0) {
    diffEl.textContent = `✓ You need ${diff} 🍪`;
    diffEl.className = "text-center font-bold text-lg pt-2 text-green-600";
  } else {
    diffEl.textContent = `✗ You miss ${Math.abs(diff)} 🍪`;
    diffEl.className = "text-center font-bold text-lg pt-2 text-red-600";
  }
}
