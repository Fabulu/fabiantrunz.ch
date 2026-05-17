export function createDrivingUI(): {
  mount(): void;
  unmount(): void;
  update(speed: number, boostActive: boolean, boostCooldown: number): void;
  onEnterClick(cb: () => void): void;
  onExitClick(cb: () => void): void;
} {
  let enterCb: (() => void) | null = null;
  let exitCb: (() => void) | null = null;

  // --- Enter 3D Mode button ---
  const enterBtn = document.createElement("button");
  enterBtn.textContent = "Enter 3D Mode";
  enterBtn.dataset.i18n = "hero.3d_button";
  Object.assign(enterBtn.style, {
    position: "fixed", bottom: "20px", right: "20px", zIndex: "200",
    background: "rgba(245,158,11,0.8)", color: "white", fontWeight: "bold",
    padding: "12px 24px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontSize: "14px",
  });
  enterBtn.addEventListener("mouseenter", () => { enterBtn.style.background = "rgba(245,158,11,1)"; });
  enterBtn.addEventListener("mouseleave", () => { enterBtn.style.background = "rgba(245,158,11,0.8)"; });
  enterBtn.addEventListener("click", () => enterCb?.());

  // --- HUD container ---
  const hud = document.createElement("div");
  Object.assign(hud.style, {
    position: "fixed", inset: "0", zIndex: "200",
    pointerEvents: "none", display: "none",
  });

  // Exit button (top-right)
  const exitBtn = document.createElement("button");
  exitBtn.textContent = "Exit";
  Object.assign(exitBtn.style, {
    position: "absolute", top: "16px", right: "16px",
    pointerEvents: "auto", background: "rgba(0,0,0,0.6)", color: "white",
    border: "none", borderRadius: "8px", padding: "8px 16px",
    fontSize: "14px", cursor: "pointer", width: "40px", height: "40px",
    display: "flex", alignItems: "center", justifyContent: "center",
  });
  exitBtn.addEventListener("click", () => exitCb?.());

  // Speed display (bottom-center)
  const speedEl = document.createElement("div");
  Object.assign(speedEl.style, {
    position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)",
    fontSize: "18px", color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.7)",
    fontFamily: "monospace",
  });
  speedEl.textContent = "0 km/h";

  // Boost indicator (below speed)
  const boostEl = document.createElement("div");
  Object.assign(boostEl.style, {
    position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
    fontSize: "14px", fontFamily: "monospace",
    textShadow: "0 1px 4px rgba(0,0,0,0.7)",
  });
  boostEl.textContent = "BOOST READY";
  boostEl.style.color = "#22c55e";

  hud.appendChild(exitBtn);
  hud.appendChild(speedEl);
  hud.appendChild(boostEl);

  document.body.appendChild(enterBtn);
  document.body.appendChild(hud);

  // Escape key handler
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") exitCb?.();
  };

  return {
    mount() {
      hud.style.display = "block";
      enterBtn.style.display = "none";
      document.addEventListener("keydown", onKey);
    },
    unmount() {
      hud.style.display = "none";
      enterBtn.style.display = "block";
      document.removeEventListener("keydown", onKey);
    },
    update(speed: number, boostActive: boolean, boostCooldown: number) {
      speedEl.textContent = `${Math.round(speed)} km/h`;
      if (boostActive) {
        boostEl.textContent = "BOOST ACTIVE";
        boostEl.style.color = "#f59e0b";
      } else if (boostCooldown <= 0) {
        boostEl.textContent = "BOOST READY";
        boostEl.style.color = "#22c55e";
      } else {
        boostEl.textContent = `BOOST [${Math.ceil(boostCooldown)}s]`;
        boostEl.style.color = "#9ca3af";
      }
    },
    onEnterClick(cb: () => void) { enterCb = cb; },
    onExitClick(cb: () => void) { exitCb = cb; },
  };
}
