// Scrubbable animation scenes for the Interactive Bible.
// Single continuous timeline; each scene is a Sprite with local time and
// keyframes that drive book primitives (FlipLayer, Tabs/Flyout, Ribbon)
// through their states. A top-level progress rail + chapter markers make
// it easy to jump directly to any animation.

const SCENES = [
  { id: "forward",  start: 0.0,  end: 5.5,  label: "Forward page flip",  sub: "drag corner · leaf lifts · easeInOutQuint · lands on next spread" },
  { id: "backward", start: 5.5,  end: 11.0, label: "Backward page flip", sub: "mirrored: angle 0 → +180, static-left now reveals prev spread" },
  { id: "tabs",     start: 11.0, end: 17.0, label: "Thumb-index tabs",   sub: "hover → flyout flush (no hover gap) → book selected" },
  { id: "ribbon",   start: 17.0, end: 23.0, label: "Ribbon bookmark",    sub: "drag to place (BOOKMARKED flash) → click to jump" },
];
const TOTAL = SCENES[SCENES.length - 1].end;

// -- Shared page content variants used across scenes -------------------------
const PAGE_GENESIS_1  = { side: "left",  book: "GENESIS", chapter: 1, pageNum: 1, verses: GENESIS_1 };
const PAGE_GENESIS_1B = { side: "right", book: "GENESIS", chapter: null, pageNum: 2, verses: GENESIS_1B };
const PAGE_GENESIS_2  = { side: "left",  book: "GENESIS", chapter: 2, pageNum: 3, verses: GENESIS_2 };
const PAGE_PSALMS_23  = { side: "right", book: "PSALMS",  chapter: 23, pageNum: 812, verses: PSALMS_23 };
const PAGE_PSALMS_24  = { side: "left",  book: "PSALMS",  chapter: 24, pageNum: 813, verses: PSALMS_24 };

// Local easing (animations.jsx doesn't expose quint; add it here to match main app).
const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);

const kf = (input, output, ease) => interpolate(input, output, ease || Easing.linear);

// Cover/paper classes are applied to the .book element via a ref-based hook.
function useBookClasses(...classes) {
  React.useEffect(() => {
    const els = document.querySelectorAll('.book');
    els.forEach(b => classes.forEach(c => b.classList.add(c)));
  });
}

// Fade-in / fade-out sleeve. Wraps a scene in a dimming overlay around the
// edges of its local time window.
function SceneWrap({ entry = 0.35, exit = 0.35, children }) {
  const { localTime, duration } = useSprite();
  let opacity = 1;
  if (localTime < entry) opacity = Easing.easeOutCubic(clamp(localTime / entry, 0, 1));
  else if (localTime > duration - exit) opacity = Easing.easeInCubic(clamp((duration - localTime) / exit, 0, 1));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      {children}
    </div>
  );
}

// ---- Scene 1: Forward flip ------------------------------------------------
function SceneForwardFlip({ isFirst, isLast }) {
  const { localTime } = useSprite();
  useBookClasses('cover-brown', 'paper-aged');

  // 0.0–1.0   cursor glides toward the lower-right corner, corner starts to lift
  // 1.0–1.25  click pulse, corner fully lifted
  // 1.25–4.0  flip progress 0→1 (easeInOutQuint — smoother than cubic)
  // 4.0–5.5   settled on next spread, cursor leaves
  const cornerLift   = kf([0.3, 1.0, 1.25, 1.45], [0, 0.85, 1.0, 0], Easing.easeOutCubic)(localTime);
  const flipProgress = kf([1.25, 4.0],              [0, 1],             easeInOutQuint)(localTime);
  const cursorVisible = localTime > 0.0 && localTime < 2.5;
  const cursorX = kf([0.0, 0.9, 1.25, 2.5], [PAGE_W * 2 + 140, PAGE_W * 2 - 36, PAGE_W * 2 - 36, PAGE_W * 2 + 180], Easing.easeInOutCubic)(localTime);
  const cursorY = kf([0.0, 0.9, 1.25, 2.5], [PAGE_H + 120,     PAGE_H - 22,     PAGE_H - 22,     PAGE_H - 60],     Easing.easeInOutCubic)(localTime);
  const clicking = localTime >= 1.0 && localTime <= 1.2;
  const flipping = flipProgress > 0.001 && flipProgress < 0.999;

  return (
    <SceneWrap entry={isFirst ? 0 : 0.2} exit={isLast ? 0 : 0.35}>
      <BookTilt>
        <BookShell>
          <Page {...PAGE_GENESIS_1} />
          <Page {...(flipping || flipProgress >= 1 ? PAGE_PSALMS_23 : PAGE_GENESIS_1B)} />
        </BookShell>
        <FlipLayer
          progress={flipProgress}
          direction="forward"
          front={<Page {...PAGE_GENESIS_1B} />}
          back={<Page {...PAGE_GENESIS_2} />}
        />
        {cornerLift > 0.01 && <CornerHint side="right" lift={cornerLift} />}
        <Cursor x={cursorX} y={cursorY} visible={cursorVisible} clicking={clicking} />
      </BookTilt>
    </SceneWrap>
  );
}

