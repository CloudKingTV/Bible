// Main book component with page-flip physics
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM, useCallback: uC } = React;

const TOTAL_PAGES = 4 + window.BIBLE_BOOKS.length * 2;

function bookStartPage(book) {
  return 4 + book.index * 2;
}

const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function Book({ tweaks }) {
  const [current, setCurrent] = uS(() => {
    const saved = parseInt(localStorage.getItem("bible-page") || "0", 10);
    return isFinite(saved) && saved >= 0 && saved < TOTAL_PAGES ? (saved % 2 === 0 ? saved : saved - 1) : 0;
  });
  const [flipping, setFlipping] = uS(null);
  const [riffle, setRiffle] = uS(null);
  const [ribbonPage, setRibbonPage] = uS(() => {
    const v = localStorage.getItem("bible-ribbon");
    return v ? parseInt(v, 10) : 0;
  });
  const [ribbonDrag, setRibbonDrag] = uS(null);
  const [ribbonFlash, setRibbonFlash] = uS(false);

  const flipDurationMs = tweaks.flipSpeed;

  uE(() => { localStorage.setItem("bible-page", String(current)); }, [current]);
  uE(() => { localStorage.setItem("bible-ribbon", String(ribbonPage)); }, [ribbonPage]);

  const flippingRef = uR(null);
  const riffleRef = uR(null);

  const animateFlip = uC((direction, onDone) => {
    if (flippingRef.current || riffleRef.current) return;
    const start = performance.now();
    flippingRef.current = { direction, progress: 0 };
    setFlipping({ direction, progress: 0 });
    const tick = () => {
      const t = performance.now();
      const p = Math.min(1, (t - start) / flipDurationMs);
      const eased = easeInOutQuint(p);
      flippingRef.current = { direction, progress: eased };
      setFlipping({ direction, progress: eased });
      if (p < 1) requestAnimationFrame(tick);
      else {
        flippingRef.current = null;
        setFlipping(null);
        if (direction === "next") setCurrent(c => Math.min(TOTAL_PAGES - 2, c + 2));
        else setCurrent(c => Math.max(0, c - 2));
        onDone && onDone();
      }
    };
    requestAnimationFrame(tick);
  }, [flipDurationMs]);

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
      const eased = easeInOutQuint(p);
      const next = { ...initial, progress: eased };
      riffleRef.current = next;
      setRiffle(next);
      if (p < 1) requestAnimationFrame(tick);
      else {
        riffleRef.current = null;
        setRiffle(null);
        setCurrent(toPage % 2 === 0 ? toPage : toPage - 1);
      }
    };
    requestAnimationFrame(tick);
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
          const from = ds.progress;
          const start = performance.now();
          const dur = Math.max(200, (1 - from) * flipDurationMs);
          const tick = () => {
            const t = performance.now();
            const p = Math.min(1, (t - start) / dur);
            const eased = easeOutCubic(p);
            const prog = from + (1 - from) * eased;
            setDragState({ ...ds, progress: prog });
            if (p < 1) requestAnimationFrame(tick);
            else {
              setDragState(null);
              if (ds.direction === "next") setCurrent(c => Math.min(TOTAL_PAGES - 2, c + 2));
              else setCurrent(c => Math.max(0, c - 2));
            }
          };
          requestAnimationFrame(tick);
          return ds;
        } else {
          const from = ds.progress;
          const start = performance.now();
          const dur = Math.max(160, from * flipDurationMs * 0.6);
          const tick = () => {
            const t = performance.now();
            const p = Math.min(1, (t - start) / dur);
            const eased = easeOutCubic(p);
            const prog = from * (1 - eased);
            setDragState({ ...ds, progress: prog });
            if (p < 1) requestAnimationFrame(tick);
            else setDragState(null);
          };
          requestAnimationFrame(tick);
          return ds;
        }
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [flipping, riffle, flipDurationMs]);

  const activeFlip = flipping || dragState;

  // ---------------- Ribbon ----------------
  const onRibbonDown = uC((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    setRibbonDrag({ offsetX: 0, offsetY: 0, moved: false });
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 5) moved = true;
      setRibbonDrag({ offsetX: dx, offsetY: dy, moved });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (moved) {
        // Drag = place bookmark at current spread
        setRibbonPage(current);
        setRibbonFlash(true);
        setTimeout(() => setRibbonFlash(false), 900);
      } else {
        // Click = jump to bookmark
        if (ribbonPage !== current) {
          if (Math.abs(ribbonPage - current) <= 2) animateFlip(ribbonPage > current ? "next" : "prev");
          else animateRiffle(current, ribbonPage);
        }
      }
      setRibbonDrag(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [current, ribbonPage, animateFlip, animateRiffle]);

  const currentBook = uM(() => {
    if (current < 4) return null;
    const idx = Math.floor((current - 4) / 2);
    return window.BIBLE_BOOKS[idx];
  }, [current]);

  const ribbonBook = uM(() => {
    if (ribbonPage < 4) return null;
    const idx = Math.floor((ribbonPage - 4) / 2);
    return window.BIBLE_BOOKS[idx];
  }, [ribbonPage]);

  const leftIdx = current;
  const rightIdx = current + 1;
  const nextLeftIdx = current + 2;
  const nextRightIdx = current + 3;
  const prevLeftIdx = current - 2;
  const prevRightIdx = current - 1;

  // Static pages shown beneath the flipping leaf. For prev flip the leaf rises off the LEFT, so the
  // destination's left page (prevLeftIdx) shows underneath. For next flip the leaf rises off the
  // RIGHT, so the destination's right page (nextRightIdx) shows underneath.
  const staticLeftIdx = activeFlip?.direction === "prev" ? prevLeftIdx : leftIdx;
  const staticRightIdx = activeFlip?.direction === "next" ? nextRightIdx : rightIdx;

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

            <div className="spread">
              <div className="page left">
                <div className="page-inner">
                  <PageContent pageIndex={staticLeftIdx} onPickBook={goToBook} />
                </div>
              </div>
              <div className="page right">
                <div className="page-inner">
                  <PageContent pageIndex={staticRightIdx} onPickBook={goToBook} />
                </div>
              </div>
            </div>

            {/* ------------ FLIPPING PAGE ------------
                Forward: angle 0→-180, origin left center, layer at right half.
                Backward: angle 0→+180, origin right center, layer at left half.
                Front face is what the user was just seeing; back face is the destination side. */}
            {activeFlip && (() => {
              const { direction, progress } = activeFlip;
              const angle = direction === "next" ? -progress * 180 : progress * 180;
              const frontIdx = direction === "next" ? rightIdx : leftIdx;
              const backIdx = direction === "next" ? nextLeftIdx : prevRightIdx;
              const frontSide = direction === "next" ? "right" : "left";
              const backSide = direction === "next" ? "left" : "right";
              const origin = direction === "next" ? "left center" : "right center";
              const left = direction === "next" ? "50%" : `calc(50% - var(--page-w))`;
              const lift = Math.sin(Math.PI * progress);
              const z = lift * 14;
              const shadowSide = direction === "next" ? -1 : 1;
              return (
                <div className="flip-layer" style={{
                  left,
                  transformOrigin: origin,
                  transform: `rotateY(${angle}deg) translateZ(${z}px)`,
                  filter: `drop-shadow(${shadowSide * 4 * lift}px ${6 * lift}px ${10 + 20 * lift}px rgba(0,0,0,${lift * 0.55}))`,
                }}>
                  <div className="flip-face front">
                    <div className={`page ${frontSide}`}>
                      <div className="page-inner">
                        <PageContent pageIndex={frontIdx} onPickBook={goToBook} />
                      </div>
                      <div className="curl-shadow" style={{
                        opacity: progress < 0.5 ? progress * 0.9 : 0,
                        background: direction === "next"
                          ? `linear-gradient(-90deg, rgba(0,0,0,${0.4 * progress}) 0%, rgba(0,0,0,${0.1 * progress}) 40%, transparent 70%)`
                          : `linear-gradient(90deg,  rgba(0,0,0,${0.4 * progress}) 0%, rgba(0,0,0,${0.1 * progress}) 40%, transparent 70%)`,
                      }}/>
                    </div>
                  </div>
                  <div className="flip-face back">
                    <div className={`page ${backSide}`}>
                      <div className="page-inner">
                        <PageContent pageIndex={backIdx} onPickBook={goToBook} />
                      </div>
                      <div className="curl-shadow" style={{
                        opacity: progress > 0.5 ? (1 - progress) * 0.9 : 0,
                        background: direction === "next"
                          ? `linear-gradient(90deg,  rgba(0,0,0,${0.4 * (1-progress)}) 0%, rgba(0,0,0,${0.1 * (1-progress)}) 40%, transparent 70%)`
                          : `linear-gradient(-90deg, rgba(0,0,0,${0.4 * (1-progress)}) 0%, rgba(0,0,0,${0.1 * (1-progress)}) 40%, transparent 70%)`,
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
                const angle = direction === "next" ? -localProgress * 180 : localProgress * 180;
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

            <Ribbon
              ribbonPage={ribbonPage}
              currentPage={current}
              ribbonBook={ribbonBook}
              totalPages={TOTAL_PAGES}
              onDown={onRibbonDown}
              dragging={!!ribbonDrag}
              drag={ribbonDrag}
              flash={ribbonFlash}
            />

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
function Ribbon({ ribbonPage, currentPage, ribbonBook, totalPages, onDown, dragging, drag, flash }) {
  const offset = ribbonPage - currentPage;
  const isHere = Math.abs(offset) < 2;
  const distanceFactor = Math.min(1, Math.abs(offset) / totalPages);
  const baseLen = isHere ? 240 : 260 + distanceFactor * 40;
  const sideShift = isHere ? 0 : (offset > 0 ? 6 : -6);
  const offsetX = drag?.offsetX || 0;
  const offsetY = drag?.offsetY || 0;
  const sway = dragging ? Math.min(24, Math.max(-24, offsetX * 0.14)) : 0;

  return (
    <div
      className="ribbon"
      onMouseDown={onDown}
      title={ribbonBook
        ? `Bookmark · ${ribbonBook.name}. Click to jump · drag to place here.`
        : "Bookmark. Click to jump · drag to place here."}
      style={{
        left: `calc(50% - 13px + ${sideShift}px)`,
        height: baseLen,
        transform: `rotate(${sway}deg) translate(${offsetX * 0.3}px, ${offsetY * 0.3}px)`,
        transition: dragging ? "none" : "height 420ms ease, left 420ms ease, transform 400ms ease, box-shadow 300ms ease",
        zIndex: 50,
        boxShadow: flash
          ? "inset 0 0 4px rgba(0,0,0,0.4), 2px 3px 12px rgba(255,210,150,0.9), 0 0 28px rgba(255,210,150,0.55)"
          : undefined,
      }}
    >
      {isHere && (
        <div style={{
          position: "absolute",
          top: 8, left: "50%", transform: "translateX(-50%)",
          fontSize: 9, color: "rgba(255,220,180,0.75)",
          fontFamily: "'Cinzel', serif", letterSpacing: "0.2em",
        }}>⁂</div>
      )}
      {flash && (
        <div style={{
          position: "absolute",
          top: -26, left: "50%", transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 10, letterSpacing: "0.25em",
          color: "var(--gold-hi)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          pointerEvents: "none",
          animation: "ribbon-flash 900ms ease forwards",
        }}>
          BOOKMARKED
        </div>
      )}
    </div>
  );
}

// ------------- Thumb-index tabs (group tabs with flyout picker) -------------
function ThumbTabs({ currentBook, onPick, disabled }) {
  const [openGroup, setOpenGroup] = uS(null);
  const [flyoutPlacement, setFlyoutPlacement] = uS("right");
  const closeTimerRef = uR(null);

  const cancelClose = uC(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = uC(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpenGroup(null), 260);
  }, [cancelClose]);

  uE(() => () => cancelClose(), [cancelClose]);

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

  const handleOpen = uC((key, el) => {
    if (disabled) return;
    cancelClose();
    if (el) {
      const rect = el.getBoundingClientRect();
      const roomRight = window.innerWidth - rect.right;
      setFlyoutPlacement(roomRight < 240 ? "left" : "right");
    }
    setOpenGroup(key);
  }, [disabled, cancelClose]);

  return (
    <div className="tabs right">
      {GROUPS.map((g) => {
        const isOT = g.testament === "OT";
        const isCurrent = currentBook && currentBook.group === g.id && currentBook.testament === g.testament;
        const books = window.BIBLE_BOOKS.filter(b => b.group === g.id && b.testament === g.testament);
        const key = g.testament + ":" + g.id;
        const isOpen = openGroup === key;
        return (
          <div
            key={key}
            className={`group-tab ${isOT ? "ot-group" : "nt-group"} ${isCurrent ? "current" : ""}`}
            onMouseEnter={(e) => handleOpen(key, e.currentTarget)}
            onMouseLeave={scheduleClose}
            onClick={() => {
              if (disabled) return;
              if (books[0]) onPick(books[0]);
              setOpenGroup(null);
            }}
          >
            {g.label}
            {isOpen && (
              <div
                className={`flyout flyout-${flyoutPlacement}`}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                onClick={e => e.stopPropagation()}
              >
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
