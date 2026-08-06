// wrapper for querySelector...returns matching element
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

// retrieve data from localStorage
export function getLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

// save data to local storage
export function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

//reads the current URL's query string and pulls out whatever param name you ask for
export function getParam(param) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(param);
}

//renders the content from the template into the parentElement
export function renderWithTemplate(template, parentElement, data, callback) {
  parentElement.innerHTML = template;
  if (callback) {
    callback(data);
  }
}

async function loadTemplate(path) {
  const response = await fetch(path);
  const html = await response.text();
  return html;
}

export async function loadHeaderFooter() {
  const headerTemplate = await loadTemplate("/partials/header.html");
  const footerTemplate = await loadTemplate("/partials/footer.html");

  const headerElement = document.querySelector("#main-header");
  const footerElement = document.querySelector("#main-footer");

  renderWithTemplate(headerTemplate, headerElement, null, highlightActiveNav);
  renderWithTemplate(footerTemplate, footerElement);
}

function highlightActiveNav() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll("nav a");

  navLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (
      linkPath === currentPath ||
      (currentPath === "/" && linkPath === "/index.html")
    ) {
      link.classList.add("active");
    }
  });

  updateFavoritesBadge();
}

export function updateFavoritesBadge() {
  const badge = document.querySelector("#nav-fav-badge");
  if (!badge) return;
  const favorites = getLocalStorage("so-favorites") || [];
  if (favorites.length > 0) {
    badge.textContent = favorites.length;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

export function showToast(message, type = "success") {
  let toastContainer = document.querySelector("#pm-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "pm-toast-container";
    toastContainer.className = "pm-toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `pm-toast pm-toast--${type}`;

  const iconSvg =
    type === "error" || type === "info"
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>`;

  toast.innerHTML = `
    <span class="pm-toast-icon">${iconSvg}</span>
    <span class="pm-toast-msg">${message}</span>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 3000);
}

export async function getNutritionForIngredient(ingredientName, usdaKey) {
  const cacheKey = "so-nutrition-cache";
  const cache = getLocalStorage(cacheKey) || {};
  const normalized = ingredientName.toLowerCase().trim();

  if (cache[normalized]) {
    return cache[normalized];
  }

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredientName)}&pageSize=1&api_key=${usdaKey}`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    const food = data.foods && data.foods[0];

    if (!food) return null;

    const nutrients = {};
    food.foodNutrients.forEach((n) => {
      if (n.nutrientName === "Energy") nutrients.calories = n.value;
      if (n.nutrientName === "Protein") nutrients.protein = n.value;
      if (n.nutrientName === "Total lipid (fat)") nutrients.fat = n.value;
      if (n.nutrientName === "Carbohydrate, by difference")
        nutrients.carbs = n.value;
      if (n.nutrientName === "Fiber, total dietary") nutrients.fiber = n.value;
      if (n.nutrientName === "Sugars, total including NLEA")
        nutrients.sugar = n.value;
      if (n.nutrientName === "Sodium, Na") nutrients.sodium = n.value;
    });

    cache[normalized] = nutrients;
    setLocalStorage(cacheKey, cache);

    return nutrients;
  } catch {
    return null;
  }
}

export function parseRecipeNutrition(recipe) {
  const defaultValues = {
    calories: 520,
    protein: 24,
    carbs: 55,
    fat: 20,
    fiber: 4,
    sugar: 5,
    sodium: 580,
  };

  if (!recipe) return defaultValues;

  const res = { ...defaultValues };

  if (recipe.nutrition && Array.isArray(recipe.nutrition.nutrients)) {
    recipe.nutrition.nutrients.forEach((n) => {
      const name = (n.name || "").toLowerCase();
      if (name.includes("calorie")) res.calories = Math.round(n.amount);
      if (name === "protein") res.protein = Math.round(n.amount);
      if (name.includes("carbohydrate")) res.carbs = Math.round(n.amount);
      if (name === "fat") res.fat = Math.round(n.amount);
      if (name.includes("fiber")) res.fiber = Math.round(n.amount);
      if (name.includes("sugar")) res.sugar = Math.round(n.amount);
      if (name === "sodium") res.sodium = Math.round(n.amount);
    });
  } else if (recipe.nutrition && typeof recipe.nutrition === "object") {
    if (recipe.nutrition.calories) res.calories = Math.round(Number(recipe.nutrition.calories));
    if (recipe.nutrition.protein) res.protein = Math.round(Number(recipe.nutrition.protein));
    if (recipe.nutrition.carbs) res.carbs = Math.round(Number(recipe.nutrition.carbs));
    if (recipe.nutrition.fat) res.fat = Math.round(Number(recipe.nutrition.fat));
    if (recipe.nutrition.fiber) res.fiber = Math.round(Number(recipe.nutrition.fiber));
    if (recipe.nutrition.sugar) res.sugar = Math.round(Number(recipe.nutrition.sugar));
    if (recipe.nutrition.sodium) res.sodium = Math.round(Number(recipe.nutrition.sodium));
  }

  return res;
}
