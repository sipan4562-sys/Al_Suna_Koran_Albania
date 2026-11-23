// Materialbibliothek + Shader-Patch, der Punktlichter auf ihren Raum begrenzt
// (verhindert, dass Deckenlampen durch Wände in Nachbarräume leuchten).
import * as THREE from 'three';
import { TEX, DECAL } from './textures.js';

export const regionUniforms = {
  tlnRegionTex: { value: null },
  tlnGrid: { value: new THREE.Vector2(1, 1) },
  tlnLightRegion: { value: new Array(16).fill(255) },
};

const lightsChunk = THREE.ShaderChunk.lights_fragment_begin.replace(
  'getPointLightInfo( pointLight, geometryPosition, directLight );',
  'getPointLightInfo( pointLight, geometryPosition, directLight );\n\t\tdirectLight.color *= tlnMask( tlnLightRegion[ i ] );',
);

export function patchRegion(material) {
  if (material.userData.tlnPatched) return material;
  material.userData.tlnPatched = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.tlnRegionTex = regionUniforms.tlnRegionTex;
    shader.uniforms.tlnGrid = regionUniforms.tlnGrid;
    shader.uniforms.tlnLightRegion = regionUniforms.tlnLightRegion;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTlnWorld;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 tlnWP = vec4( transformed, 1.0 );
        #ifdef USE_BATCHING
          tlnWP = batchingMatrix * tlnWP;
        #endif
        #ifdef USE_INSTANCING
          tlnWP = instanceMatrix * tlnWP;
        #endif
        vTlnWorld = ( modelMatrix * tlnWP ).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTlnWorld;
        uniform sampler2D tlnRegionTex;
        uniform vec2 tlnGrid;
        #if NUM_POINT_LIGHTS > 0
        uniform float tlnLightRegion[ NUM_POINT_LIGHTS ];
        #endif
        float tlnFragRegion = 255.0;
        float tlnMask( float lr ) {
          return ( tlnFragRegion > 254.5 || lr > 254.5 || abs( tlnFragRegion - lr ) < 0.5 ) ? 1.0 : 0.0;
        }`,
      )
      .replace(
        '#include <lights_fragment_begin>',
        `
        #ifndef FLAT_SHADED
        {
          vec3 tlnN = normalize( ( vec4( vNormal, 0.0 ) * viewMatrix ).xyz );
          vec2 tlnP = vTlnWorld.xz + tlnN.xz * 0.3;
          tlnFragRegion = texture2D( tlnRegionTex, ( floor( tlnP ) + 0.5 ) / tlnGrid ).r * 255.0;
        }
        #endif
        ${lightsChunk}`,
      );
  };
  // Eindeutiger Cache-Key, damit Three das gepatchte Programm nicht mit dem Original teilt.
  material.customProgramCacheKey = () => 'tln-region';
  return material;
}

export const MAT = {};

function std(name, opts = {}) {
  const t = TEX[name];
  const m = new THREE.MeshStandardMaterial({
    map: t.map,
    normalMap: t.normalMap,
    roughnessMap: t.roughnessMap,
    metalnessMap: opts.metal ? t.roughnessMap : null,
    roughness: opts.roughness ?? 1,
    metalness: opts.metal ? opts.metalness ?? 1 : 0,
    color: opts.color ?? 0xffffff,
    normalScale: new THREE.Vector2(opts.ns ?? 1, opts.ns ?? 1),
    side: opts.side ?? THREE.FrontSide,
  });
  m.name = opts.label || name;
  return patchRegion(m);
}

export function buildMaterials() {
  // Architektur
  MAT.linoleum = std('linoleum');
  MAT.linoleumDark = std('linoleumDark');
  MAT.tileWorn = std('tileWorn');
  MAT.marble = std('marble');
  MAT.wood = std('wood');
  MAT.woodOld = std('woodOld');
  MAT.whiteTile = std('whiteTile');
  MAT.whiteTileWall = std('whiteTileWall');
  MAT.hospitalWall = std('hospitalWall');
  MAT.patientWall = std('patientWall');
  MAT.lobbyWall = std('lobbyWall');
  MAT.wallpaper = std('wallpaper');
  MAT.wallpaperRed = std('wallpaperRed');
  MAT.ceilingTiles = std('ceilingTiles');
  MAT.plaster = std('plaster');
  MAT.concrete = std('concrete');
  MAT.concreteWall = std('concreteWall');
  MAT.concreteWet = std('concreteWet');
  MAT.padded = std('padded');
  MAT.grate = std('grate', { metal: true });
  MAT.stoneWall = std('stoneWall');

  // Requisiten
  MAT.locker = std('metalLocker', { metal: true });
  MAT.metalPaint = std('metalPaint', { metal: true });
  MAT.metalWhite = std('metalWhite', { metal: true });
  MAT.steel = std('metalBare', { metal: true });
  MAT.rust = std('rust', { metal: true });
  MAT.mattress = std('mattress');
  MAT.sheet = std('sheet');
  MAT.cloth = std('cloth');
  MAT.deskWood = std('wood', { color: 0x9a8070, label: 'deskWood' });
  MAT.darkWood = std('woodOld', { color: 0x806a5a, label: 'darkWood' });
  MAT.doorPaint = std('metalPaint', { metal: true, color: 0xb8c2b4, label: 'doorPaint' });
  MAT.frame = std('metalPaint', { metal: true, color: 0x8a8a80, label: 'frame' });
  MAT.skin = std('skin', { ns: 1.6, color: 0x9a8f86 });

  MAT.black = patchRegion(new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 }));
  MAT.rubber = patchRegion(new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.85 }));
  MAT.plastic = patchRegion(new THREE.MeshStandardMaterial({ color: 0x7c776c, roughness: 0.6 }));
  MAT.porcelain = patchRegion(new THREE.MeshStandardMaterial({ color: 0xc8c6bc, roughness: 0.25 }));
  MAT.glass = new THREE.MeshStandardMaterial({
    color: 0x9fb4b0,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  MAT.bottle = patchRegion(
    new THREE.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.75 }),
  );
  MAT.paper = new THREE.MeshStandardMaterial({ map: DECAL.paper[0], roughness: 0.95 });
  patchRegion(MAT.paper);
  MAT.teeth = new THREE.MeshStandardMaterial({ color: 0x9a8e70, roughness: 0.4 });
  MAT.mouth = new THREE.MeshStandardMaterial({ color: 0x1a0505, roughness: 0.6 });
  MAT.lampHousing = std('metalWhite', { metal: true, color: 0xa0a098, label: 'lampHousing' });
  MAT.copper = patchRegion(new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.4, metalness: 0.9 }));
  MAT.yellow = patchRegion(new THREE.MeshStandardMaterial({ color: 0x8a6a10, roughness: 0.5, metalness: 0.2 }));
  MAT.redPaint = patchRegion(new THREE.MeshStandardMaterial({ color: 0x5a0e0a, roughness: 0.6, metalness: 0.3 }));
  MAT.gold = patchRegion(new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.3, metalness: 1 }));
  MAT.ivory = patchRegion(new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 0.5 }));
  MAT.wax = patchRegion(new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 }));
  MAT.altarCloth = std('sheet', { color: 0xf0ece0, label: 'altarCloth' });
  MAT.velvet = patchRegion(new THREE.MeshStandardMaterial({ color: 0x3a0a10, roughness: 0.95 }));
  MAT.statue = patchRegion(new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.7 }));
  MAT.statueBlue = patchRegion(new THREE.MeshStandardMaterial({ color: 0x3a5280, roughness: 0.75 }));
  return MAT;
}

// Emissive Materialien (z.B. Leuchtröhren) — pro Lampe eigenes Material für Flackern.
export function emissiveMaterial(color, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.5,
  });
}

// Decal-Material (Blut, Schrift): transparent, polygonOffset gegen Z-Fighting.
export function decalMaterial(tex, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    roughness: opts.roughness ?? 0.35,
    metalness: 0,
    color: opts.color ?? 0xffffff,
    alphaTest: 0.02,
  });
  return patchRegion(m);
}
