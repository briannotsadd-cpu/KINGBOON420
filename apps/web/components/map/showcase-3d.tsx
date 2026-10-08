"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { CREDIT, ILLUSTRATION_URL, MODEL_URL, PLACEHOLDER_LABEL } from "./showcase-text";
import { nodeCode, nodeKindLabel } from "@/lib/map";
import styles from "./showcase-3d.module.css";

type State = "loading" | "ready" | "error";
type CameraAction = "reset" | "top" | "in" | "out" | "rotate";
interface SceneAPI { select: (code: string) => void; camera: (action: CameraAction) => void }
const NOOP_API: SceneAPI = { select: () => {}, camera: () => {} };

/** On-demand WebGL: static views do not keep a render loop running. */
export function Showcase3D() {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<SceneAPI>(NOOP_API);
  const selectorId = useId();
  const [state, setState] = useState<State>("loading");
  const [codes, setCodes] = useState<string[]>([]);
  const [pick, setPick] = useState<string>("");
  const [rotate, setRotate] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let disposed = false;
    const releases: Array<() => void> = [];
    const release = () => {
      api.current = NOOP_API;
      while (releases.length) releases.pop()?.();
    };
    (async () => {
      try {
        const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReducedMotion(preference.matches);
        const [THREE, { OrbitControls }, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          import("three"), import("three/examples/jsm/controls/OrbitControls.js"),
          import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/environments/RoomEnvironment.js"),
        ]);
        if (disposed || !box.current) return;
        const host = box.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
        releases.push(() => { renderer.dispose(); renderer.forceContextLoss(); });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;
        const el = renderer.domElement;
        el.setAttribute("data-testid", "canvas-3d");
        el.setAttribute("role", "img");
        el.setAttribute("aria-label", `แบบจำลอง 3 มิติ ลากเพื่อหมุน บีบนิ้วเพื่อซูม หรือใช้ปุ่มและรายการอาคารด้านล่าง — ${PLACEHOLDER_LABEL}`);
        el.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
        host.appendChild(el);
        releases.push(() => el.remove());
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe9e8e1);
        scene.fog = new THREE.Fog(0xe9e8e1, 200, 440);
        const pmrem = new THREE.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        const environment = pmrem.fromScene(room, 0.04);
        room.dispose(); pmrem.dispose();
        scene.environment = environment.texture;
        scene.environmentIntensity = 0.45;
        releases.push(() => environment.dispose());
        scene.add(new THREE.HemisphereLight(0xe6eeff, 0x9c9585, 2));
        const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
        sun.position.set(55, 85, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = sun.shadow.camera.bottom = -105;
        sun.shadow.camera.right = sun.shadow.camera.top = 105;
        sun.shadow.camera.near = 1; sun.shadow.camera.far = 240;
        sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.12;
        scene.add(sun);
        releases.push(() => sun.shadow.dispose());
        const fill = new THREE.DirectionalLight(0xc6d9f0, 1);
        fill.position.set(-40, 30, -50); scene.add(fill);
        const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 650);
        const ctl = new OrbitControls(cam, el);
        ctl.enableDamping = !preference.matches;
        ctl.dampingFactor = 0.09;
        ctl.minDistance = 12; ctl.maxDistance = 280;
        ctl.maxPolarAngle = Math.PI / 2 - 0.04;
        ctl.autoRotateSpeed = 0.6;
        releases.push(() => ctl.dispose());

        let raf = 0, visible = true, interacting = false, ready = false, frames = 0;
        let lastFrameTime = performance.now();
        let transition: { start: number; from: import("three").Vector3; to: import("three").Vector3; targetFrom: import("three").Vector3; targetTo: import("three").Vector3 } | null = null;
        const canDraw = () => !disposed && visible && document.visibilityState !== "hidden";
        const requestDraw = () => { if (!raf && canDraw()) raf = requestAnimationFrame(draw); };
        const draw = (time: number) => {
          raf = 0;
          if (!canDraw()) return;
          if (transition) {
            const t = Math.min((time - transition.start) / 560, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            cam.position.lerpVectors(transition.from, transition.to, ease);
            ctl.target.lerpVectors(transition.targetFrom, transition.targetTo, ease);
            if (t === 1) transition = null;
          }
          ctl.update(Math.min((time - lastFrameTime) / 1000, 0.05));
          lastFrameTime = time; renderer.render(scene, cam);
          if (transition || interacting || (ready && ctl.autoRotate) || frames-- > 0) requestDraw();
        };
        releases.push(() => cancelAnimationFrame(raf));
        const invalidate = () => { if (interacting) frames = preference.matches ? 0 : 28; requestDraw(); };
        ctl.addEventListener("change", invalidate);
        const start = () => {
          transition = null; interacting = true; el.style.cursor = "grabbing";
          if (ctl.autoRotate) { ctl.autoRotate = false; setRotate(false); }
          requestDraw();
        };
        const end = () => { interacting = false; el.style.cursor = "grab"; frames = preference.matches ? 0 : 28; requestDraw(); };
        ctl.addEventListener("start", start); ctl.addEventListener("end", end);
        releases.push(() => { ctl.removeEventListener("change", invalidate); ctl.removeEventListener("start", start); ctl.removeEventListener("end", end); });
        const resize = () => {
          const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
          renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); requestDraw();
        };
        const ro = new ResizeObserver(resize); ro.observe(host); releases.push(() => ro.disconnect());
        const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; requestDraw(); });
        io.observe(host); releases.push(() => io.disconnect());
        const visibility = () => { if (document.visibilityState === "hidden") { cancelAnimationFrame(raf); raf = 0; } else requestDraw(); };
        document.addEventListener("visibilitychange", visibility); releases.push(() => document.removeEventListener("visibilitychange", visibility));
        const motion = () => {
          setReducedMotion(preference.matches); ctl.enableDamping = !preference.matches;
          if (preference.matches) {
            frames = 0; ctl.autoRotate = false; setRotate(false);
            if (transition) { cam.position.copy(transition.to); ctl.target.copy(transition.targetTo); transition = null; }
          }
          requestDraw();
        };
        preference.addEventListener("change", motion); releases.push(() => preference.removeEventListener("change", motion));
        const contextLost = (event: Event) => { event.preventDefault(); release(); if (!disposed) { setRotate(false); setState("error"); } };
        el.addEventListener("webglcontextlost", contextLost); releases.push(() => el.removeEventListener("webglcontextlost", contextLost));
        resize();

        const disposeModel = (model: import("three").Object3D) => {
          const geometries = new Set<import("three").BufferGeometry>();
          const materials = new Set<import("three").Material>();
          const textures = new Set<import("three").Texture>();
          model.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            geometries.add(o.geometry);
            for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
              materials.add(material);
              for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
            }
          });
          geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
        };
        const controller = new AbortController();
        const loadingTimeout = window.setTimeout(() => controller.abort(), 30_000);
        releases.push(() => { clearTimeout(loadingTimeout); controller.abort(); });
        let modelBuffer: ArrayBuffer;
        try {
          const response = await fetch(MODEL_URL, { signal: controller.signal });
          if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
          modelBuffer = await response.arrayBuffer();
        } finally { clearTimeout(loadingTimeout); }
        if (disposed || !el.isConnected) return;
        const gltf = await new GLTFLoader().parseAsync(modelBuffer, new URL(".", new URL(MODEL_URL, window.location.href)).href);
        if (disposed || !el.isConnected) { disposeModel(gltf.scene); return; }
        releases.push(() => disposeModel(gltf.scene));
        const roots = new Map<string, import("three").Object3D>();
        gltf.scene.children.forEach((o) => { roots.set(nodeCode(String(o.userData.name ?? o.name)), o); });
        gltf.scene.traverse((o) => {
          if (/_LOD1$/.test(String(o.userData.name ?? o.name))) o.visible = false;
          if (o instanceof THREE.Mesh) {
            o.castShadow = !/GROUND|RIVER/.test(o.name); o.receiveShadow = true;
          }
        });
        scene.add(gltf.scene); gltf.scene.updateMatrixWorld(true);
        // Box3.setFromObject includes hidden LODs; fit only the geometry actually shown.
        const bounds = (root: import("three").Object3D) => {
          const result = new THREE.Box3();
          root.traverseVisible((o) => {
            if (o instanceof THREE.Mesh) {
              o.geometry.computeBoundingBox();
              if (o.geometry.boundingBox) result.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
            }
          });
          return result;
        };
        const selectable = [...roots.keys()].filter((c) => !/\.(GROUND|RIVER)$/.test(c));
        setCodes(selectable);
        const buildingBounds = new THREE.Box3();
        selectable.forEach((c) => buildingBounds.union(bounds(roots.get(c)!)));
        const overviewTarget = buildingBounds.getCenter(new THREE.Vector3());
        const overviewDistance = Math.min(240, buildingBounds.getSize(new THREE.Vector3()).length() * 1.24);
        const overviewPosition = overviewTarget.clone().add(new THREE.Vector3(0.85, 0.68, 1).normalize().multiplyScalar(overviewDistance));
        cam.position.copy(overviewPosition); ctl.target.copy(overviewTarget); ctl.update();
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), new THREE.MeshBasicMaterial({ color: 0xa55f16, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
        releases.push(() => { ring.geometry.dispose(); ring.material.dispose(); });
        const moveCamera = (position: import("three").Vector3, target: import("three").Vector3) => {
          ctl.autoRotate = false; setRotate(false);
          if (preference.matches) { cam.position.copy(position); ctl.target.copy(target); ctl.update(); }
          else transition = { start: performance.now(), from: cam.position.clone(), to: position, targetFrom: ctl.target.clone(), targetTo: target };
          requestDraw();
        };
        const choose = (code: string) => {
          const root = roots.get(code); if (!root) return;
          const extent = bounds(root), center = extent.getCenter(new THREE.Vector3()), size = extent.getSize(new THREE.Vector3());
          const fit = Math.max(size.y, size.x, size.z) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / Math.min(cam.aspect, 1);
          const direction = cam.position.clone().sub(ctl.target).normalize();
          moveCamera(center.clone().add(direction.multiplyScalar(Math.max(25, fit * 1.65))), center);
          ring.position.set(center.x, extent.min.y + 0.12, center.z);
          ring.scale.set(Math.max(size.x, 5) * 0.68, Math.max(size.z, 5) * 0.68, 1);
          ring.visible = true; setPick(code);
        };
        api.current = {
          select: choose,
          camera: (action) => {
            if (action === "rotate") {
              if (preference.matches) return;
              transition = null; ctl.autoRotate = !ctl.autoRotate; setRotate(ctl.autoRotate); requestDraw(); return;
            }
            if (action === "reset") { ring.visible = false; setPick(""); moveCamera(overviewPosition, overviewTarget); }
            else if (action === "top") moveCamera(ctl.target.clone().add(new THREE.Vector3(0, cam.position.distanceTo(ctl.target), 0.01)), ctl.target.clone());
            else {
              const offset = cam.position.clone().sub(ctl.target);
              offset.setLength(Math.min(ctl.maxDistance, Math.max(ctl.minDistance, offset.length() * (action === "in" ? 0.78 : 1.28))));
              moveCamera(ctl.target.clone().add(offset), ctl.target.clone());
            }
          },
        };
        const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
        const pointers = new Set<number>();
        let down: { x: number; y: number; id: number } | null = null;
        const onDown = (event: PointerEvent) => {
          pointers.add(event.pointerId);
          if (pointers.size !== 1 || event.button !== 0) { down = null; return; }
          down = { x: event.clientX, y: event.clientY, id: event.pointerId };
        };
        const onCancel = (event: PointerEvent) => { pointers.delete(event.pointerId); down = null; };
        const onUp = (event: PointerEvent) => {
          pointers.delete(event.pointerId);
          const initial = down; down = null;
          if (!initial || initial.id !== event.pointerId || Math.hypot(event.clientX - initial.x, event.clientY - initial.y) > 6) return;
          const rect = el.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
          ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
          ray.setFromCamera(ndc, cam);
          const hits = ray.intersectObject(gltf.scene, true);
          for (const hit of hits) {
            let object: import("three").Object3D | null = hit.object;
            let hidden = false;
            while (object && object !== gltf.scene) { if (!object.visible) hidden = true; object = object.parent; }
            if (hidden) continue;
            object = hit.object;
            while (object && object.parent !== gltf.scene) object = object.parent;
            const code = object ? nodeCode(String(object.userData.name ?? object.name)) : "";
            if (selectable.includes(code)) choose(code);
            return; // An opaque foreground surface must not select buildings behind it.
          }
        };
        el.addEventListener("pointerdown", onDown); el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onCancel); el.addEventListener("lostpointercapture", onCancel);
        releases.push(() => {
          el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onCancel); el.removeEventListener("lostpointercapture", onCancel);
        });
        renderer.shadowMap.needsUpdate = true;
        ready = true; requestDraw(); setState("ready");
      } catch (error) {
        release();
        if (!disposed) { console.error("[3d]", error); setState("error"); }
      }
    })();
    return () => { disposed = true; release(); };
  }, []);

  return (
    <div className={styles.showcase} data-testid="showcase" data-state={state} data-autorotate={String(rotate)}>
      {state === "error" ? (
        <div className="stack" role="alert">
          <div className="notice notice-warn" data-testid="webgl-fallback">แสดงแบบจำลอง 3 มิติไม่ได้ อุปกรณ์อาจไม่รองรับหรือโหลดไฟล์ไม่สำเร็จ ดูภาพประกอบ 2 มิติแทนได้</div>
          <a href={ILLUSTRATION_URL} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">เปิดภาพประกอบ 2 มิติ</a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ILLUSTRATION_URL} alt={`ภาพประกอบ 2 มิติของแบบจำลอง — ${PLACEHOLDER_LABEL}`} className={styles.fallback} />
        </div>
      ) : (
        <div className={styles.viewport}>
          <div ref={box} className={styles.canvasHost} />
          <div className={styles.sceneCaption}><span className={styles.captionDot} />แบบจำลองเชิงศิลป์<span>ไม่ใช่ผังสำรวจ</span></div>
          {state === "loading" && <div className={styles.loading} role="status"><span className="spinner" aria-hidden="true" /><strong>กำลังเตรียมแบบจำลอง</strong><span>โหลดเมื่อเปิดหน้านี้เท่านั้น</span></div>}
          {state === "ready" && (
            <div className={styles.cameraControls} role="group" aria-label="ควบคุมมุมมอง 3 มิติ">
              <button type="button" onClick={() => api.current.camera("in")} aria-label="ซูมเข้า" title="ซูมเข้า"><Plus size={18} aria-hidden="true" /></button>
              <button type="button" onClick={() => api.current.camera("out")} aria-label="ซูมออก" title="ซูมออก"><Minus size={18} aria-hidden="true" /></button>
              <button type="button" onClick={() => api.current.camera("top")} aria-label="ดูจากด้านบน" title="ดูจากด้านบน"><Maximize2 size={18} aria-hidden="true" /></button>
              <button type="button" onClick={() => api.current.camera("reset")} aria-label="คืนมุมมองทั้งหมด" title="คืนมุมมองทั้งหมด"><RotateCcw size={18} aria-hidden="true" /></button>
              <button type="button" onClick={() => api.current.camera("rotate")} aria-label="หมุนอัตโนมัติ" aria-pressed={rotate} disabled={reducedMotion} title={reducedMotion ? "ปิดตามการตั้งค่าลดการเคลื่อนไหว" : "หมุนอัตโนมัติ"}><RotateCw size={18} aria-hidden="true" /></button>
            </div>
          )}
        </div>
      )}
      {state === "ready" && (
        <>
          <div className={styles.selectionBar}>
            <div className={styles.selector}><label htmlFor={selectorId}>สำรวจอาคารในแบบจำลอง</label><select id={selectorId} value={pick} onChange={(event) => { if (event.target.value) api.current.select(event.target.value); else api.current.camera("reset"); }}><option value="">ภาพรวมทั้งหมด</option>{codes.map((code) => <option key={code} value={code} data-testid={`node-${code}`}>{nodeKindLabel(code) ?? "อาคาร"} · {code}</option>)}</select></div>
            <section className={styles.selectionDetail} aria-live="polite" data-testid="pick" aria-label="อาคารที่เลือก">
              {pick ? <><span className={styles.selectionLabel}>{nodeKindLabel(pick) ?? "อาคารที่เลือก"}</span><strong data-testid="pick-code">{pick}</strong></> : <><span className={styles.selectionLabel}>มุมมองภาพรวม</span><strong>เลือกอาคารเพื่อดูใกล้ขึ้น</strong></>}
            </section>
          </div>
          <p className={styles.hint}>ลากเพื่อหมุน · เลื่อนหรือบีบนิ้วเพื่อซูม · แตะอาคารเพื่อโฟกัส{reducedMotion && " · ลดการเคลื่อนไหวตามอุปกรณ์"}</p>
        </>
      )}
      <p className={styles.credit}>{CREDIT}</p>
    </div>
  );
}
