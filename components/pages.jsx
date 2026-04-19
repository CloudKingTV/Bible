// Page content components
const { useState, useEffect, useRef, useMemo, useCallback } = React;

function TitleSpread() {
  return (
    <div className="title-plate" style={{ padding: 10 }}>
      <div className="ornament">❦</div>
      <div className="ornament-bar"></div>
      <h1 style={{ fontSize: "1.75em", lineHeight: 1.15, margin: "6px 0" }}>The Holy Bible</h1>
      <h2 style={{ fontSize: "0.65em", margin: "4px 0" }}>Containing the Old<br/>and New Testaments</h2>
      <div className="ornament-bar"></div>
      <div className="ornament" style={{ margin: "12px 0" }}>✠</div>
      <h2 style={{ fontSize: "0.6em", marginTop: 6 }}>Translated out of<br/>the Original Tongues</h2>
      <div className="imprint" style={{ marginTop: 18, fontSize: "0.62em" }}>
        Appointed to be read in Churches<br/>
        <span style={{ opacity: 0.6 }}>— Anno Domini MDCXI —</span>
      </div>
      <div className="ornament-bar" style={{ marginTop: 12 }}></div>
    </div>
  );
}

function TableOfContents({ testament, onPick, half }) {
  const books = window.BIBLE_BOOKS.filter(b => b.testament === testament);
  const grouped = {};
  books.forEach(b => {
    grouped[b.group] = grouped[b.group] || [];
    grouped[b.group].push(b);
  });
  let groupEntries = Object.entries(grouped);
  // Split OT into two pages: half 1 = Pentateuch/History; half 2 = Wisdom/Prophets
  if (testament === "OT") {
    if (half === 1) {
      groupEntries = groupEntries.filter(([g]) => ["Pentateuch","History"].includes(g));
    } else if (half === 2) {
      groupEntries = groupEntries.filter(([g]) => ["Wisdom","Major Prophets","Minor Prophets"].includes(g));
    }
  }
  // NT uses 2 columns (27 books)
  const useColumns = testament === "NT";
  const title = testament === "OT"
    ? (half === 2 ? "Old Testament · continued" : "Books of the Old Testament")
    : "Books of the New Testament";
  return (
    <div style={{ flex: 1, padding: "0 4px", fontSize: "0.85em", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div className="chapter-heading" style={{ marginTop: 0, marginBottom: 8, fontSize: "0.75em" }}>
        {title}
      </div>
      <div style={{ flex: 1, columns: useColumns ? 2 : 1, columnGap: 18 }}>
      {groupEntries.map(([group, items]) => (
        <div key={group} style={{ marginBottom: 5, breakInside: "avoid" }}>
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: "0.6em",
            letterSpacing: "0.3em",
            color: "var(--ink-soft)",
            textTransform: "uppercase",
            marginBottom: 2,
            borderBottom: "1px dotted rgba(100,70,30,0.3)",
            paddingBottom: 2,
          }}>{group}</div>
          {items.map(b => (
            <div key={b.id}
              onClick={() => onPick(b)}
              style={{
                cursor: "pointer",
                fontSize: "0.82em",
                padding: "0 4px",
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                lineHeight: 1.25,
                borderRadius: 2,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--rubric)"; e.currentTarget.style.background = "rgba(139,42,26,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = ""; e.currentTarget.style.background = ""; }}
            >
              <span style={{ flexShrink: 0 }}>{b.name}</span>
              <span style={{ flex: 1, margin: "0 6px", borderBottom: "1px dotted rgba(100,70,30,0.4)", transform: "translateY(-3px)", minWidth: 18 }}></span>
              <span style={{ color: "var(--ink-soft)", fontSize: "0.88em", flexShrink: 0 }}>
                {b.index + 1}
              </span>
            </div>
          ))}
        </div>
      ))}
      </div>
    </div>
  );
}