// ---- Scene 2: Backward flip ----------------------------------------------
function SceneBackwardFlip({ isFirst, isLast }) {
  const { localTime } = useSprite();
  useBookClasses('cover-brown', 'paper-aged');

  // Starts on spread Genesis 2 / Psalms 23. Flips back → Genesis 1 / Genesis 1b.
  const cornerLift   = kf([0.3, 1.0, 1.25, 1.45], [0, 0.85, 1.0, 0], Easing.easeOutCubic)(localTime);
  const flipProgress = kf([1.25, 4.0],              [0, 1],             easeInOutQuint)(localTime);
  const cursorVisible = localTime > 0.0 && localTime < 2.5;
  const cursorX = kf([0.0, 0.9, 1.25, 2.5], [-140, 36,  36,  -180], Easing.easeInOutCubic)(localTime);
  const cursorY = kf([0.0, 0.9, 1.25, 2.5], [PAGE_H + 120, PAGE_H - 22, PAGE_H - 22, PAGE_H - 60], Easing.easeInOutCubic)(localTime);
  const clicking = localTime >= 1.0 && localTime <= 1.2;
  const flipping = flipProgress > 0.001 && flipProgress < 0.999;

  return (
    <SceneWrap entry={isFirst ? 0 : 0.2} exit={isLast ? 0 : 0.35}>
      <BookTilt>
        <BookShell>
          {/* Static left reveals the destination (Genesis 1) beneath the flipping leaf. */}
          <Page {...(flipping || flipProgress >= 1 ? PAGE_GENESIS_1 : PAGE_GENESIS_2)} />
          <Page {...PAGE_PSALMS_23} />
        </BookShell>
        <FlipLayer
          progress={flipProgress}
          direction="backward"
          front={<Page {...PAGE_GENESIS_2} />}
          back={<Page {...PAGE_GENESIS_1B} />}
        />
        {cornerLift > 0.01 && <CornerHint side="left" lift={cornerLift} />}
        <Cursor x={cursorX} y={cursorY} visible={cursorVisible} clicking={clicking} />
      </BookTilt>
    </SceneWrap>
  );
}

