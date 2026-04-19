# The Holy Bible — Interactive

A leather-bound Bible reading experience with physical page-flip animation, thumb-index tabs, and a draggable ribbon bookmark.

## Run it

`Interactive Bible.html` loads its scripts with relative paths (`data/`, `components/`, `styles.css`), so browsers block them when opened via `file://`. Serve the directory over HTTP:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/Interactive%20Bible.html>.

## Project structure

```
Interactive Bible.html   # entry point (React + Babel Standalone)
styles.css               # leather/paper/gold aesthetic + flip animation
data/books.js            # KJV opening verses for all 66 books
components/
  pages.jsx              # title spread, TOC, book pages, drop caps
  book.jsx               # book shell, flip + riffle physics, tabs, ribbon
  app.jsx                # root, tweaks panel, responsive sizing
```

## Interactions

- Arrow keys / space — flip pages
- Bottom nav — prev, table of contents, next
- Right-edge tabs — jump to a book group (hover for a flyout picker)
- Drag a page corner — manual flip with snap-back
- Drag the ribbon — place a bookmark; double-click to jump to it
