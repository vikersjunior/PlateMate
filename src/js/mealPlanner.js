import {
  getLocalStorage,
  setLocalStorage,
  loadHeaderFooter,
  qs,
  showToast,
  parseRecipeNutrition,
} from "./utils.mjs";

loadHeaderFooter();

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const SLOTS = ["breakfast", "lunch", "dinner"];
const SLOT_ICONS = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

const plannerGrid = qs("#meal-planner-grid");
const emptyState = qs("#planner-empty-state");
const subtitle = qs("#planner-subtitle");
const shoppingListBtn = qs("#shopping-list-btn");
const nutritionSummaryEl = qs("#weekly-nutrition-summary");

function getMealPlan() {
  return getLocalStorage("so-mealplan") || {};
}

function countTotalMeals(mealPlan) {
  let count = 0;
  DAYS.forEach((day) => {
    const dayData = mealPlan[day];
    if (Array.isArray(dayData)) {
      count += dayData.length;
    } else if (dayData && typeof dayData === "object") {
      SLOTS.forEach((slot) => {
        if (dayData[slot]) count++;
      });
    }
  });
  return count;
}

function getAllPlannedMeals(mealPlan) {
  const meals = [];

  DAYS.forEach((day) => {
    const dayData = mealPlan[day];
    if (!dayData) return;

    if (Array.isArray(dayData)) {
      dayData.forEach((recipe) => recipe && meals.push(recipe));
    } else {
      SLOTS.forEach((slot) => {
        if (dayData[slot]) meals.push(dayData[slot]);
      });
    }
  });

  return meals;
}

async function calculateWeeklyNutrition() {
  const mealPlan = getMealPlan();
  const meals = getAllPlannedMeals(mealPlan);

  if (meals.length === 0) {
    if (nutritionSummaryEl) nutritionSummaryEl.innerHTML = "";
    return;
  }

  const totals = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  for (const meal of meals) {
    const nutrition = parseRecipeNutrition(meal);
    totals.calories += nutrition.calories || 0;
    totals.protein += nutrition.protein || 0;
    totals.carbs += nutrition.carbs || 0;
    totals.fat += nutrition.fat || 0;
    totals.fiber += nutrition.fiber || 0;
    totals.sugar += nutrition.sugar || 0;
    totals.sodium += nutrition.sodium || 0;
  }

  renderWeeklyNutrition(totals, meals.length);
}

function renderWeeklyNutrition(totals, mealCount) {
  if (!nutritionSummaryEl) return;

  nutritionSummaryEl.innerHTML = `
    <div class="nutrition-summary">
      <h2 class="nutrition-summary__title">Weekly Nutrition Summary</h2>
      <p class="nutrition-summary__subtitle">Estimated totals across ${mealCount} planned meal${mealCount !== 1 ? "s" : ""}</p>

      <div class="nutrition-summary__grid">
        <div class="nutrition-tile nutrition-tile--highlight">
          <div class="nutrition-tile__value">${Math.round(totals.calories)}<span class="nutrition-tile__unit">kcal</span></div>
          <div class="nutrition-tile__label">Calories</div>
        </div>
        <div class="nutrition-tile">
          <div class="nutrition-tile__value">${Math.round(totals.protein)}<span class="nutrition-tile__unit">g</span></div>
          <div class="nutrition-tile__label">Protein</div>
        </div>
        <div class="nutrition-tile">
          <div class="nutrition-tile__value">${Math.round(totals.carbs)}<span class="nutrition-tile__unit">g</span></div>
          <div class="nutrition-tile__label">Carbs</div>
        </div>
        <div class="nutrition-tile">
          <div class="nutrition-tile__value">${Math.round(totals.fat)}<span class="nutrition-tile__unit">g</span></div>
          <div class="nutrition-tile__label">Fat</div>
        </div>
        <div class="nutrition-tile">
          <div class="nutrition-tile__value">${Math.round(totals.fiber)}<span class="nutrition-tile__unit">g</span></div>
          <div class="nutrition-tile__label">Fiber</div>
        </div>
        <div class="nutrition-tile">
          <div class="nutrition-tile__value">${Math.round(totals.sugar)}<span class="nutrition-tile__unit">g</span></div>
          <div class="nutrition-tile__label">Sugar</div>
        </div>
        <div class="nutrition-tile">
          <div class="nutrition-tile__value">${Math.round(totals.sodium)}<span class="nutrition-tile__unit">mg</span></div>
          <div class="nutrition-tile__label">Sodium</div>
        </div>
      </div>

      <p class="nutrition-summary__disclaimer">
        Estimated from the first few ingredients of each recipe, a rough total, not a precise count.
      </p>
    </div>
  `;
}