// ---- Scene 3: Tabs with flyout -------------------------------------------
function SceneTabs({ isFirst, isLast }) {
  const { localTime } = useSprite();
  useBookClasses('cover-brown', 'paper-aged');

  // 0.0–0.9   cursor approaches the "Major Prophets" tab
  // 0.9–1.3   hover → flyout opens (no hover-gap now)
  // 1.3–4.2   cursor moves INTO the flyout, scrubs through Isaiah/Jeremiah/etc
  // 4.2–4.5   settles on Isaiah, click pulse
  // 4.5–6.0   flyout fades, cursor drifts off
  const tabsRightX = PAGE_W * 2 + 17;   // right-edge tab x ≈ book right + 17
  // Timings for each book-hover step (seconds within the scene)
  const BOOKS = ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'];
  const HOVER_STARTS = [1.4, 1.9, 2.4, 2.9, 3.5];   // when cursor lands on each
  const HOVER_END = 4.1;

  let highlight = null;
  for (let i = HOVER_STARTS.length - 1; i >= 0; i--) {
    if (localTime >= HOVER_STARTS[i]) { highlight = BOOKS[i]; break; }
  }
  if (localTime >= 4.2 && localTime < 4.7) highlight = 'Isaiah';

  // Cursor x/y as a piecewise linear through the books
  const cursorX = kf(
    [0.0, 0.9, 1.3, ...HOVER_STARTS, 4.2, 5.5],
    [PAGE_W * 2 + 220, tabsRightX - 6, tabsRightX + 40, tabsRightX + 70, tabsRightX + 70, tabsRightX + 70, tabsRightX + 70, tabsRightX + 70, tabsRightX + 62, PAGE_W * 2 + 200],
    Easing.easeInOutCubic
  )(localTime);
  // Each hover slides down the flyout list
  const baseY = PAGE_H * 0.36;
  const STEP_Y = 22;
  const cursorY = kf(
    [0.0, 0.9, 1.3, ...HOVER_STARTS, 4.2, 5.5],
    [PAGE_H * 0.2, PAGE_H * 0.42, PAGE_H * 0.42, baseY, baseY + STEP_Y, baseY + STEP_Y * 2, baseY + STEP_Y * 3, baseY + STEP_Y * 4, baseY, PAGE_H * 0.2],
    Easing.easeInOutCubic
  )(localTime);

  const flyoutOpen = kf([0.9, 1.25, 4.5, 4.8], [0, 1, 1, 0], Easing.easeOutCubic)(localTime);
  const clicking = localTime >= 4.2 && localTime <= 4.4;

  return (
    <SceneWrap entry={isFirst ? 0 : 0.2} exit={isLast ? 0 : 0.35}>
      <BookTilt>
        <BookShell>
          <Page {...PAGE_GENESIS_1} />
          <Page {...PAGE_GENESIS_1B} />
        </BookShell>
        <Tabs side="right" highlight={localTime > 0.9 ? 'prophets' : null} current={null} />
        <Flyout side="right" group="prophets" open={flyoutOpen} highlight={highlight} current={null} />
        <Cursor x={cursorX} y={cursorY} visible={localTime > 0.0 && localTime < 5.6} clicking={clicking} />
      </BookTilt>
    </SceneWrap>
  );
}

// ---- Scene 4: Ribbon drag → flash → click → riffle -----------------------
function SceneRibbon({ isFirst, isLast }) {
  const { localTime } = useSprite();
  useBookClasses('cover-brown', 'paper-aged');

  // 0.0–0.8   cursor enters from upper-right, approaches ribbon head
  // 0.8–1.0   mousedown (cursor at ribbon, slight scale)
  // 1.0–1.6   drag — ribbon sways, offset drifts with cursor
  // 1.6–1.75  release → BOOKMARKED flash
  // 1.75–3.0  flash settles, cursor idles
  // 3.0–3.6   cursor returns to ribbon → click pulse
  // 3.6–5.0   tiny riffle to visualize jump (front leaf flips)
  // 5.0–6.0   settled on new page
  const ribbonBaseX = PAGE_W - 13;

  // Drag offset in pixels from idle. Between 1.0 and 1.6, ribbon moves with cursor.
  const dragX = kf([0.8, 1.0, 1.45, 1.65], [0, 0, 24, 0], Easing.easeInOutCubic)(localTime);
  const swayDeg = kf([0.8, 1.05, 1.35, 1.65], [0, -14, 14, 0], Easing.easeInOutCubic)(localTime);
  const ribbonLen = kf([0.0, 1.0, 1.6, 3.0], [240, 260, 280, 240], Easing.easeInOutCubic)(localTime);

  const flashOpacity = kf([1.65, 1.85, 2.6, 2.9], [0, 1, 1, 0], Easing.easeOutCubic)(localTime);
  const glow = kf([1.55, 1.8, 2.6, 2.95], [0, 1, 1, 0], Easing.easeOutCubic)(localTime);

  const cursorVisible = localTime < 4.7;
  const cursorX = kf(
    [0.0, 0.8, 1.0, 1.45, 1.65, 2.8, 3.4, 4.2],
    [PAGE_W + 260, ribbonBaseX + 26, ribbonBaseX + 26, ribbonBaseX + 50, ribbonBaseX + 26, ribbonBaseX + 80, ribbonBaseX + 26, PAGE_W + 100],
    Easing.easeInOutCubic
  )(localTime);
  const cursorY = kf(
    [0.0, 0.8, 1.0, 1.45, 1.65, 2.8, 3.4, 4.2],
    [-40, 60, 95, 120, 90, 50, 100, 40],
    Easing.easeInOutCubic
  )(localTime);
  const grabbing = localTime >= 0.9 && localTime <= 1.62;
  const clicking = localTime >= 3.3 && localTime <= 3.5;

  // Quick riffle visualization after click
  const riffleActive = localTime > 3.5 && localTime < 5.0;
  const riffleP1 = kf([3.5, 4.3], [0, 1], easeInOutQuint)(localTime);
  const riffleP2 = kf([3.8, 4.7], [0, 1], easeInOutQuint)(localTime);

  return (
    <SceneWrap entry={isFirst ? 0 : 0.2} exit={isLast ? 0 : 0.35}>
      <BookTilt>
        <BookShell>
          <Page {...PAGE_GENESIS_1} />
          <Page {...PAGE_GENESIS_1B} />
        </BookShell>
        <Ribbon offset={ribbonBaseX + dragX} length={ribbonLen} sway={swayDeg} />
        {glow > 0.01 && (
          <div style={{
            position: 'absolute',
            top: -14, left: ribbonBaseX - 8, width: 42, height: 30,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse, rgba(255,210,150,0.85) 0%, rgba(255,210,150,0) 70%)',
            opacity: glow,
            zIndex: 51,
          }} />
        )}
        {flashOpacity > 0.01 && (
          <div style={{
            position: "absolute",
            top: -28, left: "50%", transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 15, letterSpacing: "0.28em",
            color: "#ffe9b0",
            textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 24px rgba(201,161,74,0.6)",
            opacity: flashOpacity,
            pointerEvents: "none",
            zIndex: 80,
          }}>
            ⁂ BOOKMARKED ⁂
          </div>
        )}
        {riffleActive && (
          <>
            <FlipLayer progress={riffleP1} direction="forward" front={<Page {...PAGE_GENESIS_1B} />} back={<Page {...PAGE_GENESIS_2} />} />
            <FlipLayer progress={riffleP2} direction="forward" front={<Page {...PAGE_GENESIS_2} />}  back={<Page {...PAGE_PSALMS_24} />} />
          </>
        )}
        <Cursor x={cursorX} y={cursorY} visible={cursorVisible} clicking={clicking || grabbing} />
      </BookTilt>
    </SceneWrap>
  );
}

