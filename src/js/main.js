import {
  qs,
  loadHeaderFooter,
  getLocalStorage,
  setLocalStorage,
  updateFavoritesBadge,
  showToast,
} from "./utils.mjs";
import { recipeCardTemplate } from "./recipeCard.mjs";
import { MOCK_RECIPES } from "./mockRecipes.mjs";

loadHeaderFooter();

const searchForm = qs("#search-form");
const searchInput = qs("#search-input");
const searchClearBtn = qs("#search-clear-btn");

const trendingSection = qs("#trending-section");
const trendingList = qs("#trending-list");
const scrollLeftBtn = qs("#scroll-left-btn");
const scrollRightBtn = qs("#scroll-right-btn");

const filterChipsSection = qs("#filter-chips-section");
const resultsSection = qs("#results-section");
const resultsStatus = qs("#results-status");
const resultsContent = qs("#results-content");

const categoryPills = document.querySelectorAll(".category-pill");
const categoryAllPill = qs("#category-all-pill");
const filterChipBtns = document.querySelectorAll(".filter-chip-btn");

const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;

const TRENDING_CACHE_KEY = "so-trending-cache";
const TRENDING_CACHE_HOURS = 6;

let activeCategory = "";
let activeDiet = "";
let activeMaxTime = null;
let currentSearchRecipes = [];
let trendingRecipes = [];

function getFavorites() {
  return getLocalStorage("so-favorites") || [];
}

function isRecipeFavorite(id) {
  const favorites = getFavorites();
  return favorites.some((fav) => String(fav.id) === String(id));
}

function toggleFavoriteRecipe(recipe) {
  let favorites = getFavorites();
  const index = favorites.findIndex(
    (fav) => String(fav.id) === String(recipe.id),
  );

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes || recipe.time,
      servings: recipe.servings,
    });
  }

  setLocalStorage("so-favorites", favorites);
  updateFavoritesBadge();
}

// Category Parameter Helper for Spoonacular API
function getCategoryParams(category) {
  const cat = (category || "").toLowerCase();
  if (cat === "pasta") return { query: "pasta" };
  if (cat === "chicken") return { query: "chicken" };
  if (cat === "healthy") return { query: "healthy", diet: "vegetarian" };
  if (cat === "breakfast") return { query: "breakfast", type: "breakfast" };
  if (cat === "asian") return { query: "asian", cuisine: "asian" };
  if (cat === "dessert") return { query: "dessert", type: "dessert" };
  return {};
}

// Load Trending Recipes directly from Spoonacular API (cached 6 hours)
async function loadTrendingRecipes() {
  if (!trendingList) return;

  const cached = getLocalStorage(TRENDING_CACHE_KEY);
  const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
  const cacheValid = cacheAge < TRENDING_CACHE_HOURS * 60 * 60 * 1000;

  if (cacheValid) {
    trendingRecipes = cached.recipes;
    renderTrendingList();
    return;
  }

  trendingList.innerHTML = `
    <div class="loading-box" style="grid-column: 1 / -1; width: 100%;">
      <div class="loader"></div>
      <p>Loading trending recipes from Spoonacular API...</p>
    </div>
  `;

  try {
    const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&sort=popularity&sortDirection=desc&number=8&addRecipeInformation=true`;
    const response = await fetch(url);

    if (response.status === 402) {
      throw new Error("Spoonacular API 50 points/day limit reached (402).");
    }

    if (!response.ok) {
      throw new Error(`API response status ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      trendingRecipes = data.results;
      setLocalStorage(TRENDING_CACHE_KEY, {
        recipes: trendingRecipes,
        timestamp: Date.now(),
      });
    } else {
      trendingRecipes = MOCK_RECIPES;
    }
  } catch (err) {
    console.warn("Trending recipes API error:", err);

    if (cached) {
      trendingRecipes = cached.recipes;
      showToast(
        "Showing recently saved trending picks — live data unavailable.",
        "info",
      );
    } else {
      trendingRecipes = MOCK_RECIPES;
      showToast(
        "Showing example recipes — live trending data unavailable right now.",
        "info",
      );
    }
  }

  renderTrendingList();
}

