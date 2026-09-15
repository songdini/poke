// 🎨 DUBU RPG - High-Precision Vector / Procedural Map Renderer
// 100% code-based vector tiles ensuring 1:1 match between visuals & collision/interactions

import type { MapData } from '../types/dubuRpg';

const TILE_SIZE = 52;

// 🌟 Helper: Draw Rounded Rectangle
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

// ============================================================================
// 🏠 1. HOME MAP: 두부의 포근한 방 (Dubu's Cozy Room, 14x10)
// ============================================================================
function renderHomeMap(ctx: CanvasRenderingContext2D, map: MapData, frame: number) {
  const w = map.width;
  const h = map.height;

  // 1-1. Wooden Floorboards (따뜻한 원목 마루 타일)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = map.tiles[y][x];

      if (tile === 1 && y <= 1) {
        // Upper Wall Molding & Wallpaper (크림색 벽지와 원목 몰딩)
        ctx.fillStyle = '#f8f1e5';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Wall top crown molding
        ctx.fillStyle = '#d7b98d';
        ctx.fillRect(px, py, TILE_SIZE, 8);
        ctx.fillStyle = '#bfa074';
        ctx.fillRect(px, py + 8, TILE_SIZE, 3);

        // Wallpaper soft vertical stripes
        ctx.fillStyle = 'rgba(235, 222, 204, 0.45)';
        for (let i = 8; i < TILE_SIZE; i += 13) {
          ctx.fillRect(px + i, py + 11, 4, TILE_SIZE - 11);
        }

        // Wall baseboard molding (걸레받이)
        if (y === 1) {
          ctx.fillStyle = '#a27b4c';
          ctx.fillRect(px, py + TILE_SIZE - 10, TILE_SIZE, 10);
          ctx.fillStyle = '#784e24';
          ctx.fillRect(px, py + TILE_SIZE - 3, TILE_SIZE, 3);
        }
      } else if (tile === 1) {
        // Side wall or boundary
        ctx.fillStyle = '#c8a87b';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#8f6434';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      } else {
        // Parquet Wood Planks (마루바닥)
        const toneIndex = (x * 3 + y * 7) % 3;
        const plankColors = ['#f5deb3', '#faebd7', '#ecd4a4'];
        ctx.fillStyle = plankColors[toneIndex];
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Plank seams & wood grain lines
        ctx.strokeStyle = '#d4b483';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Horizontal plank borders (each tile divided into 2 planks)
        ctx.moveTo(px, py + TILE_SIZE / 2);
        ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
        ctx.moveTo(px, py + TILE_SIZE);
        ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
        // Vertical stagger line
        const staggerX = (y % 2 === 0) ? px + 26 : px + 12;
        ctx.moveTo(staggerX, py);
        ctx.lineTo(staggerX, py + TILE_SIZE / 2);
        ctx.stroke();

        // Subtle nail dots
        ctx.fillStyle = '#b89462';
        ctx.fillRect(staggerX - 1, py + 3, 2, 2);
        ctx.fillRect(staggerX - 1, py + TILE_SIZE / 2 - 4, 2, 2);
      }
    }
  }

  // 1-2. Sunny Windows on the Wall (y: 0~1, x: 4, x: 8)
  const windowPositions = [4, 8];
  windowPositions.forEach(wx => {
    const wpx = wx * TILE_SIZE;
    const wpy = 6;
    // Window frame
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    drawRoundRect(ctx, wpx + 4, wpy, TILE_SIZE - 8, 54, 8);
    ctx.fill();
    ctx.strokeStyle = '#bfa074';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sky glass
    const skyGrad = ctx.createLinearGradient(wpx, wpy, wpx, wpy + 50);
    skyGrad.addColorStop(0, '#93c5fd');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.beginPath();
    drawRoundRect(ctx, wpx + 8, wpy + 4, TILE_SIZE - 16, 46, 5);
    ctx.fill();

    // Sun reflection glint (softly animated shimmer)
    const glintBob = Math.sin(frame * 0.05 + wx) * 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wpx + 12 + glintBob, wpy + 10);
    ctx.lineTo(wpx + 24 + glintBob, wpy + 40);
    ctx.moveTo(wpx + 28 + glintBob, wpy + 10);
    ctx.lineTo(wpx + 36 + glintBob, wpy + 30);
    ctx.stroke();

    // Wooden sill with flower pot
    ctx.fillStyle = '#b45309';
    ctx.fillRect(wpx + 2, wpy + 52, TILE_SIZE - 4, 6);
    // Tiny plant
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    drawRoundRect(ctx, wpx + 18, wpy + 43, 14, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(wpx + 22, wpy + 40, 5, 0, Math.PI * 2);
    ctx.arc(wpx + 28, wpy + 40, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 1-3. Cozy Central Pastel Rug (x: 5~8, y: 4~6)
  const rugX = 5.2 * TILE_SIZE;
  const rugY = 4.2 * TILE_SIZE;
  const rugW = 3.6 * TILE_SIZE;
  const rugH = 2.6 * TILE_SIZE;
  ctx.save();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.ellipse(rugX + rugW / 2, rugY + rugH / 2, rugW / 2, rugH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Inner ring
  ctx.strokeStyle = '#fbcfe8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(rugX + rugW / 2, rugY + rugH / 2, rugW / 2 - 14, rugH / 2 - 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Cute Paw print in rug center
  ctx.fillStyle = '#f472b6';
  const rcx = rugX + rugW / 2;
  const rcy = rugY + rugH / 2;
  ctx.beginPath();
  ctx.ellipse(rcx, rcy + 4, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rcx - 9, rcy - 7, 4, 0, Math.PI * 2);
  ctx.arc(rcx - 3, rcy - 12, 4.5, 0, Math.PI * 2);
  ctx.arc(rcx + 3, rcy - 12, 4.5, 0, Math.PI * 2);
  ctx.arc(rcx + 9, rcy - 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 1-4. Dubu's Cushion Bed (dubu1.jpg Style - x: 10, y: 3)
  const bedPx = 10 * TILE_SIZE;
  const bedPy = 3 * TILE_SIZE;
  // Bed outer grey melange rim
  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.ellipse(bedPx + 26, bedPy + 30, 32, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(bedPx + 26, bedPy + 28, 28, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner soft white cushion fluff
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.ellipse(bedPx + 26, bedPy + 28, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brown Teddy Bear Doll (곰인형)
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(bedPx + 16, bedPy + 25, 7, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bedPx + 12, bedPy + 20, 3, 0, Math.PI * 2); // left ear
  ctx.arc(bedPx + 20, bedPy + 20, 3, 0, Math.PI * 2); // right ear
  ctx.fill();
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(bedPx + 16, bedPy + 33, 8, 6, 0, 0, Math.PI * 2); // body
  ctx.fill();

  // Pink Bunny Plushie (핑크 토끼 인형)
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.arc(bedPx + 34, bedPy + 25, 6, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bedPx + 32, bedPy + 16, 2.5, 6, -0.2, 0, Math.PI * 2); // left ear
  ctx.ellipse(bedPx + 37, bedPy + 16, 2.5, 6, 0.2, 0, Math.PI * 2); // right ear
  ctx.fill();
  ctx.restore();

  // 1-5. Food & Water Bowls (x: 2, 3, y: 2)
  // Food Bowl (Yellow ceramic with dog food kibble)
  const foodPx = 2 * TILE_SIZE;
  const foodPy = 2 * TILE_SIZE;
  ctx.save();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(foodPx + 26, foodPy + 30, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Kibble dots
  ctx.fillStyle = '#78350f';
  for (let i = 0; i < 7; i++) {
    const kx = foodPx + 18 + (i % 3) * 6;
    const ky = foodPy + 26 + Math.floor(i / 3) * 4;
    ctx.beginPath();
    ctx.arc(kx, ky, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Water Bowl (Sky blue ceramic with sparkling fresh water)
  const waterPx = 3 * TILE_SIZE;
  const waterPy = 2 * TILE_SIZE;
  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(waterPx + 26, waterPy + 30, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Water ripple highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(waterPx + 24, waterPy + 28, 9, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 1-6. Butler's Desk & Laptop (x: 10, y: 5)
  const deskPx = 10 * TILE_SIZE;
  const deskPy = 5 * TILE_SIZE;
  ctx.save();
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  drawRoundRect(ctx, deskPx + 4, deskPy + 16, 44, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.fillRect(deskPx + 6, deskPy + 18, 40, 24);
  // Laptop
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(deskPx + 14, deskPy + 22, 18, 12);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(deskPx + 16, deskPy + 24, 14, 8); // glowing screen
  // Cute Coffee mug
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.arc(deskPx + 38, deskPy + 28, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ============================================================================
// 🌿 2. GARDEN MAP: 햇살 가득 정원 (Sunny Garden, 16x12)
// ============================================================================
function renderGardenMap(ctx: CanvasRenderingContext2D, map: MapData, frame: number) {
  const w = map.width;
  const h = map.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = map.tiles[y][x];

      if (tile === 4) {
        // Cobblestone / Earth Path (디딤돌 산책로)
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Stone slabs
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        drawRoundRect(ctx, px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE / 2 - 8, 5);
        drawRoundRect(ctx, px + 10, py + TILE_SIZE / 2 + 4, TILE_SIZE - 20, TILE_SIZE / 2 - 8, 5);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (tile === 1) {
        // Garden Hedge / White Picket Fence (생울타리 & 하얀 울타리)
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Lush green hedge clump
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(px + 26, py + 26, 24, 0, Math.PI * 2);
        ctx.arc(px + 12, py + 28, 18, 0, Math.PI * 2);
        ctx.arc(px + 40, py + 28, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(px + 26, py + 22, 18, 0, Math.PI * 2);
        ctx.fill();

        // White fence picket
        ctx.fillStyle = '#f8fafc';
        for (let fx = px + 6; fx < px + TILE_SIZE; fx += 13) {
          ctx.beginPath();
          ctx.moveTo(fx, py + 34);
          ctx.lineTo(fx, py + 14);
          ctx.lineTo(fx + 4, py + 10);
          ctx.lineTo(fx + 8, py + 14);
          ctx.lineTo(fx + 8, py + 34);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillRect(px + 2, py + 22, TILE_SIZE - 4, 3);
      } else if (tile === 3) {
        // Blooming Flower Beds (알록달록 화단)
        ctx.fillStyle = '#86efac';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Flowers
        const flowerColors = ['#f43f5e', '#fbbf24', '#c084fc', '#38bdf8'];
        for (let i = 0; i < 4; i++) {
          const fx = px + 12 + (i % 2) * 26;
          const fy = py + 14 + Math.floor(i / 2) * 24;
          const bob = Math.sin(frame * 0.05 + x + y + i) * 1.5;
          ctx.fillStyle = flowerColors[(x + y + i) % 4];
          ctx.beginPath();
          ctx.arc(fx, fy + bob, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(fx, fy + bob, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Gentle Two-Tone Grass (잔디밭)
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#86efac' : '#4ade80';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Little grass blades
        ctx.fillStyle = isLight ? '#22c55e' : '#16a34a';
        ctx.beginPath();
        ctx.moveTo(px + 14, py + 36);
        ctx.lineTo(px + 16, py + 28);
        ctx.lineTo(px + 18, py + 36);
        ctx.moveTo(px + 36, py + 20);
        ctx.lineTo(px + 38, py + 12);
        ctx.lineTo(px + 40, py + 20);
        ctx.fill();
      }
    }
  }

  // Garden Red Mailbox (x: 10, y: 2)
  const mbPx = 10 * TILE_SIZE;
  const mbPy = 2 * TILE_SIZE;
  ctx.save();
  // Post
  ctx.fillStyle = '#78350f';
  ctx.fillRect(mbPx + 23, mbPy + 24, 6, 22);
  // Red box
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  drawRoundRect(ctx, mbPx + 14, mbPy + 10, 24, 18, 5);
  ctx.fill();
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Yellow flag
  ctx.fillStyle = '#eab308';
  ctx.fillRect(mbPx + 36, mbPy + 12, 4, 8);
  ctx.fillRect(mbPx + 32, mbPy + 12, 6, 4);
  ctx.restore();

  // Garden Secret Dig Spot (x: 3, y: 3)
  const digPx = 3 * TILE_SIZE;
  const digPy = 3 * TILE_SIZE;
  ctx.save();
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(digPx + 26, digPy + 32, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(digPx + 26, digPy + 29, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sparkling glow over dirt
  const dGlow = Math.sin(frame * 0.08) * 3;
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(digPx + 26, digPy + 28, 14 + dGlow, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ============================================================================
// 🏘️ 3. VILLAGE MAP: 꽃바람 마을 광장 (Flower Breeze Village Square, 22x16)
// ============================================================================
function renderVillageMap(ctx: CanvasRenderingContext2D, map: MapData, frame: number) {
  const w = map.width;
  const h = map.height;

  // 3-1. Base Cobblestone & Roads
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = map.tiles[y][x];

      if (tile === 4) {
        // Main Paved Road (넓은 마을 광장 도로)
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      } else if (tile === 2) {
        // Fountain Water Area (타일 2: 분수대 물줄기 & 수조)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Water ripples
        const wave = Math.sin(frame * 0.08 + x + y) * 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 26 + wave);
        ctx.quadraticCurveTo(px + 26, py + 20 + wave, px + 44, py + 26 + wave);
        ctx.stroke();
      } else if (tile === 1) {
        // Village Buildings / Brick Walls / Flower Planters (타일 1: 건물 외벽)
        ctx.fillStyle = '#f87171'; // Red brick/terracotta roof
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Roof shingles
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        for (let sh = 0; sh < TILE_SIZE; sh += 13) {
          ctx.beginPath();
          ctx.moveTo(px, py + sh);
          ctx.lineTo(px + TILE_SIZE, py + sh);
          ctx.stroke();
        }
      } else {
        // Village Plaza Cobblestone (광장 바닥)
        const isAlt = (x + y) % 2 === 0;
        ctx.fillStyle = isAlt ? '#e2e8f0' : '#cbd5e1';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
  }

  // 3-2. Grand Marble Fountain (마을 중앙 분수대 - x: 10, y: 6~7 부근)
  const fPx = 9.8 * TILE_SIZE;
  const fPy = 6 * TILE_SIZE;
  ctx.save();
  // Outer Marble Basin
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.arc(fPx + 26, fPy + 32, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Water Basin
  const fGrad = ctx.createRadialGradient(fPx + 26, fPy + 32, 5, fPx + 26, fPy + 32, 40);
  fGrad.addColorStop(0, '#7dd3fc');
  fGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = fGrad;
  ctx.beginPath();
  ctx.arc(fPx + 26, fPy + 32, 40, 0, Math.PI * 2);
  ctx.fill();

  // Center Pillar
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(fPx + 26, fPy + 28, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Water Spray Jets
  for (let a = 0; a < 6; a++) {
    const ang = a * (Math.PI / 3) + frame * 0.04;
    const jetLen = 22 + Math.sin(frame * 0.15 + a) * 5;
    const jx = fPx + 26 + Math.cos(ang) * jetLen;
    const jy = fPy + 28 + Math.sin(ang) * (jetLen * 0.75);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(jx, jy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3-3. Grandma Soonja's Rest Bench & Teapot (x: 7, y: 3 - 순자 할머니 쉼터)
  const gPx = 7 * TILE_SIZE;
  const gPy = 3 * TILE_SIZE;
  ctx.save();
  // Cozy Wooden Bench
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  drawRoundRect(ctx, gPx + 4, gPy + 26, 44, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#b45309';
  ctx.fillRect(gPx + 6, gPy + 28, 40, 6);
  ctx.fillRect(gPx + 6, gPy + 36, 40, 6);
  // Warm Teapot on side table
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(gPx + 42, gPy + 20, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3-4. Giant Sweet Potato Basket & Cauldron (x: 14, y: 3 - 특대 꿀고구마 바구니 & 가마솥)
  const pPx = 14 * TILE_SIZE;
  const pPy = 3 * TILE_SIZE;
  ctx.save();
  // Stone hearth
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(pPx + 26, pPy + 34, 22, 0, Math.PI * 2);
  ctx.fill();
  // Iron Cauldron
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(pPx + 26, pPy + 30, 18, 0, Math.PI * 2);
  ctx.fill();

  // Woven Wicker Basket with Steaming Sweet Potatoes
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  drawRoundRect(ctx, pPx + 6, pPy + 14, 40, 26, 8);
  ctx.fill();
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Heap of golden baked sweet potatoes
  ctx.fillStyle = '#b91c1c'; // Red purple sweet potato skin
  ctx.beginPath();
  ctx.ellipse(pPx + 16, pPy + 16, 9, 6, -0.3, 0, Math.PI * 2);
  ctx.ellipse(pPx + 26, pPy + 12, 10, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(pPx + 36, pPy + 16, 9, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Steaming Honey Gold Inside
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(pPx + 26, pPy + 12, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rising Steam Animation
  for (let s = 0; s < 3; s++) {
    const steamY = pPy + 6 - ((frame * 0.4 + s * 14) % 24);
    const steamX = pPx + 20 + s * 7 + Math.sin(frame * 0.1 + s) * 3;
    const steamAlpha = Math.max(0, 1 - (pPy + 6 - steamY) / 24);
    ctx.fillStyle = `rgba(255, 255, 255, ${steamAlpha * 0.75})`;
    ctx.beginPath();
    ctx.arc(steamX, steamY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================================
// 🌲 4. FOREST MAP: 솔바람 숲 오솔길 (Whispering Forest, 22x16)
// ============================================================================
function renderForestMap(ctx: CanvasRenderingContext2D, map: MapData, frame: number) {
  const w = map.width;
  const h = map.height;

  // 4-1. Forest Floor, Trees, Stream & Bridge
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = map.tiles[y][x];

      if (tile === 2) {
        // Sparkling Forest Creek (타일 2: 맑은 숲속 개울물)
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Flowing water animated waves
        const flow = Math.sin(frame * 0.08 + y * 0.6) * 3;
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 18 + flow);
        ctx.quadraticCurveTo(px + 26, py + 12 + flow, px + 48, py + 18 + flow);
        ctx.moveTo(px + 4, py + 36 + flow);
        ctx.quadraticCurveTo(px + 26, py + 30 + flow, px + 48, py + 36 + flow);
        ctx.stroke();
      } else if (tile === 4) {
        if (x >= 8 && x <= 13 && y >= 3 && y <= 11) {
          // Wooden Log Bridge over the creek (통나무 다리)
          ctx.fillStyle = '#92400e';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Wooden Planks
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          for (let p = 0; p < TILE_SIZE; p += 13) {
            ctx.strokeRect(px + 1, py + p, TILE_SIZE - 2, 12);
          }
          // Log Railing
          if (x === 8 || x === 13) {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(px + (x === 8 ? 2 : TILE_SIZE - 8), py, 6, TILE_SIZE);
          }
        } else {
          // Forest Dirt Trail (흙길)
          ctx.fillStyle = '#d97706';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.arc(px + 14, py + 16, 3, 0, Math.PI * 2);
          ctx.arc(px + 36, py + 32, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile === 1) {
        // Deep Pine & Oak Trees (울창한 피톤치드 숲 나무)
        ctx.fillStyle = '#14532d';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Tree foliage canopy
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(px + 26, py + 26, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(px + 24, py + 20, 18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Forest Mossy Grass (피톤치드 이끼풀 바닥)
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? '#15803d' : '#16a34a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Fallen leaves
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(px + 20, py + 24, 4, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 🌿 4-2. ENCHANTED SILVER CATNIP BUSH (x: 6, y: 4) - 캣닢 위치 강조 & 아우라
  const cnPx = 6 * TILE_SIZE;
  const cnPy = 4 * TILE_SIZE;
  ctx.save();
  // Pulsing Mint Glow Aura
  const catnipPulse = Math.sin(frame * 0.08) * 6;
  const catnipAura = ctx.createRadialGradient(
    cnPx + 26, cnPy + 26, 6,
    cnPx + 26, cnPy + 26, 32 + catnipPulse
  );
  catnipAura.addColorStop(0, 'rgba(52, 211, 153, 0.7)');
  catnipAura.addColorStop(0.6, 'rgba(16, 185, 129, 0.3)');
  catnipAura.addColorStop(1, 'rgba(5, 150, 105, 0)');
  ctx.fillStyle = catnipAura;
  ctx.beginPath();
  ctx.arc(cnPx + 26, cnPy + 26, 34 + catnipPulse, 0, Math.PI * 2);
  ctx.fill();

  // Catnip Plant Leaves (은빛 캣닢 줄기와 잎사귀)
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.arc(cnPx + 26, cnPy + 30, 16, 0, Math.PI * 2);
  ctx.arc(cnPx + 16, cnPy + 26, 12, 0, Math.PI * 2);
  ctx.arc(cnPx + 36, cnPy + 26, 12, 0, Math.PI * 2);
  ctx.fill();
  // Silver mint highlights
  ctx.fillStyle = '#a7f3d0';
  ctx.beginPath();
  ctx.arc(cnPx + 26, cnPy + 22, 10, 0, Math.PI * 2);
  ctx.arc(cnPx + 20, cnPy + 16, 7, 0, Math.PI * 2);
  ctx.arc(cnPx + 32, cnPy + 16, 7, 0, Math.PI * 2);
  ctx.fill();

  // Floating Mint Aroma Wave & Sparkles (피어오르는 향기 물결)
  for (let i = 0; i < 4; i++) {
    const aY = cnPy + 12 - ((frame * 0.5 + i * 16) % 36);
    const aX = cnPx + 26 + Math.sin(frame * 0.08 + i * 1.5) * 14;
    const alpha = Math.max(0, 1 - (cnPy + 12 - aY) / 36);
    ctx.fillStyle = `rgba(167, 243, 208, ${alpha})`;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨', aX, aY);
  }

  // Cute floating badge: [🌿 은빛 캣닢]
  const badgeBob = Math.sin(frame * 0.1) * 3;
  const badgeY = cnPy - 12 + badgeBob;
  ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
  ctx.beginPath();
  drawRoundRect(ctx, cnPx - 2, badgeY, 56, 18, 9);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ecfdf5';
  ctx.font = 'bold 11px Pretendard, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌿 은빛 캣닢', cnPx + 26, badgeY + 13);
  ctx.restore();

  // 4-3. Barney's Lost Letter Bag (x: 18, y: 4 - 바니의 편지 가방)
  const lPx = 18 * TILE_SIZE;
  const lPy = 4 * TILE_SIZE;
  ctx.save();
  // Oak Tree Stump
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(lPx + 26, lPy + 32, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(lPx + 26, lPy + 30, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Leather Mail Bag
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  drawRoundRect(ctx, lPx + 14, lPy + 14, 24, 18, 4);
  ctx.fill();
  ctx.strokeStyle = '#9a3412';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // White envelope letter peek
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(lPx + 18, lPy + 10, 12, 8);
  ctx.strokeStyle = '#dc2626';
  ctx.strokeRect(lPx + 18, lPy + 10, 12, 8);
  ctx.restore();
}

// ============================================================================
// 🌌 5. STARLIGHT MAP: 별빛 언덕 & 은하수 호수 (Starlight Hill & Lake, 20x15)
// ============================================================================
function renderStarlightMap(ctx: CanvasRenderingContext2D, map: MapData, frame: number) {
  const w = map.width;
  const h = map.height;

  // 5-1. Midnight Grass, Path & Milky Way Lake
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = map.tiles[y][x];

      if (tile === 2) {
        // Shimmering Milky Way Lake (은하수 호수)
        const lakeGrad = ctx.createLinearGradient(px, py, px + TILE_SIZE, py + TILE_SIZE);
        lakeGrad.addColorStop(0, '#1e1b4b'); // Deep indigo
        lakeGrad.addColorStop(0.5, '#312e81');
        lakeGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = lakeGrad;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Twinkling stars reflected in water
        const stX = px + 10 + ((x * 17 + y * 23) % 32);
        const stY = py + 8 + ((x * 29 + y * 13) % 34);
        const tw = Math.sin(frame * 0.1 + x * 2 + y) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${tw})`;
        ctx.beginPath();
        ctx.arc(stX, stY, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 4) {
        // Celestial Starlight Stone Path (별빛 오솔길)
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      } else if (tile === 1) {
        // Hill Border / Mountain Rocks
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(px + 26, py + 26, 24, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dreamy Moonlight Hilltop Grass
        const isSoft = (x + y) % 2 === 0;
        ctx.fillStyle = isSoft ? '#1e293b' : '#0f172a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Little glowing clover
        if ((x * 5 + y * 9) % 7 === 0) {
          ctx.fillStyle = '#818cf8';
          ctx.beginPath();
          ctx.arc(px + 20, py + 26, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 5-2. SACRED TREE OF WISHES (별빛 소원의 고목 - x: 10, y: 3)
  const trPx = 10 * TILE_SIZE;
  const trPy = 3 * TILE_SIZE;
  ctx.save();
  // Starlight Aura behind the Tree
  const tAura = ctx.createRadialGradient(
    trPx + 26, trPy + 16, 10,
    trPx + 26, trPy + 16, 56
  );
  tAura.addColorStop(0, 'rgba(192, 132, 252, 0.45)');
  tAura.addColorStop(0.7, 'rgba(99, 102, 241, 0.2)');
  tAura.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = tAura;
  ctx.beginPath();
  ctx.arc(trPx + 26, trPy + 16, 56, 0, Math.PI * 2);
  ctx.fill();

  // Grand Tree Trunk
  ctx.fillStyle = '#581c87';
  ctx.beginPath();
  ctx.moveTo(trPx + 16, trPy + 44);
  ctx.lineTo(trPx + 20, trPy + 20);
  ctx.lineTo(trPx + 32, trPy + 20);
  ctx.lineTo(trPx + 36, trPy + 44);
  ctx.closePath();
  ctx.fill();

  // Magical Tree Foliage with Sparkling Stars
  ctx.fillStyle = '#7e22ce';
  ctx.beginPath();
  ctx.arc(trPx + 26, trPy + 10, 28, 0, Math.PI * 2);
  ctx.arc(trPx + 10, trPy + 16, 20, 0, Math.PI * 2);
  ctx.arc(trPx + 42, trPy + 16, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a855f7';
  ctx.beginPath();
  ctx.arc(trPx + 26, trPy + 6, 20, 0, Math.PI * 2);
  ctx.fill();

  // Starlight Fruits hanging on the tree
  const starColors = ['#f43f5e', '#fbbf24', '#38bdf8', '#c084fc'];
  starColors.forEach((col, idx) => {
    const ang = idx * (Math.PI / 2) + frame * 0.03;
    const sx = trPx + 26 + Math.cos(ang) * 18;
    const sy = trPy + 10 + Math.sin(ang) * 12;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 5-3. LEGENDARY STARLIGHT GOLDEN CHEST (x: 10, y: 5 - 별빛 전설의 황금 상자)
  const chPx = 10 * TILE_SIZE;
  const chPy = 5 * TILE_SIZE;
  ctx.save();
  // Golden Aura
  const chGlow = Math.sin(frame * 0.08) * 4;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.beginPath();
  ctx.arc(chPx + 26, chPy + 26, 26 + chGlow, 0, Math.PI * 2);
  ctx.fill();

  // Chest Body
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  drawRoundRect(ctx, chPx + 8, chPy + 14, 36, 26, 6);
  ctx.fill();
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Golden Chest Trim & 4-Star Jewel Lock
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(chPx + 8, chPy + 24, 36, 4);
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(chPx + 26, chPy + 26, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 5-4. Lake Water Reed (x: 14, y: 10 - 은하수 호숫가 수초)
  const lkPx = 14 * TILE_SIZE;
  const lkPy = 10 * TILE_SIZE;
  ctx.save();
  // Water Lily Pad
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.ellipse(lkPx + 26, lkPy + 28, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Violet Star Shimmer
  ctx.fillStyle = '#c084fc';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌟', lkPx + 26, lkPy + 26);
  ctx.restore();
}

// ============================================================================
// 🚀 MASTER EXPORT: renderCodeMap
// ============================================================================
export function renderCodeMap(
  ctx: CanvasRenderingContext2D,
  mapId: string,
  mapData: MapData,
  frame: number
) {
  if (mapId === 'home') {
    renderHomeMap(ctx, mapData, frame);
  } else if (mapId === 'garden') {
    renderGardenMap(ctx, mapData, frame);
  } else if (mapId === 'village') {
    renderVillageMap(ctx, mapData, frame);
  } else if (mapId === 'forest') {
    renderForestMap(ctx, mapData, frame);
  } else if (mapId === 'rainbow_hill') {
    renderStarlightMap(ctx, mapData, frame);
  } else {
    // Default fallback
    renderGardenMap(ctx, mapData, frame);
  }
}
