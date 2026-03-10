"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";

type Gear = "P" | "R" | "N" | "D";
type CameraMode = "chase" | "orbit" | "top";
type GripMode = "comfort" | "sport" | "track";
type Keys = { w: boolean; s: boolean; a: boolean; d: boolean; space: boolean; shift: boolean };

type Telemetry = {
  speedKmh: number;
  rpm: number;
  braking: boolean;
  steer: number;
  slip: number;
  absActive: boolean;
};

function DrivePhysics({
  gear,
  gripMode,
  telemetryRef,
  carRef,
}: {
  gear: Gear;
  gripMode: GripMode;
  telemetryRef: MutableRefObject<Telemetry>;
  carRef: MutableRefObject<THREE.Group | null>;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const chassisRef = useRef<THREE.Group>(null);
  const brakeLight = useRef<THREE.Mesh>(null);
  const wheelRefs = useRef<THREE.Object3D[]>([]);
  const frontWheelRefs = useRef<THREE.Object3D[]>([]);
  const gltf = useGLTF("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb");

  const fittedCar = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Recenter so camera/controls can reliably track the car body.
    cloned.position.sub(center);

    // Normalize car length to ~2.4 world units for consistent visibility.
    const targetLength = 2.4;
    const currentLength = Math.max(0.001, size.x);
    const s = targetLength / currentLength;
    cloned.scale.setScalar(s);

    // Ferrari GLB wheel names (robust lookup from full scene graph)
    const wheelFL = cloned.getObjectByName("wheel_fl");
    const wheelFR = cloned.getObjectByName("wheel_fr");
    const wheelRL = cloned.getObjectByName("wheel_rl");
    const wheelRR = cloned.getObjectByName("wheel_rr");

    const direct = [wheelFL, wheelFR, wheelRL, wheelRR].filter((w): w is THREE.Object3D => w != null);

    if (direct.length === 4) {
      wheelRefs.current = direct;
      frontWheelRefs.current = [wheelFL, wheelFR].filter((w): w is THREE.Object3D => w != null);
    } else {
      const found: THREE.Object3D[] = [];
      const front: THREE.Object3D[] = [];
      cloned.traverse((obj) => {
        const n = obj.name?.toLowerCase?.() ?? "";
        if (n.includes("wheel")) {
          found.push(obj);
          if (n.includes("fl") || n.includes("fr") || n.includes("front")) front.push(obj);
        }
      });
      wheelRefs.current = found;
      frontWheelRefs.current = front;
    }

    cloned.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    return cloned;
  }, [gltf.scene]);

  const heading = useRef(0);
  const velocity = useRef(0);
  const steer = useRef(0);
  const throttleInput = useRef(0);
  const brakeInput = useRef(0);
  const slipRef = useRef(0);
  const absPhase = useRef(0);

  const keys = useRef<Keys>({ w: false, s: false, a: false, d: false, space: false, shift: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") keys.current.w = down;
      if (k === "s" || k === "arrowdown") keys.current.s = down;
      if (k === "a" || k === "arrowleft") keys.current.a = down;
      if (k === "d" || k === "arrowright") keys.current.d = down;
      if (k === " ") keys.current.space = down;
      if (k === "shift") keys.current.shift = down;
    };

    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  useFrame((_, dt) => {
    if (!modelRef.current || !chassisRef.current) return;

    const gripCfg =
      gripMode === "comfort"
        ? { maxForward: 18, accel: 13, brake: 24, drag: 8.5, gripFloor: 0.5 }
        : gripMode === "sport"
          ? { maxForward: 24, accel: 17, brake: 30, drag: 7, gripFloor: 0.4 }
          : { maxForward: 30, accel: 21, brake: 34, drag: 6, gripFloor: 0.3 };

    const boost = keys.current.shift ? 1.2 : 1;
    const maxForward = gripCfg.maxForward * boost;
    const maxReverse = -10;
    const accel = gripCfg.accel;
    const brakePower = gripCfg.brake;
    const drag = gripCfg.drag;

    const wantsThrottle = keys.current.w;
    const wantsBrake = keys.current.s || keys.current.space;

    let throttleTarget = 0;
    if (gear === "D" && wantsThrottle) throttleTarget = 1;
    if (gear === "R" && wantsThrottle) throttleTarget = -0.7;

    throttleInput.current = THREE.MathUtils.lerp(throttleInput.current, throttleTarget, 0.14);
    brakeInput.current = THREE.MathUtils.lerp(brakeInput.current, wantsBrake ? 1 : 0, 0.22);

    velocity.current += throttleInput.current * accel * dt;

    // ABS-like pulsing under heavy braking at speed
    const speedAbsPreBrake = Math.abs(velocity.current);
    const absActive = wantsBrake && speedAbsPreBrake > 9;
    if (absActive) {
      absPhase.current += dt * 20;
      const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(absPhase.current));
      velocity.current -= Math.sign(velocity.current || 1) * brakePower * pulse * dt;
    } else if (wantsBrake) {
      velocity.current -= Math.sign(velocity.current || 1) * brakePower * dt;
    }

    if (!wantsThrottle) {
      velocity.current -= Math.sign(velocity.current) * Math.min(Math.abs(velocity.current), drag * dt);
    }

    if (gear === "P") velocity.current *= 1 - Math.min(0.95, dt * 10);
    if (gear === "N") velocity.current *= 1 - Math.min(0.7, dt * 4.5);

    velocity.current = THREE.MathUtils.clamp(velocity.current, maxReverse, maxForward);

    const speedAbs = Math.abs(velocity.current);
    const steerTarget = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
    const grip = THREE.MathUtils.clamp(1 - speedAbs / 44, gripCfg.gripFloor, 1);
    steer.current = THREE.MathUtils.lerp(steer.current, steerTarget * grip, 0.16);

    // Simple traction/slip model: aggressive throttle + steer at speed => more slip
    const slipDemand = THREE.MathUtils.clamp(
      (Math.abs(steer.current) * Math.abs(throttleInput.current) * speedAbs) / 14,
      0,
      1
    );
    slipRef.current = THREE.MathUtils.lerp(slipRef.current, slipDemand, 0.08);

    const yawGrip = THREE.MathUtils.lerp(1, 0.58, slipRef.current);
    heading.current += steer.current * (velocity.current / 16) * dt * yawGrip;

    // Ferrari GLB faces -Z; rotation.y = heading + PI makes nose point +Z (along road)
    modelRef.current.rotation.y = heading.current + Math.PI;

    const forwardX = Math.sin(heading.current);
    const forwardZ = Math.cos(heading.current);
    const rightX = Math.cos(heading.current);
    const rightZ = -Math.sin(heading.current);

    modelRef.current.position.x += forwardX * velocity.current * dt;
    modelRef.current.position.z += forwardZ * velocity.current * dt;

    // lateral drift under slip
    const lateral = steer.current * Math.abs(velocity.current) * slipRef.current * 0.35;
    modelRef.current.position.x += rightX * lateral * dt;
    modelRef.current.position.z += rightZ * lateral * dt;

    // free-roam world bounds (very wide, mostly unnoticeable)
    modelRef.current.position.x = THREE.MathUtils.clamp(modelRef.current.position.x, -420, 420);
    modelRef.current.position.z = THREE.MathUtils.clamp(modelRef.current.position.z, -420, 420);

    // suspension pitch + tiny bounce (bounce added to base height so car stays on road)
    const chassisBaseY = 0.42;
    const pitch = THREE.MathUtils.clamp((throttleInput.current - brakeInput.current) * 0.06, -0.08, 0.06);
    const bounce = Math.sin(performance.now() * 0.01 + speedAbs) * (speedAbs > 2 ? 0.007 : 0);
    chassisRef.current.rotation.z = THREE.MathUtils.lerp(chassisRef.current.rotation.z, pitch, 0.1);
    chassisRef.current.position.y = chassisBaseY + bounce;

    // Wheel roll when driving or reversing
    const wheelRadius = 0.35;
    const rolling = Math.abs(velocity.current) > 0.08;
    if (rolling) {
      const spin = (velocity.current / wheelRadius) * dt;
      wheelRefs.current.forEach((w) => {
        if (!w) return;
        // most Ferrari exports roll on X; keep fallback for different rigs
        w.rotation.x -= spin;
      });
    }

    const steerBase = THREE.MathUtils.clamp(steer.current * 0.44, -0.44, 0.44);
    frontWheelRefs.current.forEach((w) => {
      if (!w) return;
      w.rotation.y = steerBase;
    });

    const braking = wantsBrake;
    if (brakeLight.current) {
      const m = brakeLight.current.material as THREE.MeshStandardMaterial;
      const absBlink = absActive ? 2.0 + (0.5 + 0.5 * Math.sin(absPhase.current * 1.2)) * 1.2 : 2.7;
      m.emissiveIntensity = braking ? absBlink : 0.35;
    }

    telemetryRef.current = {
      speedKmh: Math.max(0, velocity.current * 3.6),
      rpm: THREE.MathUtils.clamp(850 + speedAbs * 230 + Math.abs(throttleInput.current) * 1250, 850, 7600),
      braking,
      steer: steerBase,
      slip: slipRef.current,
      absActive,
    };

    carRef.current = modelRef.current;
  });

  return (
    <group ref={modelRef}>
      <group ref={chassisRef} position={[0, 0.42, 0]}>
        <primitive object={fittedCar} />

        {/* fallback helper lights in world-scale near body */}
        <mesh position={[-1.2, 0.31, 0.34]}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
          <meshStandardMaterial color="#d8f2ff" emissive="#8ad8ff" emissiveIntensity={1.9} />
        </mesh>
        <mesh position={[-1.2, 0.31, -0.34]}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
          <meshStandardMaterial color="#d8f2ff" emissive="#8ad8ff" emissiveIntensity={1.9} />
        </mesh>

        <mesh ref={brakeLight} position={[1.2, 0.27, 0]}>
          <boxGeometry args={[0.12, 0.03, 0.94]} />
          <meshStandardMaterial color="#ff7f93" emissive="#ff334e" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

function CameraRig({ carRef, mode }: { carRef: MutableRefObject<THREE.Group | null>; mode: CameraMode }) {
  const orbitRef = useRef<any>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!carRef.current || !orbitRef.current) return;
    const p = carRef.current.position;

    if (mode === "chase") {
      const target = new THREE.Vector3(p.x, p.y + 0.44, p.z);
      orbitRef.current.target.lerp(target, 0.15);

      const desired = new THREE.Vector3(p.x - 3.1, 1.85, p.z - 3.1);
      camera.position.lerp(desired, 0.06);
      orbitRef.current.update();
      return;
    }

    if (mode === "top") {
      const target = new THREE.Vector3(p.x, p.y + 0.2, p.z);
      orbitRef.current.target.lerp(target, 0.16);
      const desired = new THREE.Vector3(p.x, 8, p.z + 0.01);
      camera.position.lerp(desired, 0.08);
      orbitRef.current.update();
      return;
    }

    // orbit mode: user controls angle/zoom; only target follows car
    orbitRef.current.target.lerp(new THREE.Vector3(p.x, p.y + 0.45, p.z), 0.12);
    orbitRef.current.update();
  });

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enablePan={false}
      minDistance={2}
      maxDistance={11}
      minPolarAngle={0.22}
      maxPolarAngle={1.5}
      enableRotate
      enableZoom
      rotateSpeed={0.8}
      zoomSpeed={0.9}
    />
  );
}

