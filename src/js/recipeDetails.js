import { getParam, getLocalStorage, setLocalStorage } from "./utils.mjs";

const spoonacularKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
const usdaKey = import.meta.env.VITE_USDA_FDC_API_KEY;

const recipeId = getParam("id");
const content = document.querySelector("#recipe-detail-content");

async function getRecipeDetails(id) {
  const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${spoonacularKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return await response.json();
}

async function getNutritionForIngredient(ingredientName) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredientName)}&pageSize=1&api_key=${usdaKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const food = data.foods && data.foods[0];

  if (!food) {
    return null;
  }

  const nutrients = {};
  food.foodNutrients.forEach((n) => {
    if (n.nutrientName === "Energy") nutrients.calories = n.value;
    if (n.nutrientName === "Protein") nutrients.protein = n.value;
    if (n.nutrientName === "Total lipid (fat)") nutrients.fat = n.value;
    if (n.nutrientName === "Carbohydrate, by difference")
      nutrients.carbs = n.value;
  });

  return nutrients;
}

function ingredientListTemplate(ingredients) {
  return ingredients.map((ing) => `<li>${ing.original}</li>`).join("");
}

function instructionsTemplate(recipe) {
  if (!recipe.analyzedInstructions.length) {
    return "<p>No instructions available for this recipe.</p>";
  }

  const steps = recipe.analyzedInstructions[0].steps
    .map((step) => `<li>${step.step}</li>`)
    .join("");

  return `<ol class="instructions-list">${steps}</ol>`;
}

function nutritionItemTemplate(name, nutrients) {
  if (!nutrients) {
    return `<li class="nutrition-item">${name}: nutrition data unavailable</li>`;
  }

  return `<li class="nutrition-item">
    <strong>${name}</strong>
    ${nutrients.calories ? ` — ${Math.round(nutrients.calories)} cal` : ""}
    ${nutrients.protein ? `, ${Math.round(nutrients.protein)}g protein` : ""}
    ${nutrients.fat ? `, ${Math.round(nutrients.fat)}g fat` : ""}
    ${nutrients.carbs ? `, ${Math.round(nutrients.carbs)}g carbs` : ""}
  </li>`;
}

function dayOptionsTemplate() {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  return days
    .map(
      (day) =>
        `<option value="${day}">${day[0].toUpperCase() + day.slice(1)}</option>`,
    )
    .join("");
}

function addToMealPlan(recipe, day) {
  const mealPlan = getLocalStorage("so-mealplan") || {};

  if (!mealPlan[day]) {
    mealPlan[day] = [];
  }

  mealPlan[day].push({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
  });

  setLocalStorage("so-mealplan", mealPlan);
}

function isFavorite(id) {
  const favorites = getLocalStorage("so-favorites") || [];
  return favorites.some((fav) => fav.id === id);
}

function toggleFavorite(recipe) {
  let favorites = getLocalStorage("so-favorites") || [];

  if (isFavorite(recipe.id)) {
    favorites = favorites.filter((fav) => fav.id !== recipe.id);
  } else {
    favorites.push({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      servings: recipe.servings,
    });
  }

  setLocalStorage("so-favorites", favorites);
}

async function renderRecipeDetail() {
  try {
    const recipe = await getRecipeDetails(recipeId);

    content.innerHTML = `
      <div class="recipe-detail">
        <h1>${recipe.title}</h1>
        <img src="${recipe.image}" alt="${recipe.title}" />
        <button id="favorite-btn" type="button" class="favorite-btn">
          ${isFavorite(recipe.id) ? "★ Remove from Favorites" : "☆ Add to Favorites"}
        </button>
        <p>${recipe.readyInMinutes} min · Serves ${recipe.servings}</p>

        <h2>Ingredients</h2>
        <ul class="ingredient-list">
          ${ingredientListTemplate(recipe.extendedIngredients)}
        </ul>

        <h2>Instructions</h2>
        ${instructionsTemplate(recipe)}

        <h2>Nutrition (per key ingredient)</h2>
        <ul id="nutrition-list" class="nutrition-list">
          <li>Loading nutrition data...</li>
        </ul>

        <h2>Add to Meal Planner</h2>
        <div class="add-to-planner">
          <select id="day-select">
            ${dayOptionsTemplate()}
          </select>
          <button id="add-to-planner-btn" type="button">Add to Plan</button>
        </div>
        <p id="add-status"></p>
      </div>
    `;

    const nutritionList = document.querySelector("#nutrition-list");
    const topIngredients = recipe.extendedIngredients.slice(0, 5);

    const nutritionResults = await Promise.all(
      topIngredients.map((ing) => getNutritionForIngredient(ing.name)),
    );

    const nutritionHtml = topIngredients
      .map((ing, index) =>
        nutritionItemTemplate(ing.name, nutritionResults[index]),
      )
      .join("");

    nutritionList.innerHTML = nutritionHtml;

    document
      .querySelector("#add-to-planner-btn")
      .addEventListener("click", () => {
        const day = document.querySelector("#day-select").value;
        addToMealPlan(recipe, day);
        document.querySelector("#add-status").textContent =
          `Added "${recipe.title}" to ${day}.`;
      });

    document.querySelector("#favorite-btn").addEventListener("click", () => {
      toggleFavorite(recipe);
      const btn = document.querySelector("#favorite-btn");
      btn.textContent = isFavorite(recipe.id)
        ? "★ Remove from Favorites"
        : "☆ Add to Favorites";
    });
  } catch (error) {
    console.error("Failed to load recipe:", error);
    content.innerHTML = "<p>Failed to load recipe. Please try again.</p>";
  }
}

renderRecipeDetail();
