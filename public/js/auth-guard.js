/* Login first: if the visitor is not signed in, send them to the login page. */
(() => {
  if (window.__PREVIEW) return;
  const root = document.documentElement;
  root.style.visibility = "hidden";
  fetch("/api/auth/me")
    .then(r => { if (!r.ok) throw new Error("not signed in"); root.style.visibility = ""; })
    .catch(() => location.replace("/login.html"));
})();
