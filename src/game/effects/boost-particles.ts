import {
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
} from 'three';
import type { Group, Scene } from 'three';

export interface BoostParticles {
  tick(dt: number, carGroup: Group, heading: number, active: boolean, intensity: number): void;
  dispose(): void;
}

const HIDE_Y = -500;

interface ParticleGroup {
  count: number;
  pos: Float32Array;
  vel: Float32Array;
  life: Float32Array;
  geo: BufferGeometry;
  mat: PointsMaterial;
  pts: Points;
}

function createGroup(scene: Scene, color: number, baseSize: number, baseOpacity: number, count: number): ParticleGroup {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const life = new Float32Array(count);
  for (let i = 0; i < count; i++) pos[i * 3 + 1] = HIDE_Y;

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));

  const mat = new PointsMaterial({
    color,
    size: baseSize,
    transparent: true,
    opacity: baseOpacity,
    sizeAttenuation: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  mat.toneMapped = false;

  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);

  return { count, pos, vel, life, geo, mat, pts };
}

function spawnParticle(
  g: ParticleGroup, i: number,
  cx: number, cy: number, cz: number,
  cH: number, sH: number, pX: number, pZ: number,
  intensity: number, riseSpeed: number, backSpeed: number, sideSpread: number, lifeBase: number, lifeRange: number,
): void {
  const i3 = i * 3;
  const side = (Math.random() - 0.5) * 0.6;
  g.pos[i3]     = cx - cH * 1.8 + pX * side;
  g.pos[i3 + 1] = cy + 0.15 + Math.random() * 0.2;
  g.pos[i3 + 2] = cz - sH * 1.8 + pZ * side;

  const spd = backSpeed * (0.5 + intensity * 0.5);
  g.vel[i3]     = -cH * spd + pX * (Math.random() - 0.5) * sideSpread;
  g.vel[i3 + 1] = riseSpeed;
  g.vel[i3 + 2] = -sH * spd + pZ * (Math.random() - 0.5) * sideSpread;

  g.life[i] = lifeBase + Math.random() * lifeRange + intensity * 0.2;
}

function tickGroup(g: ParticleGroup, dt: number): void {
  for (let i = 0; i < g.count; i++) {
    const i3 = i * 3;
    if (g.life[i] > 0) {
      g.pos[i3]     += g.vel[i3] * dt;
      g.pos[i3 + 1] += g.vel[i3 + 1] * dt;
      g.pos[i3 + 2] += g.vel[i3 + 2] * dt;
      g.life[i] -= dt;
      if (g.life[i] <= 0) g.pos[i3 + 1] = HIDE_Y;
    }
  }
  g.geo.getAttribute('position').needsUpdate = true;
}

export function createBoostParticles(scene: Scene): BoostParticles {
  // 4 separate groups with distinct colors — no vertex color complexity
  const white  = createGroup(scene, 0xffffff, 1.2, 0.95, 15);  // white-hot core
  const yellow = createGroup(scene, 0xffdd00, 1.0, 0.9, 20);   // yellow flames
  const orange = createGroup(scene, 0xff5500, 0.9, 0.85, 25);  // orange flames
  const smoke  = createGroup(scene, 0x444444, 2.0, 0.5, 30);   // dark smoke

  const groups = [white, yellow, orange, smoke];

  function tick(dt: number, car: Group, heading: number, active: boolean, intensity: number): void {
    const cH = Math.cos(heading);
    const sH = Math.sin(heading);
    const pX = -sH;
    const pZ = cH;
    const cx = car.position.x;
    const cy = car.position.y;
    const cz = car.position.z;

    // Scale sizes with intensity
    white.mat.size  = 0.8 + intensity * 0.6;
    yellow.mat.size = 0.7 + intensity * 0.5;
    orange.mat.size = 0.6 + intensity * 0.5;
    smoke.mat.size  = 1.5 + intensity * 1.0;
    smoke.mat.opacity = 0.3 + intensity * 0.3;

    // Spawn dead particles when active
    if (active) {
      for (const g of groups) {
        for (let i = 0; i < g.count; i++) {
          if (g.life[i] <= 0) {
            if (g === smoke) {
              // Smoke: slower, rises more, longer life
              spawnParticle(g, i, cx, cy, cz, cH, sH, pX, pZ, intensity,
                0.8 + Math.random() * 1.2, // rise
                1 + Math.random() * 1.5,   // back
                1.5,                        // side spread
                0.6, 0.8);                  // life
            } else if (g === white) {
              // White: tight, fast, short life (hot core)
              spawnParticle(g, i, cx, cy, cz, cH, sH, pX, pZ, intensity,
                0.1 + Math.random() * 0.3,
                4 + Math.random() * 2,
                1.5,
                0.15, 0.2);
            } else {
              // Yellow/orange: moderate
              spawnParticle(g, i, cx, cy, cz, cH, sH, pX, pZ, intensity,
                0.2 + Math.random() * 0.5,
                3 + Math.random() * 2,
                2.0,
                0.3, 0.4);
            }
          }
        }
      }
    }

    // Tick all groups
    for (const g of groups) tickGroup(g, dt);
  }

  function dispose(): void {
    for (const g of groups) {
      scene.remove(g.pts);
      g.geo.dispose();
      g.mat.dispose();
    }
  }

  return { tick, dispose };
}
