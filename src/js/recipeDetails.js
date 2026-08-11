import {
  getParam,
  getLocalStorage,
  setLocalStorage,
  loadHeaderFooter,
  updateFavoritesBadge,
  qs,
  showToast,
  getNutritionForIngredient,
} from "./utils.mjs";
import { MOCK_RECIPES } from "./mockRecipes.mjs";

loadHeaderFooter();

const spoonacularKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
const usdaKey = import.meta.env.VITE_USDA_FDC_API_KEY;

const recipeId = getParam("id");
const content = qs("#recipe-detail-content");

async function getRecipeDetails(id) {
  try {
    const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${spoonacularKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn(
      "Spoonacular API quota or fetch error, using local fallback details:",
      err,
    );
    const local = MOCK_RECIPES.find((r) => String(r.id) === String(id));
    if (local) return local;
    throw err;
  }
}

function isFavorite(id) {
  const favorites = getLocalStorage("so-favorites") || [];
  return favorites.some((fav) => String(fav.id) === String(id));
}

function toggleFavorite(recipe) {
  let favorites = getLocalStorage("so-favorites") || [];
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

async function calculateRecipeNutrition(recipe) {
  const ingredients = (recipe.extendedIngredients || []).slice(0, 5);
  const totals = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };
  let foundAny = false;

  for (const ing of ingredients) {
    const nutrients = await getNutritionForIngredient(ing.name, usdaKey);
    if (!nutrients) continue;
    foundAny = true;
    totals.calories += nutrients.calories || 0;
    totals.protein += nutrients.protein || 0;
    totals.fat += nutrients.fat || 0;
    totals.carbs += nutrients.carbs || 0;
    totals.fiber += nutrients.fiber || 0;
    totals.sugar += nutrients.sugar || 0;
    totals.sodium += nutrients.sodium || 0;
  }

  return foundAny ? totals : null;
}

function addToMealPlan(recipe, day, slot, nutrition) {
  let mealPlan = getLocalStorage("so-mealplan") || {};

  if (!mealPlan[day] || Array.isArray(mealPlan[day])) {
    mealPlan[day] = {};
  }

  mealPlan[day][slot] = {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    extendedIngredients: recipe.extendedIngredients,
    nutrition: nutrition,
  };

  setLocalStorage("so-mealplan", mealPlan);
}

async function renderRecipeDetail() {
  if (!recipeId) {
    content.innerHTML = "<p>No recipe ID specified.</p>";
    return;
  }

  // Render Primary Green Preloader Animation while loading
  content.innerHTML = `
    <div class="loading-box" style="padding: 6rem 1.5rem;">
      <div class="loader"></div>
      <p>Loading recipe details...</p>
    </div>
  `;

  try {
    const recipe = await getRecipeDetails(recipeId);
    const isFav = isFavorite(recipe.id);
    const nutrition = await calculateRecipeNutrition(recipe);

    const tags =
      recipe.tags ||
      (recipe.diets && recipe.diets.length > 0
        ? recipe.diets
        : ["Quick", "Classic"]);
    const tagsHtml = tags
      .map((t) => `<span class="recipe-detail-tag">${t}</span>`)
      .join("");

    const ingredientsHtml = (recipe.extendedIngredients || [])
      .map(
        (ing) => `
        <li class="ingredient-item">
          <span class="check-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3E8E5A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span>${ing.original || ing.name}</span>
        </li>
      `,
      )
      .join("");

    let instructionsHtml =
      "<p style='color: var(--pm-muted);'>No instructions available for this recipe.</p>";
    if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
      const steps = recipe.analyzedInstructions[0].steps || [];
      instructionsHtml = steps
        .map(
          (step, i) => `
          <li class="instruction-item">
            <span class="step-badge">${i + 1}</span>
            <p class="step-text">${step.step}</p>
          </li>
        `,
        )
        .join("");
    } else if (recipe.instructions) {
      const steps = recipe.instructions
        .split(".")
        .filter((s) => s.trim().length > 0);
      instructionsHtml = steps
        .map(
          (step, i) => `
          <li class="instruction-item">
            <span class="step-badge">${i + 1}</span>
            <p class="step-text">${step.trim()}.</p>
          </li>
        `,
        )
        .join("");
    }

    content.innerHTML = `
      <a href="#" id="recipe-back-btn" class="recipe-back-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </a>

      <div class="recipe-detail-hero">
        <img src="${recipe.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=600&fit=crop"}" alt="${recipe.title}" />
        <div class="recipe-hero-overlay"></div>
        <div class="recipe-hero-cuisine">${recipe.cuisine || "Recipe"}</div>
      </div>

      <div class="recipe-detail-grid">
        <div class="recipe-detail-main">
          <div class="recipe-detail-header-row">
            <h1 class="recipe-detail-title">${recipe.title}</h1>
            <button type="button" id="detail-fav-btn" class="recipe-detail-fav-btn ${isFav ? "is-favorite" : ""}" aria-label="Save to favorites">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? "#D94F3D" : "none"}" stroke="${isFav ? "#D94F3D" : "#6F746E"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          <div class="recipe-detail-meta-row">
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span>${recipe.readyInMinutes || 30} min</span>
            </div>
            <span>·</span>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.25 10C7.04493 10 8.5 8.54493 8.5 6.75C8.5 4.95507 7.04493 3.5 5.25 3.5C3.45507 3.5 2 4.95507 2 6.75C2 8.54493 3.45507 10 5.25 10Z" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M0.639648 12.5001C1.13908 11.7322 1.8224 11.1012 2.62756 10.6644C3.43273 10.2276 4.33425 9.99878 5.25027 9.99878C6.1663 9.99878 7.06782 10.2276 7.87298 10.6644C8.67815 11.1012 9.36147 11.7322 9.8609 12.5001" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10.75 10C11.666 9.99946 12.5676 10.2279 13.3728 10.6645C14.178 11.1011 14.8613 11.7321 15.3606 12.5" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.54297 3.73125C9.98754 3.55393 10.4658 3.477 10.9435 3.50595C11.4213 3.5349 11.8868 3.66901 12.3067 3.89871C12.7266 4.1284 13.0906 4.44801 13.3726 4.8369C13.6547 5.22579 13.8454 5.67137 13.9318 6.14324C14.0181 6.61511 13.9974 7.10006 13.8711 7.56477C13.7448 8.02948 13.5168 8.45938 13.2023 8.825" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Serves ${recipe.servings || 4}</span>
            </div>
          </div>

          <div class="recipe-detail-tags">${tagsHtml}</div>
          ${recipe.summary ? `<p class="recipe-detail-description">${recipe.summary.replace(/<[^>]*>?/gm, "")}</p>` : ""}

          <h2 style="font-size: 1.3rem; margin-bottom: 1rem;">Ingredients</h2>
          <ul style="list-style: none; padding: 0; margin-bottom: 2.5rem;">${ingredientsHtml}</ul>

          <h2 style="font-size: 1.3rem; margin-bottom: 1rem;">Instructions</h2>
          <ol style="list-style: none; padding: 0;">${instructionsHtml}</ol>
        </div>

        <div class="recipe-detail-sidebar">
          <!-- Add to Planner Card -->
          <div class="sidebar-card">
            <button type="button" id="open-planner-modal-btn" class="add-planner-cta-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Add to Planner
            </button>
            <p id="planner-add-status" style="margin-top: 0.5rem; text-align: center; color: var(--pm-green); font-size: 0.85rem; font-weight: 500;"></p>
          </div>

          <!-- Nutrition Card -->
          <div class="sidebar-card">
            <h3 class="sidebar-card-title">Nutrition (estimated)</h3>
            <div class="nutrition-list">
              <div class="nutrition-row">
                <span class="nutrition-label">Calories</span>
                <span class="nutrition-val"><span>${nutrition ? Math.round(nutrition.calories) : "—"}</span> <span class="unit">kcal</span></span>
              </div>
              <div class="nutrition-row">
                <span class="nutrition-label">Protein</span>
                <span class="nutrition-val"><span>${nutrition ? Math.round(nutrition.protein) : "—"}</span> <span class="unit">g</span></span>
              </div>
              <div class="nutrition-row">
                <span class="nutrition-label">Carbs</span>
                <span class="nutrition-val"><span>${nutrition ? Math.round(nutrition.carbs) : "—"}</span> <span class="unit">g</span></span>
              </div>
              <div class="nutrition-row">
                <span class="nutrition-label">Fat</span>
                <span class="nutrition-val"><span>${nutrition ? Math.round(nutrition.fat) : "—"}</span> <span class="unit">g</span></span>
              </div>
              <div class="nutrition-row">
                <span class="nutrition-label">Fiber</span>
                <span class="nutrition-val"><span>${nutrition ? Math.round(nutrition.fiber) : "—"}</span> <span class="unit">g</span></span>
              </div>
              <div class="nutrition-row">
                <span class="nutrition-label">Sugar</span>
                <span class="nutrition-val"><span>${nutrition ? Math.round(nutrition.sugar) : "—"}</span> <span class="unit">g</span></span>
              </div>
              <div class="nutrition-row">
                <span class="nutrition-label">Sodium</span>
                <span class="nutrition-val"><span>${nutrition ? Math.round(nutrition.sodium) : "—"}</span> <span class="unit">mg</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add to Planner Modal Dialog -->
      <dialog id="planner-picker-modal" class="planner-picker-modal">
        <div class="planner-picker-content">
          <h3 class="planner-picker-title">Add to Planner</h3>

          <div style="margin-bottom: 1.25rem;">
            <div class="picker-group-label">Day</div>
            <div class="picker-pills" id="picker-day-pills">
              <button type="button" class="picker-pill active" data-day="monday">Mon</button>
              <button type="button" class="picker-pill" data-day="tuesday">Tue</button>
              <button type="button" class="picker-pill" data-day="wednesday">Wed</button>
              <button type="button" class="picker-pill" data-day="thursday">Thu</button>
              <button type="button" class="picker-pill" data-day="friday">Fri</button>
              <button type="button" class="picker-pill" data-day="saturday">Sat</button>
              <button type="button" class="picker-pill" data-day="sunday">Sun</button>
            </div>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <div class="picker-group-label">Meal</div>
            <div class="picker-pills" id="picker-slot-pills">
              <button type="button" class="picker-pill" data-slot="breakfast">Breakfast</button>
              <button type="button" class="picker-pill" data-slot="lunch">Lunch</button>
              <button type="button" class="picker-pill active" data-slot="dinner">Dinner</button>
            </div>
          </div>

          <div class="picker-actions">
            <button type="button" id="picker-cancel-btn" class="picker-cancel-btn">Cancel</button>
            <button type="button" id="picker-submit-btn" class="picker-submit-btn">Add to Planner</button>
          </div>
        </div>
      </dialog>
    `;

    // Back Button Handler
    const backBtn = qs("#recipe-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.history.length > 1 && document.referrer) {
          window.history.back();
        } else {
          window.location.href = "/index.html";
        }
      });
    }

    // Favorite Button Handler
    const favBtn = qs("#detail-fav-btn");
    if (favBtn) {
      favBtn.addEventListener("click", () => {
        toggleFavorite(recipe);
        const nowFav = isFavorite(recipe.id);
        const svg = favBtn.querySelector("svg");
        if (svg) {
          svg.setAttribute("fill", nowFav ? "#D94F3D" : "none");
          svg.setAttribute("stroke", nowFav ? "#D94F3D" : "#6F746E");
        }
      });
    }

    // Modal Picker State & Handlers
    let selectedDay = "monday";
    let selectedSlot = "dinner";

    const plannerModal = qs("#planner-picker-modal");
    const openModalBtn = qs("#open-planner-modal-btn");
    const cancelModalBtn = qs("#picker-cancel-btn");
    const submitModalBtn = qs("#picker-submit-btn");
    const statusMsg = qs("#planner-add-status");

    if (openModalBtn && plannerModal) {
      openModalBtn.addEventListener("click", () => {
        plannerModal.showModal();
      });
    }

    if (cancelModalBtn && plannerModal) {
      cancelModalBtn.addEventListener("click", () => {
        plannerModal.close();
      });
    }

    document
      .querySelectorAll("#picker-day-pills .picker-pill")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll("#picker-day-pills .picker-pill")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          selectedDay = btn.dataset.day;
        });
      });

    document
      .querySelectorAll("#picker-slot-pills .picker-pill")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll("#picker-slot-pills .picker-pill")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          selectedSlot = btn.dataset.slot;
        });
      });

    if (submitModalBtn && plannerModal) {
      submitModalBtn.addEventListener("click", () => {
        addToMealPlan(recipe, selectedDay, selectedSlot, nutrition);
        plannerModal.close();
        const dayName =
          selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1);
        const slotName =
          selectedSlot.charAt(0).toUpperCase() + selectedSlot.slice(1);
        showToast(`Added ${recipe.title} to ${dayName} ${slotName}`, "success");
        if (statusMsg) {
          statusMsg.textContent = `Added to ${dayName} ${selectedSlot}!`;
        }
      });
    }
  } catch (error) {
    console.error("Failed to load recipe detail:", error);
    content.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <h2>Failed to load recipe</h2>
        <p style="color: var(--pm-muted); margin-bottom: 1.5rem;">Could not fetch details for this recipe.</p>
        <a href="/index.html" class="empty-state-btn">Back to Home</a>
      </div>
    `;
  }
}

renderRecipeDetail();
