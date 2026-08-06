import { getLocalStorage, loadHeaderFooter } from "./utils.mjs";
import { recipeCardTemplate } from "./recipeCard.mjs";

loadHeaderFooter();

const favoritesList = document.querySelector("#favorites-list");
const favoritesStatus = document.querySelector("#favorites-status");

function renderFavorites() {
  const favorites = getLocalStorage("so-favorites") || [];

  if (favorites.length === 0) {
    favoritesList.innerHTML = "";
    favoritesStatus.textContent = "You haven't saved any favorites yet.";
    return;
  }

  favoritesStatus.textContent = "";
  favoritesList.innerHTML = favorites
    .map((recipe) => recipeCardTemplate(recipe))
    .join("");
}

renderFavorites();
