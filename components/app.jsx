// App entry point
const { useState: useAppState, useEffect: useAppEffect } = React;

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "paper": "aged",
  "cover": "brown",
  "fontSize": 15,
  "flipSpeed": 900
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweaks] = useAppState(() => {
    const saved = localStorage.getItem("bible-tweaks");
    return saved ? { ...DEFAULT_TWEAKS, ...JSON.parse(saved) } : DEFAULT_TWEAKS;
  });
  const [tweaksOpen, setTweaksOpen] = useAppState(false);

  useAppEffect(() => {
    localStorage.setItem("bible-tweaks", JSON.stringify(tweaks));
    document.documentElement.style.setProperty("--font-size", tweaks.fontSize + "px");
    document.documentElement.style.setProperty("--flip-speed", tweaks.flipSpeed + "ms");
  }, [tweaks]);

  // Responsive sizing
  useAppEffect(() => {
    const setSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Book will be ~2 * pageW wide; fit in 85% of viewport
      const maxW = vw * 0.88;
      const maxH = vh * 0.85;
      // Page aspect ~ 1 : 1.4 (portrait)
      let pageH = Math.min(maxH, maxW / 2 * 1.4);
      let pageW = pageH / 1.4;
      if (pageW * 2 > maxW) {
        pageW = maxW / 2;
        pageH = pageW * 1.4;
      }
      document.documentElement.style.setProperty("--page-w", pageW + "px");
      document.documentElement.style.setProperty("--page-h", pageH + "px");
    };
    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  // Tweaks mode integration
  useAppEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setTweaksOpen(true);
      else if (e.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const updateTweak = (key, value) => {
    const next = { ...tweaks, [key]: value };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: next }, "*");
  };

  return (
    <>
      <div className="table-surface"></div>
      <div className="candle-light"></div>

      <div className="chrome">
        <h1>The Holy Bible</h1>
        <div className="sub">King James Version · 1611</div>
      </div>

      <Book tweaks={tweaks} />

      {tweaksOpen && (
        <div className="tweaks-panel">
          <h3>Tweaks</h3>

          <div className="tweak-row">
            <label>Cover</label>
            <div className="options">
              {["brown", "burgundy", "black"].map(c => (
                <button key={c}
                  className={tweaks.cover === c ? "active" : ""}
                  onClick={() => updateTweak("cover", c)}
                >{c}</button>
              ))}
            </div>
          </div>

          <div className="tweak-row">
            <label>Paper</label>
            <div className="tweak-swatches">
              {[
                { id: "aged", color: "#f2e8d0" },
                { id: "cream", color: "#faf3de" },
                { id: "linen", color: "#ede0c0" },
                { id: "antique", color: "#e8d9b3" },
              ].map(p => (
                <div key={p.id}
                  className={`tweak-swatch ${tweaks.paper === p.id ? "active" : ""}`}
                  style={{ background: p.color, borderColor: tweaks.paper === p.id ? "var(--gold-hi)" : "transparent" }}
                  onClick={() => updateTweak("paper", p.id)}
                  title={p.id}
                />
              ))}
            </div>
          </div>

          <div className="tweak-row">
            <label>Font Size · {tweaks.fontSize}px</label>
            <input type="range" min="12" max="20" step="1"
              value={tweaks.fontSize}
              onChange={e => updateTweak("fontSize", parseInt(e.target.value, 10))}
            />
          </div>

          <div className="tweak-row">
            <label>Flip Speed · {tweaks.flipSpeed}ms</label>
            <input type="range" min="300" max="1600" step="50"
              value={tweaks.flipSpeed}
              onChange={e => updateTweak("flipSpeed", parseInt(e.target.value, 10))}
            />
          </div>

          <div style={{ marginTop: 16, paddingTop: 10, borderTop: "1px dotted var(--gold-dark)", fontSize: 9, opacity: 0.6, lineHeight: 1.6 }}>
            <div>✦ Click a tab on the right edge to jump to a book</div>
            <div>✦ Drag page corners to flip manually</div>
            <div>✦ Drag the ribbon to place a bookmark</div>
            <div>✦ Arrow keys navigate</div>
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