function renderTrendingList() {
  if (!trendingList) return;
  const favorites = getFavorites();
  const html = trendingRecipes
    .map((recipe) => {
      const isFav = favorites.some(
        (fav) => String(fav.id) === String(recipe.id),
      );
      return recipeCardTemplate(recipe, isFav);
    })
    .join("");
  trendingList.innerHTML = html;
}

// Filter mock recipes locally when API quota is exceeded
function filterMockRecipes(query, diet, maxTime, category) {
  const q = (query || "").toLowerCase();
  const cat = (category || "").toLowerCase();

  return MOCK_RECIPES.filter((r) => {
    const titleMatch = !q || r.title.toLowerCase().includes(q);
    const catMatch =
      !cat ||
      cat === "all" ||
      r.title.toLowerCase().includes(cat) ||
      r.cuisine.toLowerCase().includes(cat) ||
      (r.dishTypes && r.dishTypes.some((d) => d.toLowerCase().includes(cat))) ||
      (r.tags && r.tags.some((t) => t.toLowerCase().includes(cat)));

    const dietMatch =
      !diet ||
      (r.tags && r.tags.some((t) => t.toLowerCase() === diet.toLowerCase())) ||
      (diet === "vegetarian" && r.tags.includes("Vegetarian")) ||
      (diet === "vegan" && r.tags.includes("Vegan")) ||
      (diet === "gluten free" && r.tags.includes("Gluten-Free")) ||
      (diet === "ketogenic" && r.tags.includes("Keto")) ||
      (diet === "high protein" && r.tags.includes("High Protein"));

    const timeMatch =
      !maxTime || Number(r.readyInMinutes || r.time) <= Number(maxTime);

    return titleMatch && catMatch && dietMatch && timeMatch;
  });
}

// Fetch Search Results directly from Spoonacular API
async function fetchSearchResults(query, diet, maxTime, category) {
  try {
    let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&number=12&addRecipeInformation=true`;

    const catParams = getCategoryParams(category);
    const searchQuery = query || catParams.query || "";

    if (searchQuery) {
      url += `&query=${encodeURIComponent(searchQuery)}`;
    }

    const activeDietParam = diet || catParams.diet;
    if (activeDietParam) {
      url += `&diet=${encodeURIComponent(activeDietParam)}`;
    }

    if (catParams.cuisine) {
      url += `&cuisine=${encodeURIComponent(catParams.cuisine)}`;
    }

    if (catParams.type) {
      url += `&type=${encodeURIComponent(catParams.type)}`;
    }

    if (maxTime) {
      url += `&maxReadyTime=${maxTime}`;
    }

    const response = await fetch(url);

    if (response.status === 402) {
      console.warn(
        "Spoonacular API 402 Daily Limit Exceeded. Using offline dataset.",
      );
      return filterMockRecipes(query, diet, maxTime, category);
    }

    if (!response.ok) {
      throw new Error(`API Status ${response.status}`);
    }

    const data = await response.json();
    if (data.results && Array.isArray(data.results)) {
      return data.results;
    }
  } catch (err) {
    console.warn("Spoonacular API fetch error:", err);
  }

  return filterMockRecipes(query, diet, maxTime, category);
}

// Render Search Results or Empty State
function renderSearchResults(recipes) {
  currentSearchRecipes = recipes;

  if (recipes.length === 0) {
    resultsStatus.textContent = "";
    resultsContent.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-icon">🔎</div>
        <h2>No recipes found</h2>
        <p>Try a different ingredient or remove some filters and search again.</p>
        <button type="button" class="empty-state-btn" id="clear-filters-btn">Clear Filters</button>
        <div class="empty-state-suggestions">
          <h3>Popular searches</h3>
          <div class="suggestion-tags">
            <button type="button" class="suggestion-tag" data-query="Chicken">Chicken</button>
            <button type="button" class="suggestion-tag" data-query="Pasta">Pasta</button>
            <button type="button" class="suggestion-tag" data-query="Rice">Rice</button>
            <button type="button" class="suggestion-tag" data-query="Salad">Salad</button>
            <button type="button" class="suggestion-tag" data-query="Breakfast">Breakfast</button>
          </div>
        </div>
      </div>
    `;

    const clearFiltersBtn = qs("#clear-filters-btn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", resetToHomeState);
    }

    document.querySelectorAll(".suggestion-tag").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const q = e.target.dataset.query;
        searchInput.value = q;
        executeSearch();
      });
    });
    return;
  }

  const categoryLabel =
    activeCategory && activeCategory !== "All" ? ` in ${activeCategory}` : "";
  resultsStatus.textContent = `${recipes.length} recipe${recipes.length !== 1 ? "s" : ""} found${categoryLabel}`;

  const favorites = getFavorites();
  const html = `
    <ul id="recipe-list" class="recipe-list">
      ${recipes
        .map((recipe) => {
          const isFav = favorites.some(
            (fav) => String(fav.id) === String(recipe.id),
          );
          return recipeCardTemplate(recipe, isFav);
        })
        .join("")}
    </ul>
  `;

  resultsContent.innerHTML = html;
}

