import { getLocalStorage, loadHeaderFooter, qs } from "./utils.mjs";

loadHeaderFooter();

const subtitle = qs("#shopping-subtitle");
const clearCheckedBtn = qs("#clear-checked-btn");
const emptyState = qs("#shopping-empty-state");
const contentArea = qs("#shopping-content");

const progressPercent = qs("#shopping-progress-percent");
const progressFill = qs("#shopping-progress-fill");
const groupsContainer = qs("#shopping-groups-container");

const produceWords = ["tomato", "cucumber", "onion", "garlic", "lemon", "pepper", "zucchini", "asparagus", "pea", "basil", "parsley", "thyme", "rosemary", "cabbage", "avocado", "radish", "edamame", "corn", "sweet potato", "scallion", "eggplant", "green", "herb", "lime", "fruit", "berry", "chive", "mint", "ginger", "cilantro"];
const proteinWords = ["chicken", "beef", "pork", "egg", "guanciale", "pancetta", "bacon", "sausage", "lamb", "fish", "shrimp", "chashu", "anchovy"];
const dairyWords = ["butter", "cream", "milk", "cheese", "mascarpone", "mozzarella", "feta", "parmigiano", "pecorino", "sour cream", "yogurt", "crème"];
const pantryWords = ["flour", "sugar", "oil", "vinegar", "soy", "miso", "broth", "stock", "paste", "sauce", "noodle", "pasta", "spaghetti", "penne", "rice", "farro", "nori", "sesame", "cocoa", "chocolate", "salt", "pepper", "spice", "paprika", "cumin", "oregano", "thyme", "vanilla", "baking", "panko", "breadcrumb", "tahini", "mirin", "fish sauce", "achiote", "chipotle", "coconut milk", "chickpea", "olive", "bean"];

function groupIngredients(ingredients) {
  const produce = [];
  const proteins = [];
  const dairy = [];
  const pantry = [];
  const other = [];

  const seen = new Set();

  for (const item of ingredients) {
    const normalized = item.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (produceWords.some((w) => normalized.includes(w))) produce.push(item);
    else if (proteinWords.some((w) => normalized.includes(w))) proteins.push(item);
    else if (dairyWords.some((w) => normalized.includes(w))) dairy.push(item);
    else if (pantryWords.some((w) => normalized.includes(w))) pantry.push(item);
    else other.push(item);
  }

  const groups = {};
  if (produce.length) groups["🥦 Produce"] = produce.map((item, i) => ({ item, key: `produce-${i}` }));
  if (proteins.length) groups["🥩 Proteins"] = proteins.map((item, i) => ({ item, key: `protein-${i}` }));
  if (dairy.length) groups["🧀 Dairy"] = dairy.map((item, i) => ({ item, key: `dairy-${i}` }));
  if (pantry.length) groups["🫙 Pantry"] = pantry.map((item, i) => ({ item, key: `pantry-${i}` }));
  if (other.length) groups["📦 Other"] = other.map((item, i) => ({ item, key: `other-${i}` }));
  return groups;
}

function getCheckedKeys() {
  try {
    const stored = localStorage.getItem("pm_shopping_checks");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function setCheckedKeys(set) {
  localStorage.setItem("pm_shopping_checks", JSON.stringify([...set]));
}

function getAllPlannedIngredients() {
  const mealPlan = getLocalStorage("so-mealplan") || {};
  const allIngredients = [];

  Object.values(mealPlan).forEach((dayData) => {
    const meals = Array.isArray(dayData)
      ? dayData
      : dayData && typeof dayData === "object"
      ? Object.values(dayData)
      : [];

    meals.forEach((recipe) => {
      if (recipe) {
        if (recipe.extendedIngredients && Array.isArray(recipe.extendedIngredients)) {
          recipe.extendedIngredients.forEach((ing) => {
            if (ing.original || ing.name) {
              allIngredients.push(ing.original || ing.name);
            }
          });
        } else if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          allIngredients.push(...recipe.ingredients);
        }
      }
    });
  });

  return allIngredients;
}

function renderShoppingPage() {
  const allIngredients = getAllPlannedIngredients();
  const grouped = groupIngredients(allIngredients);
  const totalItems = Object.values(grouped).reduce((acc, arr) => acc + arr.length, 0);

  if (totalItems === 0) {
    if (subtitle) subtitle.textContent = "No items in your list";
    if (clearCheckedBtn) clearCheckedBtn.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    if (contentArea) contentArea.style.display = "none";
    return;
  }

  const checkedKeys = getCheckedKeys();
  const allFlatItems = Object.values(grouped).flat();
  const checkedCount = allFlatItems.filter(({ key }) => checkedKeys.has(key)).length;
  const percent = Math.round((checkedCount / totalItems) * 100);

  // Update Header & Actions
  if (subtitle) {
    subtitle.textContent = `${checkedCount} of ${totalItems} items checked`;
  }

  if (clearCheckedBtn) {
    clearCheckedBtn.style.display = checkedCount > 0 ? "inline-block" : "none";
  }

  if (emptyState) emptyState.style.display = "none";
  if (contentArea) contentArea.style.display = "block";

  // Update Progress Bar
  if (progressPercent) progressPercent.textContent = `${percent}%`;
  if (progressFill) progressFill.style.width = `${percent}%`;

  // Render Grouped List Cards
  if (!groupsContainer) return;

  const html = Object.entries(grouped)
    .map(([groupName, items]) => {
      const itemsHtml = items
        .map(({ item, key }, idx) => {
          const isChecked = checkedKeys.has(key);
          const isLast = idx === items.length - 1;

          return `
            <label class="shopping-item-row ${isLast ? "is-last" : ""}">
              <input type="checkbox" class="shopping-checkbox" data-key="${key}" ${isChecked ? "checked" : ""} />
              <span class="shopping-custom-checkbox ${isChecked ? "is-checked" : ""}">
                ${
                  isChecked
                    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>`
                    : ""
                }
              </span>
              <span class="shopping-item-text ${isChecked ? "is-checked" : ""}">${item}</span>
            </label>
          `;
        })
        .join("");

      return `
        <div class="shopping-group-section">
          <h2 class="shopping-group-title">${groupName}</h2>
          <div class="shopping-group-card">
            ${itemsHtml}
          </div>
        </div>
      `;
    })
    .join("");

  groupsContainer.innerHTML = html;

  // Checkbox Event Handlers
  document.querySelectorAll(".shopping-checkbox").forEach((input) => {
    input.addEventListener("change", (e) => {
      const key = e.target.dataset.key;
      const current = getCheckedKeys();
      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
      }
      setCheckedKeys(current);
      renderShoppingPage();
    });
  });
}

// Clear Checked Handler
if (clearCheckedBtn) {
  clearCheckedBtn.addEventListener("click", () => {
    localStorage.removeItem("pm_shopping_checks");
    renderShoppingPage();
  });
}

renderShoppingPage();
