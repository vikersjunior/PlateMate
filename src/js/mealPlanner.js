import { getLocalStorage, setLocalStorage, loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

function renderMealPlan() {
  const mealPlan = getLocalStorage("so-mealplan") || {};

  document.querySelectorAll(".day-column").forEach((column) => {
    const day = column.dataset.day;
    const mealsList = column.querySelector(".day-meals");
    const recipes = mealPlan[day] || [];

    if (recipes.length === 0) {
      mealsList.innerHTML = "<li class='empty'>No meals planned</li>";
      return;
    }

    mealsList.innerHTML = recipes
      .map(
        (recipe, index) => `
      <li>
        <a href="/recipe-details/index.html?id=${recipe.id}">${recipe.title}</a>
        <button class="remove-meal" data-day="${day}" data-index="${index}">×</button>
      </li>
    `,
      )
      .join("");
  });

  document.querySelectorAll(".remove-meal").forEach((button) => {
    button.addEventListener("click", (e) => {
      const day = e.target.dataset.day;
      const index = Number(e.target.dataset.index);
      removeMeal(day, index);
    });
  });
}

function removeMeal(day, index) {
  const mealPlan = getLocalStorage("so-mealplan") || {};

  if (mealPlan[day]) {
    mealPlan[day].splice(index, 1);
    setLocalStorage("so-mealplan", mealPlan);
  }

  renderMealPlan();
}

renderMealPlan();
