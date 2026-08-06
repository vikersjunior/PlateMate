export function recipeCardTemplate(recipe) {
  return `<li class="recipe-card">
    <a href="/recipe-details/index.html?id=${recipe.id}">
      <img src="${recipe.image}" alt="${recipe.title}" />
      <h3>${recipe.title}</h3>
      <p class="recipe-card__meta">
        ${recipe.readyInMinutes ? `${recipe.readyInMinutes} min` : ""}
        ${recipe.servings ? ` · Serves ${recipe.servings}` : ""}
      </p>
    </a>
  </li>`;
}