function TestamentDivider({ testament }) {
  return (
    <div className="title-plate">
      <div className="ornament">✠ ❦ ✠</div>
      <div className="ornament-bar"></div>
      <h1 style={{ fontSize: "1.7em", marginTop: 20 }}>
        {testament === "OT" ? "The Old" : "The New"}
      </h1>
      <h1 style={{ fontSize: "2em", color: "var(--rubric)", margin: "8px 0" }}>
        Testament
      </h1>
      <div className="ornament-bar"></div>
      <h2 style={{ fontSize: "0.7em", marginTop: 16, fontStyle: "italic", letterSpacing: "0.18em" }}>
        {testament === "OT"
          ? "In the beginning..."
          : "The gospel of our Lord"}
      </h2>
      <div className="ornament" style={{ marginTop: 28 }}>✠</div>
    </div>
  );
}

function BookOpeningPage({ book }) {
  const versesToShow = book.verses.slice(0, Math.ceil(book.verses.length / 2));
  return (
    <>
      <div className="page-header">
        <span>{book.testament === "OT" ? "Old Testament" : "New Testament"}</span>
        <span>{book.group}</span>
      </div>
      <div className="book-title-heading">
        {book.name}
        <span className="flourish">❦ Chapter I ❦</span>
      </div>
      <div className="verses-scroll">
        <p className="verses">
          <span className="drop-cap">{versesToShow[0]?.[0] || "T"}</span>
          {versesToShow.map((v, i) => (
            <span className="verse" key={i}>
              {i > 0 && <span className="verse-num">{i + 1}</span>}
              {i === 0 ? v.slice(1) : v}
              {" "}
            </span>
          ))}
        </p>
      </div>
      <div className="page-footer">
        <span style={{ letterSpacing: "0.25em" }}>— {book.abbr} · 1 —</span>
      </div>
    </>
  );
}

function BookContinuedPage({ book }) {
  const versesFromHalf = book.verses.slice(Math.ceil(book.verses.length / 2));
  return (
    <>
      <div className="page-header">
        <span>{book.name}</span>
        <span>Chapter I</span>
      </div>
      <div className="verses-scroll">
        <p className="verses">
          {versesFromHalf.map((v, i) => {
            const n = Math.ceil(book.verses.length / 2) + i + 1;
            return (
              <span className="verse" key={i}>
                <span className="verse-num">{n}</span>
                {v}{" "}
              </span>
            );
          })}
          <span style={{ color: "var(--ink-soft)", fontStyle: "italic", fontSize: "0.85em" }}>
            {" "}⁂ continued through {book.chapters} chapter{book.chapters > 1 ? "s" : ""} ⁂
          </span>
        </p>
      </div>
      <div className="page-footer">
        <span style={{ letterSpacing: "0.25em" }}>— {book.abbr} · 1 —</span>
      </div>
    </>
  );
}

function PageContent({ pageIndex, onPickBook }) {
  const TOC_PAGES = 4; // page 1 = OT half 1, page 2 = OT half 2, page 3 = NT
  const TOTAL = TOC_PAGES + window.BIBLE_BOOKS.length * 2;
  if (pageIndex < 0 || pageIndex >= TOTAL) {
    return <div className="title-plate"><div className="ornament" style={{ fontSize: "1.2em", letterSpacing: "0.4em" }}>⁂ FINIS ⁂</div></div>;
  }
  if (pageIndex === 0) return <TitleSpread />;
  if (pageIndex === 1) return <TableOfContents testament="OT" onPick={onPickBook} half={1} />;
  if (pageIndex === 2) return <TableOfContents testament="OT" onPick={onPickBook} half={2} />;
  if (pageIndex === 3) return <TableOfContents testament="NT" onPick={onPickBook} />;
  const bookPageIndex = pageIndex - TOC_PAGES;
  const bookIdx = Math.floor(bookPageIndex / 2);
  const side = bookPageIndex % 2;
  const book = window.BIBLE_BOOKS[bookIdx];
  if (!book) return <div className="title-plate"><div className="ornament">⁂ FINIS ⁂</div></div>;
  return side === 0
    ? <BookOpeningPage book={book} />
    : <BookContinuedPage book={book} />;
}

Object.assign(window, { PageContent, TitleSpread, TableOfContents, TestamentDivider, BookOpeningPage, BookContinuedPage });
