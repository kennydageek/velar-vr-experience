"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";

type Gear = "P" | "R" | "N" | "D";
type CameraMode = "chase" | "orbit" | "top";
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
  telemetryRef,
  carRef,
}: {
  gear: Gear;
  telemetryRef: MutableRefObject<Telemetry>;
  carRef: MutableRefObject<THREE.Group | null>;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const chassisRef = useRef<THREE.Group>(null);
  const brakeLight = useRef<THREE.Mesh>(null);
  const gltf = useGLTF("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb");

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
      if (k === "w") keys.current.w = down;
      if (k === "s") keys.current.s = down;
      if (k === "a") keys.current.a = down;
      if (k === "d") keys.current.d = down;
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

    const boost = keys.current.shift ? 1.2 : 1;
    const maxForward = 22 * boost;
    const maxReverse = -9;
    const accel = 17;
    const brakePower = 30;
    const drag = 7;

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
    const grip = THREE.MathUtils.clamp(1 - speedAbs / 40, 0.36, 1);
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

    // Fix heading vs model orientation
    modelRef.current.rotation.y = heading.current - Math.PI / 2;

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

    // short driveway boundaries
    modelRef.current.position.x = THREE.MathUtils.clamp(modelRef.current.position.x, -4.6, 4.6);
    modelRef.current.position.z = THREE.MathUtils.clamp(modelRef.current.position.z, -46, 46);

    // suspension pitch + tiny bounce
    const pitch = THREE.MathUtils.clamp((throttleInput.current - brakeInput.current) * 0.06, -0.08, 0.06);
    const bounce = Math.sin(performance.now() * 0.01 + speedAbs) * (speedAbs > 2 ? 0.007 : 0);
    chassisRef.current.rotation.z = THREE.MathUtils.lerp(chassisRef.current.rotation.z, pitch, 0.1);
    chassisRef.current.position.y = THREE.MathUtils.lerp(chassisRef.current.position.y, bounce, 0.1);

    const steerBase = THREE.MathUtils.clamp(steer.current * 0.44, -0.44, 0.44);

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
      <group ref={chassisRef} scale={0.0115} position={[0, -0.02, 0]}>
        <primitive object={gltf.scene} />

        {/* model-space lighting helpers aligned to ferrari coordinates */}
        <mesh position={[75, 35, 14]}>
          <boxGeometry args={[4, 3, 10]} />
          <meshStandardMaterial color="#d8f2ff" emissive="#8ad8ff" emissiveIntensity={1.9} />
        </mesh>
        <mesh position={[75, 35, -14]}>
          <boxGeometry args={[4, 3, 10]} />
          <meshStandardMaterial color="#d8f2ff" emissive="#8ad8ff" emissiveIntensity={1.9} />
        </mesh>

        <mesh ref={brakeLight} position={[-70, 35, 0]}>
          <boxGeometry args={[6, 4, 45]} />
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


export function DriveSimulator() {
  const telemetryRef = useRef<Telemetry>({ speedKmh: 0, rpm: 900, braking: false, steer: 0, slip: 0, absActive: false });
  const carRef = useRef<THREE.Group | null>(null);

  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(900);
  const [slip, setSlip] = useState(0);
  const [absActive, setAbsActive] = useState(false);
  const [gear, setGear] = useState<Gear>("D");
  const [mode, setMode] = useState<CameraMode>("chase");

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

  return (
    <section className="relative h-screen bg-[#2f2927] text-white">
      <Canvas dpr={[1, 1.5]} camera={{ position: [-3.1, 1.9, -3.1], fov: 55 }} shadows>
        <color attach="background" args={["#37302d"]} />
        <fog attach="fog" args={["#37302d", 16, 78]} />
        <ambientLight intensity={0.56} />
        <directionalLight position={[5, 8, 3]} intensity={2.4} color="#f0f6ff" castShadow />
        <pointLight position={[0, 2.6, -8]} color="#6dc6ff" intensity={10} distance={22} />

        <DrivePhysics gear={gear} telemetryRef={telemetryRef} carRef={carRef} />
        <CameraRig carRef={carRef} mode={mode} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
          <planeGeometry args={[12, 112]} />
          <meshStandardMaterial color="#34302e" roughness={0.98} metalness={0.01} />
        </mesh>

        {Array.from({ length: 14 }).map((_, i) => (
          <mesh key={i} position={[0, -0.339, i * 7.6 - 49]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.22, 2.2]} />
            <meshStandardMaterial color="#e8ecef" />
          </mesh>
        ))}

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
          <p>W throttle · S brake · A/D steer</p>
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
        </div>
      </div>
    </section>
  );
}