// Execute Search Action with Green Loader
async function executeSearch() {
  const query = searchInput.value.trim();

  // Show clear button when input has text or filter is active
  if (query || activeCategory || activeDiet || activeMaxTime) {
    if (searchClearBtn) searchClearBtn.style.display = "flex";
  } else {
    if (searchClearBtn) searchClearBtn.style.display = "none";
  }

  // Switch View to Search Mode
  if (trendingSection) trendingSection.style.display = "none";
  if (filterChipsSection) filterChipsSection.style.display = "block";
  if (resultsSection) resultsSection.style.display = "block";
  if (categoryAllPill) categoryAllPill.style.display = "inline-block";

  // Render Green Loader Animation
  resultsStatus.textContent = "";
  resultsContent.innerHTML = `
    <div class="loading-box">
      <div class="loader"></div>
      <p>Searching delicious recipes from Spoonacular API...</p>
    </div>
  `;

  try {
    const recipes = await fetchSearchResults(
      query,
      activeDiet,
      activeMaxTime,
      activeCategory,
    );
    renderSearchResults(recipes);
  } catch (error) {
    console.error("Search execution failed:", error);
    renderSearchResults([]);
  }
}

// Reset to Home State (Clear Search)
function resetToHomeState() {
  searchInput.value = "";
  activeCategory = "";
  activeDiet = "";
  activeMaxTime = null;

  if (searchClearBtn) searchClearBtn.style.display = "none";

  categoryPills.forEach((p) => p.classList.remove("active"));
  if (categoryAllPill) {
    categoryAllPill.style.display = "none";
    categoryAllPill.classList.remove("active");
  }

  filterChipBtns.forEach((c) => c.classList.remove("active"));
  if (filterChipsSection) filterChipsSection.style.display = "none";

  if (resultsSection) resultsSection.style.display = "none";
  if (trendingSection) trendingSection.style.display = "block";

  renderTrendingList();
}

// Search Input Listener for Clear Button Visibility
searchInput.addEventListener("input", () => {
  if (searchInput.value.trim().length > 0) {
    if (searchClearBtn) searchClearBtn.style.display = "flex";
  } else if (!activeCategory && !activeDiet && !activeMaxTime) {
    resetToHomeState();
  }
});

// Clear Search X Button Click
if (searchClearBtn) {
  searchClearBtn.addEventListener("click", resetToHomeState);
}

