export interface DrivingUI {
  mount(): void;
  unmount(): void;
  update(speed: number, boostActive: boolean, boostCharge: number): void;
  onExitClick(cb: () => void): void;
}

export function createDrivingUI(): DrivingUI {
  let exitCb: (() => void) | null = null;

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
    position: "absolute", bottom: "56px", left: "50%", transform: "translateX(-50%)",
    fontSize: "18px", color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.7)",
    fontFamily: "monospace",
  });
  speedEl.textContent = "0 km/h";

  // Nitro label
  const nitroLabel = document.createElement("div");
  Object.assign(nitroLabel.style, {
    position: "absolute", bottom: "36px", left: "50%", transform: "translateX(-50%)",
    fontSize: "11px", fontFamily: "monospace", letterSpacing: "2px",
    color: "#22c55e", textShadow: "0 1px 4px rgba(0,0,0,0.7)",
  });
  nitroLabel.textContent = "NITRO";

  // Boost bar container
  const barContainer = document.createElement("div");
  Object.assign(barContainer.style, {
    position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
    width: "140px", height: "14px",
    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "7px", overflow: "hidden",
  });

  // Boost bar fill
  const barFill = document.createElement("div");
  Object.assign(barFill.style, {
    width: "100%", height: "100%",
    background: "#22c55e",
    borderRadius: "6px",
    transition: "width 0.05s linear",
  });
  barContainer.appendChild(barFill);

  hud.appendChild(exitBtn);
  hud.appendChild(speedEl);
  hud.appendChild(nitroLabel);
  hud.appendChild(barContainer);

  document.body.appendChild(hud);

  // Escape key handler
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") exitCb?.();
  };

  return {
    mount() {
      hud.style.display = "block";
      document.addEventListener("keydown", onKey);
    },
    unmount() {
      hud.style.display = "none";
      document.removeEventListener("keydown", onKey);
    },
    update(speed: number, boostActive: boolean, boostCharge: number) {
      speedEl.textContent = `${Math.round(speed)} km/h`;
      barFill.style.width = `${Math.round(boostCharge * 100)}%`;

      if (boostActive) {
        nitroLabel.style.color = "#f59e0b";
      } else {
        nitroLabel.style.color = "#22c55e";
      }

      // Bar color: green → yellow → red
      if (boostCharge > 0.5) {
        barFill.style.background = "#22c55e";
      } else if (boostCharge > 0.25) {
        barFill.style.background = "#eab308";
      } else {
        barFill.style.background = "#ef4444";
      }
    },
    onExitClick(cb: () => void) { exitCb = cb; },
  };
}