// ---- Scene progress rail (top of canvas) ---------------------------------
function SceneRail() {
  const { time } = useTimeline();
  const activeIdx = SCENES.findIndex(s => time >= s.start && time < s.end);
  return (
    <div style={{
      position: "absolute",
      top: 14, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 8,
      padding: "6px 14px",
      borderRadius: 14,
      background: "rgba(20, 12, 6, 0.55)",
      border: "1px solid rgba(201,161,74,0.35)",
      backdropFilter: "blur(6px)",
      zIndex: 700,
      fontFamily: "'Cinzel', Georgia, serif",
      fontSize: 10, letterSpacing: "0.22em",
      color: "#e8d5a8",
    }}>
      {SCENES.map((s, i) => (
        <span key={s.id} style={{
          padding: "2px 10px",
          borderRadius: 10,
          background: i === activeIdx ? "rgba(201,161,74,0.28)" : "transparent",
          color: i === activeIdx ? "#ffe9b0" : "rgba(232,213,168,0.55)",
          textTransform: "uppercase",
          transition: "all 220ms ease",
          textShadow: i === activeIdx ? "0 0 10px rgba(201,161,74,0.5)" : "none",
        }}>
          {i + 1} · {s.id}
        </span>
      ))}
    </div>
  );
}

// ---- Top-level tape --------------------------------------------------------
function Tape() {
  const { time } = useTimeline();
  const active = SCENES.find(s => time >= s.start && time < s.end) || SCENES[SCENES.length - 1];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div className="table-surface"></div>
      <div className="candle-light"></div>

      {SCENES.map((s, i) => (
        <Sprite key={s.id} start={s.start} end={s.end}>
          {s.id === "forward"  && <SceneForwardFlip  isFirst={i === 0} isLast={i === SCENES.length - 1} />}
          {s.id === "backward" && <SceneBackwardFlip isFirst={i === 0} isLast={i === SCENES.length - 1} />}
          {s.id === "tabs"     && <SceneTabs         isFirst={i === 0} isLast={i === SCENES.length - 1} />}
          {s.id === "ribbon"   && <SceneRibbon       isFirst={i === 0} isLast={i === SCENES.length - 1} />}
        </Sprite>
      ))}

      <SceneRail />
      <Caption text={active.label} sub={active.sub} position="bottom" />
    </div>
  );
}

function App() {
  return (
    <Stage
      width={1280}
      height={780}
      duration={TOTAL}
      background="transparent"
      autoplay={true}
      loop={true}
      persistKey="bible-tape"
    >
      <Tape />
    </Stage>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
