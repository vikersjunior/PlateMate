import { qs } from "./utils.mjs";

// Search page entry point.
// This will wire up the search form to the Spoonacular API
// once API integration begins (Week 6).

const searchForm = qs("#search-form");
const resultsStatus = qs("#results-status");

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = qs("#search-input").value;
  resultsStatus.textContent = `Search functionality coming soon. You searched for: "${query}"`;
});
