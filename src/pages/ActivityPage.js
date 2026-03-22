// src/pages/ActivityPage.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useDay, getTodayKey } from "../hooks/useSupabase";
import { saveSession, getTodaySession } from "../lib/activityStore";
import { Card, Btn, Spinner } from "../components/UI";

// ── constants ──────────────────────────────────────────────────
const STEP_THRESHOLD  = 11;   // m/s² peak needed to count a step
const STEP_COOLDOWN   = 320;  // ms minimum between steps
const STRIDE_M        = 0.75; // average stride length in metres
const KCAL_PER_STEP   = 0.04;
const DEFAULT_GOAL    = 8000;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── small sub-components ───────────────────────────────────────
function StepRing({ steps, goal }) {
  const pct  = Math.min(100, goal > 0 ? (steps / goal) * 100 : 0);
  const circ = 2 * Math.PI * 44;
  const off  = circ * (1 - pct / 100);
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r="44" fill="none" stroke="#1e293b" strokeWidth="9"/>
      <circle cx="55" cy="55" r="44" fill="none" stroke="#6366f1" strokeWidth="9"
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}/>
      <text x="55" y="51" textAnchor="middle" fill="#f1f5f9" fontSize="20" fontWeight="600" fontFamily="inherit">
        {steps.toLocaleString()}
      </text>
      <text x="55" y="66" textAnchor="middle" fill="#475569" fontSize="11" fontFamily="inherit">
        steps
      </text>
    </svg>
  );
}

function LiveDot({ active }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: active ? "#22c55e" : "#334155",
      animation: active ? "livepulse 1.3s ease infinite" : "none",
      flexShrink: 0,
    }}/>
  );
}

function SensorRow({ label, sub, status }) {
  const colors = { available: "#22c55e", limited: "#f97316", unavailable: "#f87171" };
  const labels = { available: "Works", limited: "Limited", unavailable: "Not available" };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid #1e293b" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 500, padding: "2px 9px", borderRadius: 99,
        background: colors[status] + "22", color: colors[status],
      }}>
        {labels[status]}
      </span>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────
