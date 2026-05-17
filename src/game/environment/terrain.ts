import * as THREE from 'three';

function height(x: number, z: number): number {
  // Central hill gaussian
  const hill = 8 * Math.exp(-(x * x + z * z) / 400);
  // Rolling noise from layered sines
  const noise =
    0.8 * Math.sin(x * 0.1) * Math.cos(z * 0.12) +
    0.5 * Math.sin(x * 0.05 + z * 0.07) +
    0.3 * Math.cos(x * 0.15 - z * 0.08);
  return hill + noise;
}

export function createTerrain(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.getAttribute('position');
  const vertexCount = position.count;
  const colors = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = height(x, z);
    position.setY(i, y);

    // Vertex color based on height
    let r: number, g: number, b: number;
    if (y < 2) {
      // Grass #4a7c3f
      r = 0x4a / 255;
      g = 0x7c / 255;
      b = 0x3f / 255;
    } else if (y <= 5) {
      // Dark green #2d5a27
      r = 0x2d / 255;
      g = 0x5a / 255;
      b = 0x27 / 255;
    } else {
      // Brown #8b6914
      r = 0x8b / 255;
      g = 0x69 / 255;
      b = 0x14 / 255;
    }

    // PS1 grit: random offset +/-0.05 per channel
    r += (Math.random() - 0.5) * 0.1;
    g += (Math.random() - 0.5) * 0.1;
    b += (Math.random() - 0.5) * 0.1;

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0);
  return mesh;
}

export function getHeightAt(x: number, z: number): number {
  return height(x, z);
}
