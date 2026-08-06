import { getLocalStorage, setLocalStorage, loadHeaderFooter, updateFavoritesBadge, qs } from "./utils.mjs";
import { recipeCardTemplate } from "./recipeCard.mjs";

loadHeaderFooter();

const favoritesList = qs("#favorites-list");
const subtitle = qs("#favorites-subtitle");
const emptyState = qs("#favorites-empty-state");

function renderFavorites() {
  const favorites = getLocalStorage("so-favorites") || [];

  if (favorites.length === 0) {
    if (subtitle) subtitle.textContent = "No favorites yet";
    if (emptyState) emptyState.style.display = "block";
    if (favoritesList) favoritesList.innerHTML = "";
    return;
  }

  if (subtitle) {
    subtitle.textContent = `${favorites.length} recipe${favorites.length !== 1 ? "s" : ""} saved`;
  }
  if (emptyState) emptyState.style.display = "none";

  if (favoritesList) {
    favoritesList.innerHTML = favorites
      .map((recipe) => recipeCardTemplate(recipe, true))
      .join("");
  }
}

// Global click delegate to un-favorite recipes from the Favorites page dynamically
document.addEventListener("click", (e) => {
  const favBtn = e.target.closest(".recipe-card__fav-btn");
  if (!favBtn) return;

  e.preventDefault();
  e.stopPropagation();

  const recipeId = favBtn.dataset.id;
  let favorites = getLocalStorage("so-favorites") || [];
  favorites = favorites.filter((fav) => String(fav.id) !== String(recipeId));

  setLocalStorage("so-favorites", favorites);
  updateFavoritesBadge();
  renderFavorites();
});

renderFavorites();
