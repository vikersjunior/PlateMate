export function recipeCardTemplate(recipe, isFavorite = false) {
  const badgeText = (recipe.dishTypes && recipe.dishTypes[0]) || recipe.cuisine || (recipe.cuisines && recipe.cuisines[0]) || "Recipe";
  const time = recipe.readyInMinutes || recipe.time || 45;
  const servings = recipe.servings ? `Serves ${recipe.servings}` : "";

  return `<li class="recipe-card" data-recipe-id="${recipe.id}">
    <div class="recipe-card__image-wrap">
      <a href="/recipe-details/index.html?id=${recipe.id}" class="recipe-card__img-link">
        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy" />
      </a>
      <button type="button" class="recipe-card__fav-btn ${isFavorite ? "is-favorite" : ""}" data-id="${recipe.id}" aria-label="Favorite recipe">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? "#D94F3D" : "none"}" stroke="${isFavorite ? "#D94F3D" : "#6F746E"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      <div class="recipe-card__badge-wrap">
        <span class="recipe-card__badge">${badgeText}</span>
      </div>
    </div>
    <div class="recipe-card__body">
      <h3 class="recipe-card__title">
        <a href="/recipe-details/index.html?id=${recipe.id}">${recipe.title}</a>
      </h3>
      <div class="recipe-card__meta">
        <div class="recipe-card__time">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>${time} min</span>
        </div>
        ${servings ? `<span class="recipe-card__servings">${servings}</span>` : ""}
      </div>
    </div>
  </li>`;
}
