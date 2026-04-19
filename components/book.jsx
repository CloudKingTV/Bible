// Main book component with page-flip physics
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM, useCallback: uC } = React;

// Total page count: 4 fixed + 66 books * 2 = 136
const TOTAL_PAGES = 4 + window.BIBLE_BOOKS.length * 2;

function bookStartPage(book) {
  return 4 + book.index * 2;
}

function Book({ tweaks }) {
  const [current, setCurrent] = uS(() => {
    const saved = parseInt(localStorage.getItem("bible-page") || "0", 10);
    return isFinite(saved) && saved >= 0 && saved < TOTAL_PAGES ? (saved % 2 === 0 ? saved : saved - 1) : 0;
  });
  // Current is always the LEFT page of the open spread (even number)
  const [flipping, setFlipping] = uS(null); // { direction: 'next'|'prev', progress: 0..1, manual?: bool }
  const [riffle, setRiffle] = uS(null); // { from, to, progress, direction }
  const [ribbonPage, setRibbonPage] = uS(() => {
    const v = localStorage.getItem("bible-ribbon");
    return v ? parseInt(v, 10) : 0;
  });
  const [ribbonDrag, setRibbonDrag] = uS(null);

  const flipDurationMs = tweaks.flipSpeed;

  uE(() => {
    localStorage.setItem("bible-page", String(current));
  }, [current]);
  uE(() => {
    localStorage.setItem("bible-ribbon", String(ribbonPage));
  }, [ribbonPage]);

  const flippingRef = uR(null);
  const riffleRef = uR(null);

  // ---------------- Single-page flip ----------------
  const animateFlip = uC((direction, onDone) => {
    if (flippingRef.current || riffleRef.current) return;
    const start = performance.now();
    flippingRef.current = { direction, progress: 0 };
    setFlipping({ direction, progress: 0 });
    const tick = () => {
      const t = performance.now();
      const p = Math.min(1, (t - start) / flipDurationMs);
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      flippingRef.current = { direction, progress: eased };
      setFlipping({ direction, progress: eased });
      if (p < 1) setTimeout(tick, 16);
      else {
        flippingRef.current = null;
        setFlipping(null);
        if (direction === "next") setCurrent(c => Math.min(TOTAL_PAGES - 2, c + 2));
        else setCurrent(c => Math.max(0, c - 2));
        onDone && onDone();
      }
    };
    setTimeout(tick, 16);
  }, [flipDurationMs]);

  // ---------------- Multi-page riffle (big jumps) ----------------
  const animateRiffle = uC((fromPage, toPage) => {
    if (flippingRef.current || riffleRef.current) return;
    const direction = toPage > fromPage ? "next" : "prev";
    const sheetCount = Math.min(18, Math.max(4, Math.floor(Math.abs(toPage - fromPage) / 4)));
    const duration = Math.min(1800, 700 + sheetCount * 40) * (flipDurationMs / 900);
    const start = performance.now();
    const initial = { from: fromPage, to: toPage, progress: 0, direction, sheetCount, duration };
    riffleRef.current = initial;
    setRiffle(initial);
    const tick = () => {
      const t = performance.now();
      const p = Math.min(1, (t - start) / duration);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const next = { ...initial, progress: eased };
      riffleRef.current = next;
      setRiffle(next);
      if (p < 1) setTimeout(tick, 16);
      else {
        riffleRef.current = null;
        setRiffle(null);
        setCurrent(toPage % 2 === 0 ? toPage : toPage - 1);
      }
    };
    setTimeout(tick, 16);
  }, [flipDurationMs]);

  const goToBook = uC((book) => {
    const target = bookStartPage(book);
    if (Math.abs(target - current) <= 2) {
      if (target === current) return;
      animateFlip(target > current ? "next" : "prev");
    } else {
      animateRiffle(current, target);
    }
  }, [current, animateFlip, animateRiffle]);

  const nextSpread = uC(() => {
    if (current + 2 < TOTAL_PAGES) animateFlip("next");
  }, [current, animateFlip]);
  const prevSpread = uC(() => {
    if (current > 0) animateFlip("prev");
  }, [current, animateFlip]);

  uE(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextSpread(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevSpread(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextSpread, prevSpread]);

  // ---------------- Manual corner drag ----------------
  const stageRef = uR(null);
  const [dragState, setDragState] = uS(null);

  const onCornerDown = uC((direction) => (e) => {
    if (flipping || riffle) return;
    e.preventDefault();
    const startX = e.clientX;
    setDragState({ direction, progress: 0, startX });
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      // For next: dragging left (negative dx) flips forward
      // For prev: dragging right (positive dx) flips back
      const raw = direction === "next" ? -dx / 400 : dx / 400;
      const progress = Math.max(0, Math.min(1, raw));
      setDragState({ direction, progress, startX });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDragState(ds => {
        if (!ds) return null;
        if (ds.progress > 0.4) {
          // complete
          const from = ds.progress;
          const start = performance.now();
          const dur = (1 - from) * flipDurationMs;
          const tick = () => {
            const t = performance.now();
            const p = Math.min(1, (t - start) / Math.max(100, dur));
            const eased = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
            const prog = from + (1 - from) * eased;
            setDragState({ ...ds, progress: prog });
            if (p < 1) setTimeout(tick, 16);
            else {
              setDragState(null);
              if (ds.direction === "next") setCurrent(c => Math.min(TOTAL_PAGES - 2, c + 2));
              else setCurrent(c => Math.max(0, c - 2));
            }
          };
          setTimeout(tick, 16);
          return ds;
        } else {
          // snap back
          const from = ds.progress;
          const start = performance.now();
          const dur = from * flipDurationMs * 0.6;
          const tick = () => {
            const t = performance.now();
            const p = Math.min(1, (t - start) / Math.max(80, dur));
            const eased = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2)/2;
            const prog = from * (1 - eased);
            setDragState({ ...ds, progress: prog });
            if (p < 1) setTimeout(tick, 16);
            else setDragState(null);
          };
          setTimeout(tick, 16);
          return ds;
        }
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [flipping, riffle, flipDurationMs]);

  // Combine programmatic flip + manual drag into a unified flip state
  const activeFlip = flipping || dragState;

  // ---------------- Ribbon drag ----------------
  const onRibbonDown = uC((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    setRibbonDrag({ startY, offsetX: 0, placing: false });
    const onMove = (ev) => {
      const dx = ev.clientX - e.clientX;
      const dy = ev.clientY - startY;
      setRibbonDrag({ startY, offsetX: dx, offsetY: dy, placing: true });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Drop = mark current page
      setRibbonPage(current);
      setRibbonDrag(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [current]);

  const jumpToRibbon = uC(() => {
    if (ribbonPage === current) return;
    if (Math.abs(ribbonPage - current) <= 2) animateFlip(ribbonPage > current ? "next" : "prev");
    else animateRiffle(current, ribbonPage);
  }, [ribbonPage, current, animateFlip, animateRiffle]);

  // Find current book (for highlighting tab)
  const currentBook = uM(() => {
    if (current < 4) return null;
    const idx = Math.floor((current - 4) / 2);
    return window.BIBLE_BOOKS[idx];
  }, [current]);

  // Helper: what's on the left/right page of the current spread
  const leftIdx = current;
  const rightIdx = current + 1;
  // When flipping forward, the page being flipped is the right page of current spread (going to become left-back of next)
  // and reveals a new right page underneath. We'll render as:
  // - static left page (current left)
  // - static right page of NEXT spread (destination), visible as we flip
  // - flipping layer showing current right (front) -> next left (back)
  let nextLeftIdx = current + 2;
  let nextRightIdx = current + 3;
  let prevLeftIdx = current - 2;
  let prevRightIdx = current - 1;

  return (
    <>
      <div className="stage" ref={stageRef}>
        <div className="book-tilt">
          <div className={`book cover-${tweaks.cover} paper-${tweaks.paper}`}
            style={{
              width: `calc(var(--page-w) * 2)`,
              height: `var(--page-h)`,
            }}>
            <div className="book-base"></div>
            <div className="page-edges"></div>

            {/* ------------ STATIC LEFT PAGE ------------ */}
            <div className="spread">
              <div className="page left">
                <div className="page-inner">
                  <PageContent pageIndex={leftIdx} onPickBook={goToBook} />
                </div>
              </div>
              {/* ------------ STATIC RIGHT PAGE (destination, under flipping) ------------ */}
              <div className="page right">
                <div className="page-inner">
                  <PageContent
                    pageIndex={activeFlip?.direction === "next" ? nextRightIdx : (activeFlip?.direction === "prev" ? prevRightIdx : rightIdx)}
                    onPickBook={goToBook}
                  />
                </div>
              </div>
            </div>

            {/* ------------ FLIPPING PAGE ------------ */}
            {activeFlip && (() => {
              const { direction, progress } = activeFlip;
              // angle: 0 = flat (showing front) ; -180 = flipped over (showing back)
              const angle = direction === "next"
                ? -progress * 180
                : 180 - progress * 180;
              const frontIdx = direction === "next" ? rightIdx : prevLeftIdx;
              const backIdx = direction === "next" ? nextLeftIdx : leftIdx;
              const origin = direction === "next" ? "left center" : "right center";
              const left = direction === "next" ? "50%" : `calc(50% - var(--page-w))`;
              // Slight curl: add small rotation around y axis with a bend via scale? we'll use translateZ
              const shadowOpacity = Math.sin(Math.PI * progress) * 0.8;
              return (
                <div className="flip-layer" style={{
                  left,
                  transformOrigin: origin,
                  transform: `rotateY(${angle}deg) translateZ(${Math.sin(Math.PI * progress) * 8}px)`,
                  transition: dragState ? "none" : undefined,
                }}>
                  <div className="flip-face front">
                    <div className={`page ${direction === "next" ? "right" : "left"}`}>
                      <div className="page-inner">
                        <PageContent pageIndex={frontIdx} onPickBook={goToBook} />
                      </div>
                      {/* curl shadow on the front as it lifts */}
                      <div className="curl-shadow" style={{
                        opacity: progress < 0.5 ? progress * 1.2 : 0,
                        background: direction === "next"
                          ? `linear-gradient(-90deg, rgba(0,0,0,${0.35 * progress}), transparent 40%)`
                          : `linear-gradient(90deg, rgba(0,0,0,${0.35 * progress}), transparent 40%)`,
                      }}/>
                    </div>
                  </div>
                  <div className="flip-face back">
                    <div className={`page ${direction === "next" ? "left" : "right"}`}>
                      <div className="page-inner">
                        <PageContent pageIndex={backIdx} onPickBook={goToBook} />
                      </div>
                      <div className="curl-shadow" style={{
                        opacity: progress > 0.5 ? (1 - progress) * 1.2 : 0,
                        background: direction === "next"
                          ? `linear-gradient(90deg, rgba(0,0,0,${0.35 * (1-progress)}), transparent 40%)`
                          : `linear-gradient(-90deg, rgba(0,0,0,${0.35 * (1-progress)}), transparent 40%)`,
                      }}/>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ------------ RIFFLE (multi-sheet) ------------ */}
            {riffle && (() => {
              const { progress, sheetCount, direction } = riffle;
              const sheets = [];
              for (let i = 0; i < sheetCount; i++) {
                const delay = i / sheetCount * 0.5;
                const localProgress = Math.max(0, Math.min(1, (progress - delay) / 0.5));
                if (localProgress <= 0) continue;
                const angle = direction === "next" ? -localProgress * 180 : 180 - localProgress * 180;
                const z = Math.sin(Math.PI * localProgress) * 5;
                const origin = direction === "next" ? "left center" : "right center";
                const left = direction === "next" ? "50%" : `calc(50% - var(--page-w))`;
                sheets.push(
                  <div key={i} className="flip-layer" style={{
                    left,
                    transformOrigin: origin,
                    transform: `rotateY(${angle}deg) translateZ(${z + i * 0.3}px)`,
                    zIndex: 20 + i,
                  }}>
                    <div className="flip-face front">
                      <div className={`page ${direction === "next" ? "right" : "left"}`} style={{ opacity: 0.95 }}>
                        <div className="page-inner" style={{ padding: "20px 30px", opacity: 0.5 }}>
                          <div style={{ height: "100%",
                            background: "repeating-linear-gradient(0deg, rgba(50,30,10,0.12) 0 1.5px, transparent 1.5px 9px)",
                          }}/>
                        </div>
                      </div>
                    </div>
                    <div className="flip-face back">
                      <div className={`page ${direction === "next" ? "left" : "right"}`} style={{ opacity: 0.95 }}>
                        <div className="page-inner" style={{ padding: "20px 30px", opacity: 0.5 }}>
                          <div style={{ height: "100%",
                            background: "repeating-linear-gradient(0deg, rgba(50,30,10,0.12) 0 1.5px, transparent 1.5px 9px)",
                          }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return sheets;
            })()}

            <div className="gutter"></div>

            {/* Corner drag hints */}
            {!activeFlip && !riffle && current + 2 < TOTAL_PAGES && (
              <div className="corner-hint" style={{ right: 0, bottom: 0 }}
                onMouseDown={onCornerDown("next")}
                title="Drag to flip forward"
              />
            )}
            {!activeFlip && !riffle && current > 0 && (
              <div className="corner-hint left-corner"
                onMouseDown={onCornerDown("prev")}
                title="Drag to flip back"
              />
            )}

            {/* Ribbon bookmark - stuck in top center of book, falls to current/ribbon page */}
            <Ribbon
              ribbonPage={ribbonPage}
              currentPage={current}
              onDown={onRibbonDown}
              dragging={!!ribbonDrag}
              drag={ribbonDrag}
              onClick={jumpToRibbon}
            />

            {/* Thumb-index tabs */}
            <ThumbTabs
              currentBook={currentBook}
              onPick={goToBook}
              disabled={!!activeFlip || !!riffle}
            />

          </div>
        </div>
      </div>

      <NavBar
        current={current}
        totalPages={TOTAL_PAGES}
        onPrev={prevSpread}
        onNext={nextSpread}
        onOpenTOC={() => animateRiffle(current, 2)}
        currentBook={currentBook}
        disabled={!!activeFlip || !!riffle}
      />
    </>
  );
}

// ------------- Ribbon -------------
function Ribbon({ ribbonPage, currentPage, onDown, dragging, drag, onClick }) {
  // Ribbon sticks out of the top of the book between pages
  // Its length extends based on distance from ribbonPage to current page
  // For simplicity, the ribbon comes out of the top of the spine (center) and falls down
  const isCurrent = ribbonPage === currentPage || Math.abs(ribbonPage - currentPage) < 2;
  const length = 240 + Math.random() * 20;
  // when dragging, follow cursor offset
  const offsetX = drag?.offsetX || 0;
  const offsetY = drag?.offsetY || 0;
  const sway = dragging ? Math.min(20, Math.max(-20, offsetX * 0.1)) : 0;

  return (
    <div
      className="ribbon"
      onMouseDown={onDown}
      onDoubleClick={onClick}
      title={`Bookmark (page ${ribbonPage + 1}). Drag to reposition. Double-click to jump.`}
      style={{
        left: `calc(50% - 13px)`,
        height: length,
        transform: `rotate(${sway}deg) translate(${offsetX * 0.3}px, ${offsetY * 0.3}px)`,
        transition: dragging ? "none" : "transform 400ms ease",
        zIndex: 50,
      }}
    >
      {isCurrent && (
        <div style={{
          position: "absolute",
          top: 6, left: "50%", transform: "translateX(-50%)",
          fontSize: 8, color: "rgba(255,220,180,0.5)",
          fontFamily: "'Cinzel', serif", letterSpacing: "0.2em",
        }}>⁂</div>
      )}
    </div>
  );
}

// ------------- Thumb-index tabs (group tabs with flyout picker) -------------
function ThumbTabs({ currentBook, onPick, disabled }) {
  const [openGroup, setOpenGroup] = uS(null);
  const GROUPS = [
    { id: "Pentateuch", testament: "OT", label: "Pentateuch" },
    { id: "History", testament: "OT", label: "History (OT)" },
    { id: "Wisdom", testament: "OT", label: "Wisdom" },
    { id: "Major Prophets", testament: "OT", label: "Major Prophets" },
    { id: "Minor Prophets", testament: "OT", label: "Minor Prophets" },
    { id: "Gospels", testament: "NT", label: "Gospels" },
    { id: "History", testament: "NT", label: "History (NT)" },
    { id: "Epistles", testament: "NT", label: "Epistles" },
    { id: "Apocalyptic", testament: "NT", label: "Revelation" },
  ];

  return (
    <div className="tabs right" onMouseLeave={() => setOpenGroup(null)}>
      {GROUPS.map((g, i) => {
        const isOT = g.testament === "OT";
        const isCurrent = currentBook && currentBook.group === g.id && currentBook.testament === g.testament;
        const books = window.BIBLE_BOOKS.filter(b => b.group === g.id && b.testament === g.testament);
        const key = g.testament + ":" + g.id;
        return (
          <div
            key={key}
            className={`group-tab ${isOT ? "ot-group" : "nt-group"} ${isCurrent ? "current" : ""}`}
            onMouseEnter={() => !disabled && setOpenGroup(key)}
            onClick={() => {
              if (disabled) return;
              if (books[0]) onPick(books[0]);
              setOpenGroup(null);
            }}
          >
            {g.label}
            {openGroup === key && (
              <div className="flyout" onMouseLeave={() => setOpenGroup(null)} onClick={e => e.stopPropagation()}>
                <div className="flyout-title">{g.label}</div>
                {books.map(b => (
                  <div key={b.id}
                    className={`flyout-book ${currentBook?.id === b.id ? "current" : ""}`}
                    onClick={() => { onPick(b); setOpenGroup(null); }}
                  >
                    <span>{b.name}</span>
                    <span className="num">{b.chapters} ch</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------- Nav bar -------------
function NavBar({ current, totalPages, onPrev, onNext, onOpenTOC, currentBook, disabled }) {
  let label;
  if (current === 0) label = "Frontispiece";
  else if (current === 1 || current === 2) label = "Table of Contents";
  else if (current === 3) label = "New Testament · Contents";
  else if (currentBook) label = `${currentBook.name} · Ch. 1`;
  else label = "—";
  return (
    <div className="nav-controls">
      <button className="nav-btn" onClick={onPrev} disabled={disabled || current === 0}>‹</button>
      <button className="nav-btn" onClick={onOpenTOC} disabled={disabled} title="Table of Contents" style={{ fontSize: 11 }}>✦</button>
      <div className="nav-label">{label}</div>
      <button className="nav-btn" onClick={onNext} disabled={disabled || current + 2 >= totalPages}>›</button>
    </div>
  );
}

Object.assign(window, { Book, Ribbon, ThumbTabs, NavBar, TOTAL_PAGES, bookStartPage });
