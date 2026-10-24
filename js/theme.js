// Couleur de la barre d'état (theme-color). null = couleur d'origine.

const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
const originals = metas.map((m) => m.content);

export function setThemeColor(color) {
  metas.forEach((m, i) => (m.content = color ?? originals[i]));
}
