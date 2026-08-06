// wrapper for querySelector...returns matching element
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

// retrieve data from localStorage
export function getLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

// save data to local storage
export function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

//reads the current URL's query string and pulls out whatever param name you ask for
export function getParam(param) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(param);
}

//renders the content from the template into the parentElement
export function renderWithTemplate(template, parentElement, data, callback) {
  parentElement.innerHTML = template;
  if (callback) {
    callback(data);
  }
}

async function loadTemplate(path) {
  const response = await fetch(path);
  const html = await response.text();
  return html;
}

export async function loadHeaderFooter() {
  const headerTemplate = await loadTemplate("/partials/header.html");
  const footerTemplate = await loadTemplate("/partials/footer.html");

  const headerElement = document.querySelector("#main-header");
  const footerElement = document.querySelector("#main-footer");

  renderWithTemplate(headerTemplate, headerElement, null, highlightActiveNav);
  renderWithTemplate(footerTemplate, footerElement);
}

function highlightActiveNav() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll("nav a");

  navLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (linkPath === currentPath || (currentPath === "/" && linkPath === "/index.html")) {
      link.classList.add("active");
    }
  });

  updateFavoritesBadge();
}

export function updateFavoritesBadge() {
  const badge = document.querySelector("#nav-fav-badge");
  if (!badge) return;
  const favorites = getLocalStorage("so-favorites") || [];
  if (favorites.length > 0) {
    badge.textContent = favorites.length;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

export function showToast(message, type = "success") {
  let toastContainer = document.querySelector("#pm-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "pm-toast-container";
    toastContainer.className = "pm-toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `pm-toast pm-toast--${type}`;

  const iconSvg =
    type === "error" || type === "info"
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>`;

  toast.innerHTML = `
    <span class="pm-toast-icon">${iconSvg}</span>
    <span class="pm-toast-msg">${message}</span>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 3000);
}
