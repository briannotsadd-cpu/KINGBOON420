"use client";
import { useEffect, useRef, useState } from "react";
import { CREDIT, ILLUSTRATION_URL, MODEL_URL, PLACEHOLDER_LABEL } from "./showcase-text";
import { nodeCode, nodeKindLabel } from "@/lib/map";

type State = "loading" | "ready" | "error";
interface Pick { code: string }

/** three.js is imported dynamically inside the effect, so it is only downloaded on this page. */
export function Showcase3D() {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("loading");
  const [codes, setCodes] = useState<string[]>([]);
  const [pick, setPick] = useState<Pick | null>(null);
  const [rotate, setRotate] = useState<boolean | null>(null);
  const selectRef = useRef<(code: string) => void>(() => {});

  useEffect(() => {
    let disposed = false, raf = 0, cleanup = () => {};
    (async () => {
      try {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setRotate(!reduce);
        const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
          import("three"), import("three/examples/jsm/controls/OrbitControls.js"), import("three/examples/jsm/loaders/GLTFLoader.js"),
        ]);
        if (disposed || !box.current) return;
        const host = box.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true });   // throws when WebGL is unavailable
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const el = renderer.domElement;
        el.setAttribute("data-testid", "canvas-3d");
        el.setAttribute("role", "img");
        el.setAttribute("aria-label", `โมเดล 3 มิติ หมุนดูได้ด้วยการลาก — ${PLACEHOLDER_LABEL}`);
        el.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
        host.appendChild(el);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf3e4cf);
        scene.add(new THREE.HemisphereLight(0xcfe0ff, 0xd9b48a, 1.1));
        const sun = new THREE.DirectionalLight(0xffd2a0, 2.6); sun.position.set(90, 60, 30); scene.add(sun);
        const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 800);
        cam.position.set(70, 45, 95);
        const ctl = new OrbitControls(cam, el);
        ctl.target.set(0, 18, 0); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI / 2 - 0.02; ctl.autoRotate = !reduce; ctl.autoRotateSpeed = 0.8; ctl.update();
        const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
        resize();
        const ro = new ResizeObserver(resize); ro.observe(host);

        const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
        if (disposed) { renderer.dispose(); return; }
        // top-level node per building; GLTFLoader strips dots from names, the original is kept in userData.name
        const roots = new Map<string, import("three").Object3D>();
        gltf.scene.children.forEach((o) => { const n = nodeCode(String(o.userData.name ?? o.name)); roots.set(n, o); });
        gltf.scene.traverse((o) => { const n = String(o.userData.name ?? o.name); if (/_LOD1$/.test(n)) o.visible = false; });
        scene.add(gltf.scene);
        const selectable = [...roots.keys()].filter((c) => !/\.(GROUND|RIVER)$/.test(c));
        setCodes(selectable);
        const ring = new THREE.Box3Helper(new THREE.Box3(), 0xb4540a); ring.visible = false; scene.add(ring);
        const choose = (code: string) => {
          const o = roots.get(code); if (!o) return;
          ring.box.setFromObject(o); ring.visible = true; setPick({ code });
        };
        selectRef.current = choose;
        const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
        let down: [number, number] | null = null;
        const onDown = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
        const onUp = (e: PointerEvent) => {
          if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;   // a drag is orbiting, not a tap
          const r = el.getBoundingClientRect();
          ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          ray.setFromCamera(ndc, cam);
          for (const h of ray.intersectObject(gltf.scene, true)) {
            let o: import("three").Object3D | null = h.object;
            while (o && o.parent !== gltf.scene) o = o.parent;
            const code = o ? nodeCode(String(o.userData.name ?? o.name)) : "";
            if (selectable.includes(code)) { choose(code); return; }
          }
        };
        el.addEventListener("pointerdown", onDown); el.addEventListener("pointerup", onUp);
        const loop = () => { raf = requestAnimationFrame(loop); ctl.update(); renderer.render(scene, cam); };
        loop();
        setState("ready");
        cleanup = () => {
          cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointerup", onUp);
          ctl.dispose(); renderer.dispose(); el.remove();
        };
      } catch (e) {
        console.error("[3d]", e);
        if (!disposed) setState("error");
      }
    })();
    return () => { disposed = true; cancelAnimationFrame(raf); cleanup(); };
  }, []);

  return (
    <div className="stack" data-testid="showcase" data-state={state} data-autorotate={rotate === null ? undefined : String(rotate)}>
      {state === "error" ? (
        <div className="stack" role="alert">
          <div className="notice notice-warn" data-testid="webgl-fallback"><div>อุปกรณ์หรือเบราว์เซอร์นี้แสดงภาพ 3 มิติไม่ได้ ลองเปิดด้วยเบราว์เซอร์อื่น หรือดูภาพประกอบ 2 มิติด้านล่างแทน</div></div>
          <a href={ILLUSTRATION_URL} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">เปิดภาพประกอบ 2 มิติ</a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ILLUSTRATION_URL} alt={`ภาพประกอบ 2 มิติของแบบจำลอง — ${PLACEHOLDER_LABEL}`} style={{ width: "100%", height: "auto", borderRadius: 14 }} />
        </div>
      ) : (
        <div ref={box} style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "var(--surface-2)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)" }}>
          {state === "loading" && <div className="loading" style={{ position: "absolute", inset: 0, padding: 0 }}><span className="spinner" aria-hidden />กำลังโหลดแบบจำลอง…</div>}
        </div>
      )}
      {state === "ready" && (
        <>
          <p className="hint" style={{ margin: 0 }}>ลากนิ้วเพื่อหมุนดู บีบนิ้วเพื่อซูม แตะที่อาคารเพื่อดูรหัส {rotate ? "(กำลังหมุนอัตโนมัติ)" : "(ปิดการหมุนอัตโนมัติตามการตั้งค่าลดการเคลื่อนไหว)"}</p>
          <section className="card" aria-live="polite" data-testid="pick" aria-label="อาคารที่เลือก">
            {pick ? <><b>รหัสอาคาร: <span data-testid="pick-code">{pick.code}</span></b>{nodeKindLabel(pick.code) && <span className="meta" style={{ display: "block" }}>ประเภท: {nodeKindLabel(pick.code)}</span>}</>
              : <span className="meta">ยังไม่ได้เลือกอาคาร แตะที่โมเดล หรือเลือกจากรายการด้านล่าง</span>}
          </section>
          <ul className="list" aria-label="รายการรหัสอาคารในโมเดล" style={{ gap: 8 }}>
            {codes.map((c) => (
              <li key={c}><button type="button" className="btn btn-secondary btn-block" style={{ justifyContent: "flex-start" }} aria-pressed={pick?.code === c} onClick={() => selectRef.current(c)} data-testid={`node-${c}`}>{c}</button></li>
            ))}
          </ul>
        </>
      )}
      <p className="meta">{CREDIT}</p>
    </div>
  );
}