function renderMealPlan() {
  const mealPlan = getMealPlan();
  const totalMeals = countTotalMeals(mealPlan);

  // Update Header & Empty State Visibility
  if (totalMeals > 0) {
    if (subtitle) {
      subtitle.textContent = `${totalMeals} meal${totalMeals !== 1 ? "s" : ""} planned this week`;
    }
    if (shoppingListBtn) shoppingListBtn.style.display = "inline-flex";
    if (emptyState) emptyState.style.display = "none";
  } else {
    if (subtitle) {
      subtitle.textContent = "No meals planned yet — add some recipes!";
    }
    if (shoppingListBtn) shoppingListBtn.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
  }

  // Render 7 Day Cards
  if (!plannerGrid) return;

  const daysHtml = DAYS.map((day) => {
    const dayData = mealPlan[day];
    const isArray = Array.isArray(dayData);

    const slotsHtml = SLOTS.map((slot, slotIndex) => {
      let recipe = null;
      if (isArray) {
        recipe = dayData[slotIndex] || null;
      } else if (dayData && typeof dayData === "object") {
        recipe = dayData[slot] || null;
      }

      const icon = SLOT_ICONS[slot];

      if (recipe) {
        return `
          <div class="planner-slot">
            <div class="planner-slot-label">
              <span>${icon}</span>
              <span>${slot}</span>
            </div>
            <div class="planner-meal-card">
              <a href="/recipe-details/index.html?id=${recipe.id}">
                <img
                  src="${recipe.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=150&fit=crop"}"
                  alt="${recipe.title}"
                  class="planner-meal-thumb"
                />
                <div class="planner-meal-info">
                  <p class="planner-meal-title">${recipe.title}</p>
                </div>
              </a>
              <button
                type="button"
                class="planner-meal-remove"
                data-day="${day}"
                data-slot="${slot}"
                data-index="${slotIndex}"
                title="Remove meal"
              >&times;</button>
            </div>
          </div>
        `;
      }

      return `
        <div class="planner-slot">
          <div class="planner-slot-label">
            <span>${icon}</span>
            <span>${slot}</span>
          </div>
          <a href="/index.html" class="planner-add-slot-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add recipe
          </a>
        </div>
      `;
    }).join("");

    return `
      <div class="planner-day-card">
        <div class="planner-day-name">${DAY_LABELS[day]}</div>
        ${slotsHtml}
      </div>
    `;
  }).join("");

  plannerGrid.innerHTML = daysHtml;

  // Attach Remove Meal Handlers
  document.querySelectorAll(".planner-meal-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const d = btn.dataset.day;
      const s = btn.dataset.slot;
      const idx = Number(btn.dataset.index);
      removeMeal(d, s, idx);
    });
  });
}

function removeMeal(day, slot, index) {
  const mealPlan = getMealPlan();

  if (Array.isArray(mealPlan[day])) {
    mealPlan[day].splice(index, 1);
  } else if (mealPlan[day] && typeof mealPlan[day] === "object") {
    delete mealPlan[day][slot];
  }

  setLocalStorage("so-mealplan", mealPlan);
  showToast("Recipe removed from planner", "error");
  renderMealPlan();
  calculateWeeklyNutrition();
}

// Generate Shopping List Action
if (shoppingListBtn) {
  shoppingListBtn.addEventListener("click", () => {
    window.location.href = "/shopping/index.html";
  });
}

renderMealPlan();
calculateWeeklyNutrition();
