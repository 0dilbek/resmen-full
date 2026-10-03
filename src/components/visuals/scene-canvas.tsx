"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";

export function SoftLightRig() {
  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 5, 5]} intensity={3} />
      <directionalLight position={[-4, 0, 2]} color="#9fc4b5" intensity={1.4} />
    </>
  );
}
export function FloatingPlate() {
  return (
    <group rotation={[0.8, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.88, 0.8, 0.1, 48]} />
        <meshStandardMaterial color="#f4ebd8" roughness={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
        <torusGeometry args={[0.71, 0.06, 12, 48]} />
        <meshStandardMaterial color="#d2b27a" />
      </mesh>
      <mesh position={[0, 0.15, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.47, 24, 16]} />
        <meshStandardMaterial color="#c98338" roughness={0.8} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          position={[i * 0.22, 0.35, 0.03]}
          rotation={[0, 0, i]}
          scale={[1, 0.3, 0.55]}
        >
          <sphereGeometry args={[0.15, 12, 8]} />
          <meshStandardMaterial color="#467353" />
        </mesh>
      ))}
    </group>
  );
}
export function FloatingCup() {
  return (
    <group rotation={[0.4, 0, 0.15]}>
      <mesh>
        <cylinderGeometry args={[0.4, 0.3, 0.65, 32]} />
        <meshStandardMaterial color="#e4d2b0" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 32]} />
        <meshStandardMaterial color="#503329" />
      </mesh>
      <mesh position={[0.4, 0, 0]}>
        <torusGeometry args={[0.22, 0.06, 12, 24]} />
        <meshStandardMaterial color="#e4d2b0" />
      </mesh>
    </group>
  );
}
function phoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 768;
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.fillStyle = "#f7f1e4";
  c.fillRect(0, 0, 384, 768);
  c.fillStyle = "#244b3d";
  c.fillRect(0, 0, 384, 240);
  c.fillStyle = "#f7f1e4";
  c.font = "32px Georgia";
  c.fillText("NAVRO‘Z", 32, 95);
  c.font = "18px Arial";
  c.fillText("Seasonal menu", 32, 140);
  ["Plov", "Manti", "Somsa"].forEach((name, i) => {
    const y = 295 + i * 137;
    c.fillStyle = "#ddc399";
    c.beginPath();
    c.arc(77, y + 28, 39, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#244b3d";
    c.font = "24px Georgia";
    c.fillText(name, 139, y + 20);
    c.font = "17px Arial";
    c.fillText(["48 000 UZS", "42 000 UZS", "14 000 UZS"][i], 139, y + 54);
    c.strokeStyle = "#cdc6b6";
    c.beginPath();
    c.moveTo(32, y + 86);
    c.lineTo(350, y + 86);
    c.stroke();
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
export function FloatingPhone() {
  const texture = useMemo(() => phoneTexture(), []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return (
    <group rotation={[0.05, -0.18, -0.08]}>
      <mesh>
        <boxGeometry args={[1.62, 3.2, 0.16]} />
        <meshStandardMaterial color="#1c2824" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[1.46, 2.94]} />
        <meshBasicMaterial
          map={texture}
          color={texture ? "#ffffff" : "#f7f1e4"}
        />
      </mesh>
    </group>
  );
}
export function OrbitingIngredients() {
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.cos(i) * 2.35, Math.sin(i) * 1.8, 0.2]}
          scale={i % 2 ? [0.1, 0.22, 0.08] : [0.12, 0.12, 0.12]}
          rotation={[0, 0, i]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial
            color={i % 2 ? "#648259" : "#bf643f"}
            roughness={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}
function Cutlery() {
  return (
    <group position={[1.6, -1.6, 0]} rotation={[0, 0, -0.4]}>
      {[-0.12, 0.17].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.055, 0.8, 0.035]} />
            <meshStandardMaterial
              color="#c3b69b"
              metalness={0.8}
              roughness={0.25}
            />
          </mesh>
          {i === 0 ? (
            <mesh position={[0, 0.49, 0]} scale={[0.12, 0.2, 0.04]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#c3b69b" metalness={0.8} />
            </mesh>
          ) : (
            [-0.065, 0, 0.065].map((v) => (
              <mesh key={v} position={[v, 0.5, 0]}>
                <boxGeometry args={[0.025, 0.24, 0.035]} />
                <meshStandardMaterial color="#c3b69b" metalness={0.8} />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  );
}
function Composition({ variant }: { variant: "hero" | "plate" }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock, pointer }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.elapsedTime * 0.65) * 0.055;
      ref.current.rotation.y +=
        (pointer.x * 0.055 - ref.current.rotation.y) * 0.03;
      ref.current.rotation.x +=
        (-pointer.y * 0.035 - ref.current.rotation.x) * 0.03;
    }
  });
  return (
    <group ref={ref}>
      <SoftLightRig />
      {variant === "hero" ? (
        <>
          <FloatingPhone />
          <group position={[-1.65, -1, 0.4]} scale={0.8}>
            <FloatingPlate />
          </group>
          <group position={[1.6, 1.05, 0.1]} scale={0.85}>
            <FloatingCup />
          </group>
          <Cutlery />
        </>
      ) : (
        <group scale={1.65}>
          <FloatingPlate />
        </group>
      )}
      <OrbitingIngredients />
    </group>
  );
}
export default function CanvasScene({
  variant,
  onReady,
  onFailure,
}: {
  variant: "hero" | "plate";
  onReady: () => void;
  onFailure: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.25]}
      camera={{ position: [0, 0, 7], fov: 43 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={null}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", onFailure, {
          once: true,
        });
        onReady();
      }}
    >
      <Composition variant={variant} />
    </Canvas>
  );
}
