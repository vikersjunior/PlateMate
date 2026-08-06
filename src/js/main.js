import { qs } from "./utils.mjs";

const searchForm = qs("#search-form");
const resultsStatus = qs("#results-status");
const recipeList = qs("#recipe-list");

const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;

async function searchRecipes(query) {
  const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&query=${encodeURIComponent(query)}&number=12`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.results;
}

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = qs("#search-input").value;

  resultsStatus.textContent = "Searching...";
  recipeList.innerHTML = "";

  try {
    const recipes = await searchRecipes(query);
    console.log(recipes);
    resultsStatus.textContent = `Found ${recipes.length} recipes.`;
  } catch (error) {
    console.error("Search failed:", error);
    resultsStatus.textContent = "Something went wrong. Please try again.";
  }
});