export default function ActivityPage() {
  const { profile } = useAuth();
  const { updateDay } = useDay(getTodayKey());
  const goal = profile?.stepGoal || DEFAULT_GOAL;

  const [tab, setTab]           = useState("steps");
  const [steps, setSteps]       = useState(0);
  const [tracking, setTracking] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsData, setGpsData]   = useState(null);
  const [gpsDistKm, setGpsDistKm] = useState(0);
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [permError, setPermError] = useState("");
  const [saved, setSaved]       = useState(false);
  const [swReady, setSwReady]   = useState(false);

  const lastMagRef     = useRef(0);
  const lastStepRef    = useRef(0);
  const gpsWatchRef    = useRef(null);
  const gpsPositionsRef = useRef([]);
  const motionHandlerRef = useRef(null);

  // ── Register Service Worker ────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => {
          setSwReady(true);
          // listen for SW telling us to flush cached steps
          navigator.serviceWorker.addEventListener("message", e => {
            if (e.data?.type === "SW_SYNC_STEPS") loadCachedSteps();
          });
        })
        .catch(() => setSwReady(false));
    }
  }, []);

  // ── Load any cached steps from IndexedDB on mount ──────────
  useEffect(() => {
    loadCachedSteps();
  }, []);

  const loadCachedSteps = async () => {
    try {
      const session = await getTodaySession();
      if (session?.steps) setSteps(session.steps);
    } catch {}
  };

  // ── Persist steps to IndexedDB whenever they change ────────
  useEffect(() => {
    if (steps === 0) return;
    saveSession({
      id:       getTodayKey(),
      steps,
      distKm:   parseFloat((steps * STRIDE_M / 1000).toFixed(3)),
      kcal:     Math.round(steps * KCAL_PER_STEP),
      updatedAt: Date.now(),
    }).catch(() => {});
  }, [steps]);

  // ── Motion permission (iOS needs explicit request) ──────────
  const requestMotionPermission = async () => {
    if (typeof DeviceMotionEvent?.requestPermission === "function") {
      const perm = await DeviceMotionEvent.requestPermission();
      if (perm !== "granted") throw new Error("Motion permission denied.");
    }
  };

  // ── Start step tracking ─────────────────────────────────────
  const startTracking = async () => {
    setPermError("");
    try {
      await requestMotionPermission();
      const handler = (e) => {
        const { x = 0, y = 0, z = 0 } = e.accelerationIncludingGravity || {};
        const mag  = Math.sqrt(x * x + y * y + z * z);
        const now  = Date.now();
        setAccelData({ x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) });
        if (mag > STEP_THRESHOLD && lastMagRef.current <= STEP_THRESHOLD
            && (now - lastStepRef.current) > STEP_COOLDOWN) {
          lastStepRef.current = now;
          setSteps(s => s + 1);
        }
        lastMagRef.current = mag;
      };
      motionHandlerRef.current = handler;
      window.addEventListener("devicemotion", handler);
      setTracking(true);

      // Register background sync tag so SW keeps nudging when tab sleeps
      if (swReady && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg.sync) await reg.sync.register("flush-steps").catch(() => {});
      }
    } catch (err) {
      setPermError(err.message || "Could not access motion sensor.");
    }
  };

  const stopTracking = () => {
    if (motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
      motionHandlerRef.current = null;
    }
    setTracking(false);
  };

  // ── GPS ─────────────────────────────────────────────────────
  const startGPS = () => {
    setPermError("");
    if (!navigator.geolocation) { setPermError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsPositionsRef.current = [pos];
        setGpsData(pos.coords);
        setGpsActive(true);
        gpsWatchRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const prev = gpsPositionsRef.current[gpsPositionsRef.current.length - 1];
            if (prev) {
              const d = haversineKm(prev.coords.latitude, prev.coords.longitude, p.coords.latitude, p.coords.longitude);
              setGpsDistKm(km => parseFloat((km + d).toFixed(3)));
            }
            gpsPositionsRef.current.push(p);
            setGpsData(p.coords);
          },
          null,
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
      },
      (err) => setPermError("Location permission denied. Please allow in browser settings."),
      { enableHighAccuracy: true }
    );
  };

  const stopGPS = () => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setGpsActive(false);
  };

  // ── Save to Firestore ────────────────────────────────────────
  const saveToLog = async () => {
    const distKm = parseFloat((steps * STRIDE_M / 1000).toFixed(2));
    const kcal   = Math.round(steps * KCAL_PER_STEP);
    await updateDay(day => ({
      ...day,
      workouts: [...(day.workouts || []), {
        workout_name:    `${steps.toLocaleString()} steps`,
        duration_min:    Math.round(steps / 100),
        calories_burned: kcal,
        muscle_groups:   ["Legs", "Cardio", "Core"],
        intensity:       steps > 10000 ? "High" : steps > 5000 ? "Medium" : "Low",
        summary:         `Walked ${distKm} km — ${steps.toLocaleString()} steps tracked via device sensor.`,
        source:          "sensor",
        time:            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        gpsDistKm:       gpsDistKm > 0 ? gpsDistKm : distKm,
      }],
    }));
    setSaved(true);
    stopTracking();
    stopGPS();
  };

  const distKm  = parseFloat((steps * STRIDE_M / 1000).toFixed(2));
  const kcal    = Math.round(steps * KCAL_PER_STEP);

  const tabs = [
    { id: "steps",  label: "Steps"   },
    { id: "gps",    label: "GPS run" },
    { id: "motion", label: "Motion"  },
    { id: "info",   label: "Sensors" },
  ];

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <style>{`@keyframes livepulse { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>📡 Activity</h1>
        <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 13 }}>
          Live sensor tracking — works in background via Service Worker
        </p>
      </div>

      {/* Tab strip */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "6px 14px", borderRadius: 99, fontSize: 12, cursor: "pointer",
            border: tab === t.id ? "1px solid #6366f1" : "1px solid #1e293b",
            background: tab === t.id ? "#6366f133" : "transparent",
            color: tab === t.id ? "#a5b4fc" : "#475569",
            fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {permError && (
        <div style={{ background: "#f8717122", border: "1px solid #f87171", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 12 }}>
          {permError}
        </div>
      )}

      {/* ── STEPS TAB ── */}
      {tab === "steps" && (
        <>
          <Card style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              <LiveDot active={tracking} />
              <span style={{ fontSize: 12, color: "#475569" }}>
                {tracking ? "Tracking live" : "Not tracking"}
              </span>
              {swReady && <span style={{ fontSize: 11, color: "#4ade80", marginLeft: 4 }}>· SW ready</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <StepRing steps={steps} goal={goal} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                [distKm.toFixed(2), "km"],
                [kcal, "kcal"],
                [goal.toLocaleString(), "goal"],
              ].map(([v, l]) => (
                <div key={l} style={{ background: "#1e293b", borderRadius: 10, padding: "10px 6px" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9" }}>{v}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>

            {!tracking ? (
              <Btn onClick={startTracking} fullWidth>Start tracking steps</Btn>
            ) : (
              <Btn onClick={stopTracking} fullWidth style={{ background: "#ef4444" }}>Stop tracking</Btn>
            )}

            {steps > 0 && !tracking && !saved && (
              <Btn onClick={saveToLog} variant="success" fullWidth style={{ marginTop: 8 }}>
                Save to today's log
              </Btn>
            )}

            {saved && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "#4ade8022", border: "1px solid #4ade80", borderRadius: 10, fontSize: 13, color: "#4ade80" }}>
                ✓ Saved — {steps.toLocaleString()} steps logged!
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 500, marginBottom: 8 }}>Background tracking</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
              A Service Worker keeps steps counting even when the screen locks or the tab goes to background.
              Steps are stored in IndexedDB on-device, then synced to your Firestore profile when you save.
              <br/><br/>
              <span style={{ color: "#f97316" }}>Note:</span> iOS Safari requires the app to be added to your home screen (Add to Home Screen) for full background sensor access.
            </div>
          </Card>
        </>
      )}

      {/* ── GPS TAB ── */}
      {tab === "gps" && (
        <>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <LiveDot active={gpsActive} />
              <span style={{ fontSize: 12, color: "#475569" }}>{gpsActive ? "GPS live" : "GPS inactive"}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14 }}>
              {[
                ["Distance", gpsDistKm.toFixed(3) + " km", "#6366f1"],
                ["Speed", gpsData?.speed ? (gpsData.speed * 3.6).toFixed(1) + " km/h" : "0.0 km/h", "#22c55e"],
                ["Altitude", gpsData?.altitude ? Math.round(gpsData.altitude) + " m" : "—", "#f97316"],
                ["Accuracy", gpsData?.accuracy ? Math.round(gpsData.accuracy) + " m" : "—", "#38bdf8"],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: "#1e293b", borderRadius: 10, padding: "12px 10px" }}>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: c }}>{v}</div>
                </div>
              ))}
            </div>

            {gpsData && (
              <div style={{ background: "#1e293b", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#475569", marginBottom: 14, fontVariantNumeric: "tabular-nums" }}>
                {gpsData.latitude.toFixed(5)}, {gpsData.longitude.toFixed(5)}
              </div>
            )}

            {!gpsActive ? (
              <Btn onClick={startGPS} fullWidth>Request GPS permission</Btn>
            ) : (
              <>
                <Btn onClick={stopGPS} fullWidth style={{ background: "#ef4444" }}>Stop GPS</Btn>
                {gpsDistKm > 0 && (
                  <Btn onClick={saveToLog} variant="success" fullWidth style={{ marginTop: 8 }}>
                    Log this run ({gpsDistKm.toFixed(2)} km)
                  </Btn>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {/* ── MOTION TAB ── */}
      {tab === "motion" && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <LiveDot active={tracking} />
            <span style={{ fontSize: 12, color: "#475569" }}>Raw accelerometer — {tracking ? "live" : "inactive"}</span>
          </div>

          {[
            ["X", accelData.x, "#6366f1"],
            ["Y", accelData.y, "#22c55e"],
            ["Z", accelData.z, "#f97316"],
          ].map(([axis, val, color]) => {
            const pct = Math.min(100, Math.round((Math.abs(val) / 20) * 100));
            return (
              <div key={axis} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color }}>{axis}-axis</span>
                  <span style={{ color: "#475569" }}>{val} m/s²</span>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.1s ease" }} />
                </div>
              </div>
            );
          })}

          {!tracking ? (
            <Btn onClick={startTracking} fullWidth>Start motion sensor</Btn>
          ) : (
            <Btn onClick={stopTracking} fullWidth style={{ background: "#ef4444" }}>Stop</Btn>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            This is the raw data the step counter uses. Peaks above {STEP_THRESHOLD} m/s² with {STEP_COOLDOWN}ms cooldown count as steps.
          </div>
        </Card>
      )}

      {/* ── INFO TAB ── */}
      {tab === "info" && (
        <Card>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12, fontWeight: 500 }}>
            What this browser can access
          </div>
          <div>
            <SensorRow label="Accelerometer" sub="X/Y/Z at 60hz — step counting, rep detection" status="available" />
            <SensorRow label="GPS / Geolocation" sub="Lat, lng, speed, altitude — outdoor runs" status="available" />
            <SensorRow label="Gyroscope" sub="Rotation and orientation" status="available" />
            <SensorRow label="Microphone" sub="Voice workout logging" status="available" />
            <SensorRow label="Camera" sub="Food & body photo analysis" status="available" />
            <SensorRow label="Background (screen off)" sub="Via Service Worker + IndexedDB" status="available" />
            <SensorRow label="Heart rate monitor" sub="Bluetooth HR strap — Web Bluetooth API" status="limited" />
            <SensorRow label="Apple Health / Google Fit" sub="Needs native app or manual export" status="limited" />
            <SensorRow label="Barometer / floor count" sub="Not exposed by browsers" status="unavailable" />
          </div>
        </Card>
      )}
    </div>
  );
}