function OpenLandscape() {
  const terrain = useMemo(() => {
    const g = new THREE.PlaneGeometry(920, 920, 180, 180);
    const p = g.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const h = Math.sin(x * 0.03) * 1.1 + Math.cos(y * 0.022) * 0.9 + Math.sin((x + y) * 0.014) * 1.4;
      p.setZ(i, h);
    }

    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <group>
      <mesh geometry={terrain} position={[0, -0.82, 0]} receiveShadow>
        <meshStandardMaterial color="#5f7254" roughness={0.98} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.33, 0]} receiveShadow>
        <planeGeometry args={[22, 860]} />
        <meshStandardMaterial color="#34302e" roughness={0.98} metalness={0.01} />
      </mesh>

      {Array.from({ length: 95 }).map((_, i) => (
        <mesh key={i} position={[0, -0.329, i * 9 - 425]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.25, 2.4]} />
          <meshStandardMaterial color="#e8ecef" />
        </mesh>
      ))}
    </group>
  );
}

export function DriveSimulator() {
  const telemetryRef = useRef<Telemetry>({ speedKmh: 0, rpm: 900, braking: false, steer: 0, slip: 0, absActive: false });
  const carRef = useRef<THREE.Group | null>(null);

  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(900);
  const [slip, setSlip] = useState(0);
  const [absActive, setAbsActive] = useState(false);
  const [gear, setGear] = useState<Gear>("D");
  const [mode, setMode] = useState<CameraMode>("chase");
  const [gripMode, setGripMode] = useState<GripMode>("sport");

  useEffect(() => {
    const t = setInterval(() => {
      setSpeed(telemetryRef.current.speedKmh);
      setRpm(telemetryRef.current.rpm);
      setSlip(telemetryRef.current.slip);
      setAbsActive(telemetryRef.current.absActive);
    }, 90);
    return () => clearInterval(t);
  }, []);

  const gears = useMemo(() => ["P", "R", "N", "D"] as Gear[], []);
  const modes = useMemo(() => ["chase", "orbit", "top"] as CameraMode[], []);
  const gripModes = useMemo(() => ["comfort", "sport", "track"] as GripMode[], []);

  return (
    <section className="relative h-screen bg-[#2f2927] text-white">
      <Canvas dpr={[1, 1.5]} camera={{ position: [-3.1, 1.9, -3.1], fov: 55 }} shadows>
        <color attach="background" args={["#37302d"]} />
        <fog attach="fog" args={["#37302d", 16, 78]} />
        <ambientLight intensity={0.56} />
        <directionalLight position={[5, 8, 3]} intensity={2.4} color="#f0f6ff" castShadow />
        <pointLight position={[0, 2.6, -8]} color="#6dc6ff" intensity={10} distance={22} />

        <DrivePhysics gear={gear} gripMode={gripMode} telemetryRef={telemetryRef} carRef={carRef} />
        <CameraRig carRef={carRef} mode={mode} />
        <OpenLandscape />

        <Environment preset="city" />
      </Canvas>

      <div className="absolute left-0 top-0 flex w-full items-center justify-between px-6 py-6">
        <Link href="/" className="rounded-full border border-white/25 px-4 py-2 text-xs tracking-[0.2em] text-white/80">
          BACK
        </Link>
        <p className="text-xs tracking-[0.2em] text-white/80">TEST DRIVE</p>
      </div>

      <div className="absolute bottom-4 left-4 right-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl border border-white/20 bg-black/35 p-3">
          <p className="text-[10px] tracking-[0.2em] text-white/60">SPEED / RPM</p>
          <p className="mt-1 text-2xl font-semibold">
            {Math.round(speed)} <span className="text-xs text-white/60">km/h</span>
          </p>
          <p className="text-xs text-white/75">{Math.round(rpm)} rpm</p>
          <p className="text-[10px] text-white/70">Slip: {Math.round(slip * 100)}%</p>
          <p className={`text-[10px] ${absActive ? "text-amber-300" : "text-white/45"}`}>ABS: {absActive ? "ACTIVE" : "OFF"}</p>
          <div className="mt-2 flex gap-1.5">
            {gears.map((g) => (
              <button
                key={g}
                onClick={() => setGear(g)}
                className={`rounded-full px-2.5 py-1 text-[10px] ${gear === g ? "bg-white text-black" : "border border-white/30 text-white/85"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/35 p-3 text-[11px] text-white/85">
          <p className="mb-1 text-[10px] tracking-[0.2em] text-white/60">DRIVE CONTROLS</p>
          <p>W/↑ throttle · S/↓ brake · A,D or ←,→ steer</p>
          <p>Space handbrake · Shift boost</p>
          <p className="mt-1 text-white/60">Mouse drag rotate, wheel zoom</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/35 p-3 text-[11px] text-white/85">
          <p className="mb-1 text-[10px] tracking-[0.2em] text-white/60">CAMERA MODE</p>
          <div className="flex gap-1.5">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-2.5 py-1 text-[10px] capitalize ${mode === m ? "bg-white text-black" : "border border-white/30 text-white/85"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mb-1 mt-3 text-[10px] tracking-[0.2em] text-white/60">HANDLING</p>
          <div className="flex gap-1.5">
            {gripModes.map((g) => (
              <button
                key={g}
                onClick={() => setGripMode(g)}
                className={`rounded-full px-2.5 py-1 text-[10px] capitalize ${gripMode === g ? "bg-white text-black" : "border border-white/30 text-white/85"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

