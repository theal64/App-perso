// Contenu générique pour un onglet pas encore développé.

export function renderSoon(container, title, text) {
  container.innerHTML = `
    <section class="soon">
      <span class="badge">Bientôt</span>
      <h1>${title}</h1>
      <p>${text}</p>
    </section>
  `;
}
