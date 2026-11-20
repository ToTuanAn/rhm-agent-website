/** Highlights the nav link of the section currently under the reading line. */
export function initNavHighlight(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".nav a[href^='#']"));
  if (links.length === 0) return;

  const byId = new Map<string, HTMLAnchorElement>();
  for (const link of links) {
    const id = link.hash.slice(1);
    if (id) byId.set(id, link);
  }

  const sections = Array.from(byId.keys())
    .map((id) => document.getElementById(id))
    .filter((section): section is HTMLElement => section !== null);

  if (sections.length === 0) return;

  const setActive = (id: string | null): void => {
    for (const [sectionId, link] of byId) {
      link.classList.toggle("is-active", sectionId === id);
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      const closest = visible.at(0)?.target;
      setActive(closest instanceof HTMLElement ? closest.id : null);
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
  );

  for (const section of sections) observer.observe(section);
}