// Category Pills Click Listener
categoryPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    categoryPills.forEach((p) => p.classList.remove("active"));

    const cat = pill.dataset.category;
    if (cat === "All" || (activeCategory === cat && cat !== "All")) {
      activeCategory = "";
      if (categoryAllPill) categoryAllPill.classList.remove("active");
      if (!searchInput.value.trim() && !activeDiet && !activeMaxTime) {
        resetToHomeState();
        return;
      }
    } else {
      pill.classList.add("active");
      activeCategory = cat;
    }

    executeSearch();
  });
});

// Filter Chips (Diet / Time) Click Listener
filterChipBtns.forEach((chip) => {
  chip.addEventListener("click", () => {
    const type = chip.dataset.filter;
    const val = chip.dataset.value;

    if (type === "diet") {
      if (activeDiet === val) {
        activeDiet = "";
        chip.classList.remove("active");
      } else {
        document
          .querySelectorAll(".filter-chip-btn[data-filter=\"diet\"]")
          .forEach((c) => c.classList.remove("active"));
        activeDiet = val;
        chip.classList.add("active");
      }
    } else if (type === "time") {
      if (activeMaxTime === val) {
        activeMaxTime = null;
        chip.classList.remove("active");
      } else {
        document
          .querySelectorAll(".filter-chip-btn[data-filter=\"time\"]")
          .forEach((c) => c.classList.remove("active"));
        activeMaxTime = val;
        chip.classList.add("active");
      }
    }

    executeSearch();
  });
});

// Search Form Submit
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  executeSearch();
});

// Chevron Scroll Buttons Click
if (scrollLeftBtn && trendingList) {
  scrollLeftBtn.addEventListener("click", () => {
    trendingList.scrollBy({ left: -300, behavior: "smooth" });
  });
}

if (scrollRightBtn && trendingList) {
  scrollRightBtn.addEventListener("click", () => {
    trendingList.scrollBy({ left: 300, behavior: "smooth" });
  });
}

// Handle Favorite Button Clicks on Cards
document.addEventListener("click", (e) => {
  const favBtn = e.target.closest(".recipe-card__fav-btn");
  if (!favBtn) return;

  e.preventDefault();
  e.stopPropagation();

  const recipeId = favBtn.dataset.id;
  const allKnown = [...trendingRecipes, ...currentSearchRecipes];
  const recipe = allKnown.find((r) => String(r.id) === String(recipeId));

  if (recipe) {
    toggleFavoriteRecipe(recipe);
    const nowFav = isRecipeFavorite(recipe.id);

    document
      .querySelectorAll(`.recipe-card__fav-btn[data-id="${recipeId}"]`)
      .forEach((btn) => {
        btn.classList.toggle("is-favorite", nowFav);
        const svg = btn.querySelector("svg");
        if (svg) {
          svg.setAttribute("fill", nowFav ? "#D94F3D" : "none");
          svg.setAttribute("stroke", nowFav ? "#D94F3D" : "#6F746E");
        }
      });
  }
});

// Update Planner Banner dynamically
function updatePlannerBanner() {
  const mealPlan = getLocalStorage("so-mealplan") || {};
  let totalMeals = 0;
  Object.values(mealPlan).forEach((dayMeals) => {
    if (Array.isArray(dayMeals)) totalMeals += dayMeals.length;
  });

  const title = qs("#planner-banner-title");
  const sub = qs("#planner-banner-sub");

  if (totalMeals > 0) {
    if (title) title.textContent = "Continue Planning";
    if (sub)
      sub.textContent = `📅 ${totalMeals} meal${totalMeals !== 1 ? "s" : ""} already planned this week`;
  } else {
    if (title) title.textContent = "Start Planning Your Week";
    if (sub)
      sub.textContent =
        "Add recipes to your weekly planner and generate a shopping list automatically";
  }
}

// Initial Home Load
loadTrendingRecipes();
updatePlannerBanner();
