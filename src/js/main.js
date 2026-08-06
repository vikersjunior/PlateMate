import { qs } from "./utils.mjs";
import { recipeCardTemplate } from "./recipeCard.mjs";

const searchForm = qs("#search-form");
const resultsStatus = qs("#results-status");
const recipeList = qs("#recipe-list");
const dietCheckboxes = document.querySelectorAll("input[name='diet']");

const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;

async function searchRecipes(query, diet) {
  let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&query=${encodeURIComponent(query)}&number=12&addRecipeInformation=true`;

  if (diet) {
    url += `&diet=${diet}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.results;
}

function renderRecipeList(recipes) {
  if (recipes.length === 0) {
    recipeList.innerHTML = "";
    resultsStatus.textContent = "No recipes found. Try a different search.";
    return;
  }

  const html = recipes.map((recipe) => recipeCardTemplate(recipe)).join("");
  recipeList.innerHTML = html;
  resultsStatus.textContent = `Found ${recipes.length} recipes.`;
}

function getSelectedDiet() {
  const checked = document.querySelector("input[name='diet']:checked");
  return checked ? checked.value : "";
}

async function runSearch() {
  const query = qs("#search-input").value.trim();

  if (!query) {
    return;
  }

  const diet = getSelectedDiet();

  resultsStatus.textContent = "Searching...";
  recipeList.innerHTML = "";

  try {
    const recipes = await searchRecipes(query, diet);
    renderRecipeList(recipes);
  } catch (error) {
    console.error("Search failed:", error);
    resultsStatus.textContent = "Something went wrong. Please try again.";
  }
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch();
});

dietCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      dietCheckboxes.forEach((other) => {
        if (other !== e.target) {
          other.checked = false;
        }
      });
    }

    const query = qs("#search-input").value.trim();
    if (query) {
      runSearch();
    }
  });
});
