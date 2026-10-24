// Écran générique pour une section pas encore développée.

export function renderSoon(screen, { title, text, close }) {
  screen.innerHTML = `
    <div class="screen-content soon-screen">
      <header class="soon-top">
        <button type="button" class="r-icon" aria-label="Retour à l’accueil">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </header>
      <section class="soon">
        <span class="badge">Bientôt</span>
        <h1>${title}</h1>
        <p>${text}</p>
      </section>
    </div>
  `;
  screen.querySelector('button').addEventListener('click', close);
}
