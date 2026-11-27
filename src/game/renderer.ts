import { CARS } from './cars';
import {
  CopCar,
  EngineWorld,
  getRoadCenterX,
  LANE_CENTERS,
  Missile,
  PX_PER_METER,
  ROAD_HALF_WIDTH,
  SeaBoat,
  TrafficCar,
} from './engine';

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  width: number,
  height: number
): void {
  const p = world.player;
  const spec = CARS[world.carId];

  // Responsive scale: fit road cleanly on narrow mobile, expansive scenic view on desktop
  const minDim = Math.min(width, height);
  const baseScale = width < 640 ? width / 500 : Math.max(0.88, Math.min(1.22, minDim / 780));
  const scale = baseScale;

  // Camera shake
  const shakeX = world.shakeIntensity > 0.2 ? (Math.random() - 0.5) * world.shakeIntensity * 2 : 0;
  const shakeY = world.shakeIntensity > 0.2 ? (Math.random() - 0.5) * world.shakeIntensity * 2 : 0;

  const isMobileLayout = width < 640 || height > width * 1.15;
  const playerScreenY = isMobileLayout ? height * 0.56 : height * 0.70;
  const centerX = width * 0.5 + shakeX;

  const distMeters = Math.max(0, p.worldY / PX_PER_METER);
  const district = Math.floor(distMeters / 1500) % 3;

  // 1. Background terrain (Ocean / Beach / Vice City Dusk)
  drawDistrictBackdrop(ctx, world, width, height, district);

  // Helper to map (worldY, laneX) -> screen (sx, sy)
  const toScreenX = (worldY: number, laneX: number): number => {
    const roadCx = getRoadCenterX(worldY, world.curve);
    return centerX + (roadCx + laneX - world.cameraWorldX) * scale;
  };
  const toScreenY = (worldY: number): number => {
    return playerScreenY - (worldY - p.worldY) * scale + shakeY;
  };

  // Visible worldY span
  const worldYBottom = p.worldY - (height - playerScreenY + 220) / scale;
  const worldYTop = p.worldY + (playerScreenY + 260) / scale;
  const stepY = 48;
  const startY = Math.floor(worldYBottom / stepY) * stepY;

  // 2. Scenery flanking road (Palms, Art Deco Hotels, Boat wakes, Streetlamps)
  drawSceneryAndRoad(
    ctx,
    world,
    district,
    startY,
    worldYTop,
    stepY,
    scale,
    toScreenX,
    toScreenY,
    width,
    height
  );

  // 3. Skid Marks
  ctx.save();
  ctx.lineWidth = Math.max(2, 4 * scale);
  for (let i = 0; i < world.skids.length; i++) {
    const sk = world.skids[i];
    const x1 = centerX + (sk.worldX1 - world.cameraWorldX) * scale;
    const y1 = toScreenY(sk.worldY1);
    const x2 = centerX + (sk.worldX2 - world.cameraWorldX) * scale;
    const y2 = toScreenY(sk.worldY2);
    ctx.strokeStyle = `rgba(10, 12, 18, ${sk.alpha})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Hazards (Roadblocks & Spike Strips) + Upcoming Telegraphs
  for (let i = 0; i < world.hazards.length; i++) {
    const h = world.hazards[i];
    const sx = toScreenX(h.worldY, h.laneX);
    const sy = toScreenY(h.worldY);

    // Fair 1.1s top-edge lane telegraph before entering screen!
    if (sy < -10 && h.worldY > p.worldY && h.worldY < p.worldY + 1350) {
      drawHazardTelegraph(ctx, sx, h.kind, scale, world.time, isMobileLayout ? 112 : 78);
      continue;
    }

    if (sy < -100 || sy > height + 100) continue;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    if (h.kind === 'spikes') {
      // Metallic spike strip
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-42, -7, 84, 14);
      ctx.fillStyle = '#FACC15';
      for (let x = -36; x <= 36; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x - 4, 7);
        ctx.lineTo(x, -9);
        ctx.lineTo(x + 4, 7);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Concrete & striped Police Roadblock
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-46, -12, 96, 28);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-44, -14, 88, 22);
      ctx.fillStyle = '#EF4444';
      for (let x = -44; x < 44; x += 22) {
        ctx.fillRect(x, -14, 11, 22);
      }
      // Blinking amber beacons
      const blink = Math.sin(world.time * 14) > 0;
      ctx.fillStyle = blink ? '#F59E0B' : '#78350F';
      ctx.beginPath();
      ctx.arc(-36, -14, 5, 0, Math.PI * 2);
      ctx.arc(36, -14, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 6. Pickups (Cash, Boost Potion, Health Potion)
  for (let i = 0; i < world.pickups.length; i++) {
    const pk = world.pickups[i];
    const sx = toScreenX(pk.worldY, pk.laneX);
    const sy = toScreenY(pk.worldY);
    if (sy < -80 || sy > height + 80) continue;

    const bob = Math.sin(pk.bobPhase) * 3.5;
    const pulse = 0.5 + 0.5 * Math.sin(pk.bobPhase * 1.4);
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.scale(scale, scale);

    // Pulsing Glow Halo
    const glowColor =
      pk.kind === 'cash'
        ? 'rgba(52, 211, 153, 0.28)'
        : pk.kind === 'nitro'
        ? `rgba(56, 189, 248, ${0.26 + pulse * 0.16})`
        : pk.kind === 'armor'
        ? `rgba(250, 204, 21, ${0.32 + pulse * 0.22})`
        : `rgba(163, 230, 53, ${0.26 + pulse * 0.16})`;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, (pk.kind === 'armor' ? 25 : 22) + pulse * 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (pk.kind === 'cash') {
      ctx.fillStyle = '#065F46';
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2;
      roundRect(ctx, -14, -10, 28, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ECFDF5';
      ctx.font = 'bold 14px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1);
    } else if (pk.kind === 'nitro') {
      // Boost Potion Flask
      // Cork / Bottle Neck
      ctx.fillStyle = '#94A3B8';
      roundRect(ctx, -4.5, -18, 9, 4, 1.5);
      ctx.fill();
      ctx.fillStyle = '#0C4A6E';
      ctx.fillRect(-4, -14, 8, 5);

      // Potion Glass Bulb
      ctx.fillStyle = '#082F49';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 3, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Cyan Liquid
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(0, 4, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Crisp Lightning Bolt Emblem
      ctx.fillStyle = '#F0F9FF';
      ctx.beginPath();
      ctx.moveTo(1.5, -3);
      ctx.lineTo(-4.5, 4);
      ctx.lineTo(0, 4);
      ctx.lineTo(-1.5, 11);
      ctx.lineTo(4.5, 3.5);
      ctx.lineTo(0, 3.5);
      ctx.closePath();
      ctx.fill();
    } else if (pk.kind === 'armor') {
      // Beast Armor Shield Pickup
      ctx.fillStyle = '#3B0764';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(14, -10);
      ctx.lineTo(12, 4);
      ctx.quadraticCurveTo(8, 13, 0, 17);
      ctx.quadraticCurveTo(-8, 13, -12, 4);
      ctx.lineTo(-14, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner Golden Crest
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(2.5, -2.5);
      ctx.lineTo(8.5, -1.5);
      ctx.lineTo(4, 2.5);
      ctx.lineTo(5, 8.5);
      ctx.lineTo(0, 5.5);
      ctx.lineTo(-5, 8.5);
      ctx.lineTo(-4, 2.5);
      ctx.lineTo(-8.5, -1.5);
      ctx.lineTo(-2.5, -2.5);
      ctx.closePath();
      ctx.fill();
    } else {
      // Health Potion Flask
      // Cork / Bottle Neck
      ctx.fillStyle = '#CBD5E1';
      roundRect(ctx, -4.5, -18, 9, 4, 1.5);
      ctx.fill();
      ctx.fillStyle = '#14532D';
      ctx.fillRect(-4, -14, 8, 5);

      // Potion Glass Bulb
      ctx.fillStyle = '#052E16';
      ctx.strokeStyle = '#A3E635';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 3, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Emerald/Lime Potion Liquid
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.arc(0, 4, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Crisp White '+' Healing Cross
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-5.5, 1.5, 11, 4);
      ctx.fillRect(-2, -2, 4, 11);
    }
    ctx.restore();
  }

  // 7. Traffic Cars
  for (let i = 0; i < world.traffic.length; i++) {
    const t = world.traffic[i];
    const sx = toScreenX(t.worldY, t.laneX);
    const sy = toScreenY(t.worldY);
    if (sy < -140 || sy > height + 140) continue;
    drawTrafficVehicle(ctx, t, sx, sy, scale, district === 2);
  }

  // 7b. 5-Star Sea Gunboats in the Ocean
  for (let i = 0; i < world.boats.length; i++) {
    const b = world.boats[i];
    const sx = toScreenX(b.worldY, b.laneX);
    const sy = toScreenY(b.worldY);
    if (sy < -180 || sy > height + 200) continue;
    drawSeaBoat(ctx, b, sx, sy, scale, world.time, toScreenX, toScreenY);
  }

  // 8. Police & Army Vehicles
  for (let i = 0; i < world.cops.length; i++) {
    const c = world.cops[i];
    const sx = toScreenX(c.worldY, c.laneX);
    const sy = toScreenY(c.worldY);
    if (sy < -140 || sy > height + 140) continue;
    drawCopVehicle(ctx, c, sx, sy, scale, world.time, toScreenX, toScreenY);
  }

  // 9. Player Car (with Airborne jump scaling & shadow offset!)
  const px = toScreenX(p.worldY, p.laneX);
  const py = toScreenY(p.worldY);
  const airScale = 1 + (p.airZ / 130) * 0.36;
  const shadowOffset = 6 + p.airZ * 0.42;

  ctx.save();
  ctx.translate(px, py - p.airZ * 0.25 * scale);
  ctx.scale(scale, scale);

  // Drop shadow on asphalt below
  ctx.save();
  ctx.translate(shadowOffset, shadowOffset);
  ctx.rotate(p.heading);
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.18, 0.48 - p.airZ / 220)})`;
  roundRect(ctx, -18, -34, 36, 68, 9);
  ctx.fill();
  ctx.restore();

  // Player chassis
  ctx.save();
  ctx.scale(airScale, airScale);
  ctx.rotate(p.heading);

  // Headlight beams in Dusk/Expressway
  if (district >= 1) {
    const beamGrad = ctx.createLinearGradient(0, -34, 0, -180);
    beamGrad.addColorStop(0, district === 2 ? 'rgba(254, 240, 138, 0.32)' : 'rgba(254, 240, 138, 0.14)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-13, -32);
    ctx.lineTo(-42, -180);
    ctx.lineTo(42, -180);
    ctx.lineTo(13, -32);
    ctx.closePath();
    ctx.fill();
  }

  const isWreckedBlast =
    (world.blast.active || world.finished) && world.blast.reason === 'WRECKED';
  drawTopDownSportsCar(
    ctx,
    p.hitFlash > 0
      ? '#FFFFFF'
      : isWreckedBlast
      ? '#334155'
      : spec.bodyColor,
    isWreckedBlast ? '#1E293B' : spec.stripeColor,
    isWreckedBlast ? '#F97316' : spec.accentColor,
    p.boosting,
    p.drifting
  );
  ctx.restore();

  // Health & Boost Potion Car Pickup Animations
  for (let i = 0; i < p.pickupEffects.length; i++) {
    const eff = p.pickupEffects[i];
    const progress = Math.max(0, Math.min(1, eff.timer / eff.duration));
    const eased = 1 - Math.pow(1 - progress, 2.5);
    const fade = Math.max(0, 1 - progress);

    ctx.save();
    if (eff.kind === 'health') {
      // Emerald Chassis Healing Glow
      const auraGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 54);
      auraGrad.addColorStop(0, `rgba(163, 230, 53, ${fade * 0.42})`);
      auraGrad.addColorStop(0.6, `rgba(52, 211, 153, ${fade * 0.24})`);
      auraGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, Math.PI * 2);
      ctx.fill();

      // Expanding Concentric Healing Rings
      const r1 = 22 + eased * 54;
      const r2 = 14 + eased * 38;
      ctx.strokeStyle = `rgba(163, 230, 53, ${fade * 0.85})`;
      ctx.lineWidth = 3 * fade + 1;
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(52, 211, 153, ${fade * 0.65})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.stroke();

      // Rising '+' Healing Symbols around the Car
      const offsets = [-24, -10, 0, 12, 24];
      for (let k = 0; k < offsets.length; k++) {
        const ox = offsets[k] + Math.sin(progress * 8 + k) * 4;
        const oy = 18 - eased * (42 + (k % 3) * 14);
        const s = 4 + (k % 2) * 1.5;
        ctx.fillStyle = `rgba(220, 252, 231, ${fade * 0.95})`;
        ctx.fillRect(ox - s, oy - 1.5, s * 2, 3);
        ctx.fillRect(ox - 1.5, oy - s, 3, s * 2);
      }
    } else if (eff.kind === 'armor') {
      // Beast Armor Activation Shockwave
      const auraGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 72);
      auraGrad.addColorStop(0, `rgba(250, 204, 21, ${fade * 0.55})`);
      auraGrad.addColorStop(0.55, `rgba(168, 85, 247, ${fade * 0.35})`);
      auraGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 72, 0, Math.PI * 2);
      ctx.fill();

      const r1 = 24 + eased * 72;
      const r2 = 16 + eased * 50;
      ctx.strokeStyle = `rgba(250, 204, 21, ${fade * 0.95})`;
      ctx.lineWidth = 4 * fade + 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(192, 132, 252, ${fade * 0.8})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Electric Cyan Boost Aura around Car
      const auraGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 58);
      auraGrad.addColorStop(0, `rgba(56, 189, 248, ${fade * 0.45})`);
      auraGrad.addColorStop(0.6, `rgba(45, 212, 191, ${fade * 0.24})`);
      auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.fill();

      // Expanding Electric Shock Ring
      const r = 22 + eased * 60;
      ctx.strokeStyle = `rgba(56, 189, 248, ${fade * 0.9})`;
      ctx.lineWidth = 3.5 * fade + 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // Spinning Twin Energy Arcs around Chassis
      const spinAngle = progress * Math.PI * 3.2;
      const arcR = 30 + eased * 18;
      ctx.strokeStyle = `rgba(224, 242, 254, ${fade * 0.85})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, arcR, spinAngle, spinAngle + 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, arcR, spinAngle + Math.PI, spinAngle + Math.PI + 1.4);
      ctx.stroke();

      // Rising Boost Speed Bolts / Streaks
      const boltX = [-22, -11, 11, 22];
      for (let k = 0; k < boltX.length; k++) {
        const bx = boltX[k];
        const by = 22 - eased * (50 + (k % 2) * 16);
        ctx.strokeStyle = `rgba(125, 211, 252, ${fade * 0.95})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx, by + 12);
        ctx.lineTo(bx + (k % 2 === 0 ? -3 : 3), by + 4);
        ctx.lineTo(bx, by - 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Active Beast Armor Energy Shield around Car
  if (p.armorTimer > 0) {
    const expiring = p.armorTimer < 3;
    const blink = expiring ? 0.45 + 0.55 * Math.abs(Math.sin(world.time * 14)) : 1;
    const shieldPulse = Math.sin(world.time * 7) * 2.5;
    const shieldR = 45 + shieldPulse;

    ctx.save();
    ctx.globalAlpha = blink;

    const shieldGrad = ctx.createRadialGradient(0, 0, 14, 0, 0, shieldR);
    shieldGrad.addColorStop(0, 'rgba(250, 204, 21, 0.08)');
    shieldGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.16)');
    shieldGrad.addColorStop(1, 'rgba(250, 204, 21, 0.42)');
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
    ctx.fill();

    // Outer Golden Energy Ring
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating Beast Armor Arcs
    const rot = world.time * 3.8;
    ctx.strokeStyle = '#E9D5FF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, shieldR + 4, rot, rot + 1.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, shieldR + 4, rot + Math.PI, rot + Math.PI + 1.15);
    ctx.stroke();

    ctx.restore();
  }

  // Active Revive Invulnerability Shield around Car
  if (p.invulnTimer > 0 && p.armorTimer <= 0) {
    const blink = p.invulnTimer < 1.5 ? 0.4 + 0.6 * Math.abs(Math.sin(world.time * 16)) : 1;
    const pulse = Math.sin(world.time * 8) * 2;
    const r = 44 + pulse;

    ctx.save();
    ctx.globalAlpha = blink;

    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
    grad.addColorStop(0.7, 'rgba(45, 212, 191, 0.2)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.55)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating cyan accent arcs
    const rot = -world.time * 4.2;
    ctx.strokeStyle = '#67E8F9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, rot, rot + 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, rot + Math.PI, rot + Math.PI + 1.2);
    ctx.stroke();

    ctx.restore();
  }

  // Bust Meter Ring if cops pinning player
  if (p.bustMeter > 0.05) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 44, -Math.PI / 2, -Math.PI / 2 + p.bustMeter * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 10. Particles
  for (let i = 0; i < world.particles.length; i++) {
    const pt = world.particles[i];
    const sx = centerX + (pt.x - world.cameraWorldX) * scale;
    const sy = toScreenY(pt.y);
    if (sy < -40 || sy > height + 40) continue;
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(sx, sy, pt.size * scale * (pt.kind === 'smoke' ? 1.5 - alpha * 0.5 : 1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 11. Incoming Missiles, Tank Bombs, Boat Shells & Rockets
  for (let i = 0; i < world.missiles.length; i++) {
    const m = world.missiles[i];
    drawMissileAndTelegraph(ctx, m, toScreenX, toScreenY, scale, world.time);
  }

  // 11c. Overhead Pursuit Helicopter (Stars 3+)
  if (world.helicopter.active) {
    const heliY = p.worldY + world.helicopter.worldYOffset;
    const hx = toScreenX(heliY, world.helicopter.laneX);
    const hy = toScreenY(heliY);
    drawHelicopter(
      ctx,
      hx,
      hy,
      scale,
      world.helicopter.rotorAngle,
      world.score.wantedLevel >= 4,
      world.time
    );
  }

  // 12. Floating Score/Event Popups
  for (let i = 0; i < world.popups.length; i++) {
    const pop = world.popups[i];
    const sx = toScreenX(pop.worldY, pop.laneX);
    const sy = toScreenY(pop.worldY);
    const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${Math.round(18 * scale)}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#090B10';
    ctx.fillText(pop.text, sx + 1.5, sy + 1.5);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, sx, sy);
    ctx.restore();
  }

  // 13. Subtle speed lines when Nitro boosting
  if (p.boosting) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const lx = ((i * 137 + Math.floor(world.time * 60) * 19) % width);
      const ly = ((i * 211 + world.time * 1800) % height);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly + 48);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 14. Blast Explosion Shockwave & Smooth Fade Overlay
  if (world.blast.active) {
    const b = world.blast;
    const blastX = px;
    const blastY = py;

    if (b.reason === 'WRECKED') {
      const r = b.ringRadius * scale;
      const ringAlpha = Math.max(0, 1 - b.timer / 0.85);
      if (ringAlpha > 0) {
        ctx.save();
        const fireGrad = ctx.createRadialGradient(
          blastX,
          blastY,
          r * 0.08,
          blastX,
          blastY,
          Math.max(12, r)
        );
        fireGrad.addColorStop(0, `rgba(255, 255, 255, ${ringAlpha * 0.9})`);
        fireGrad.addColorStop(0.32, `rgba(253, 224, 71, ${ringAlpha * 0.72})`);
        fireGrad.addColorStop(0.68, `rgba(255, 90, 54, ${ringAlpha * 0.48})`);
        fireGrad.addColorStop(1, 'rgba(255, 90, 54, 0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(blastX, blastY, Math.max(12, r), 0, Math.PI * 2);
        ctx.fill();

        // Outer crisp shockwave ring
        ctx.strokeStyle = `rgba(253, 224, 71, ${ringAlpha * 0.85})`;
        ctx.lineWidth = Math.max(2, 5 * scale * ringAlpha);
        ctx.beginPath();
        ctx.arc(blastX, blastY, Math.max(8, r * 0.92), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (b.flashAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle =
        b.reason === 'WRECKED'
          ? `rgba(255, 240, 210, ${b.flashAlpha * 0.42})`
          : `rgba(255, 94, 126, ${b.flashAlpha * 0.25})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (b.fadeAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(11, 13, 20, ${b.fadeAlpha * 0.86})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }
}

function drawDistrictBackdrop(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  width: number,
  height: number,
  district: number
): void {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  if (district === 0) {
    // Ocean Beach Strip: warm sand right, turquoise ocean left
    grad.addColorStop(0, '#0E7490');
    grad.addColorStop(0.45, '#0F766E');
    grad.addColorStop(0.55, '#D9B99B');
    grad.addColorStop(1, '#C29B7B');
  } else if (district === 1) {
    // Keys Causeway: deep Caribbean ocean across whole frame
    grad.addColorStop(0, '#0C4A6E');
    grad.addColorStop(0.5, '#0E7490');
    grad.addColorStop(1, '#0F766E');
  } else {
    // Downtown Vice Expressway: coastal midnight bay on left, neon city skyline on right
    grad.addColorStop(0, '#092B47');
    grad.addColorStop(0.4, '#0D253E');
    grad.addColorStop(0.54, '#131626');
    grad.addColorStop(1, '#261729');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle animated ocean shimmer lines across all districts (left ocean/bay + right in District 1)
  ctx.save();
  ctx.strokeStyle = district === 2 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  const scroll = (world.player.worldY * 0.45) % 120;
  for (let y = -120; y < height + 120; y += 120) {
    const yy = y + scroll;
    ctx.beginPath();
    ctx.moveTo(20, yy);
    ctx.quadraticCurveTo(width * 0.15, yy - 8, width * 0.3, yy);
    ctx.stroke();
    if (district === 1) {
      ctx.beginPath();
      ctx.moveTo(width * 0.72, yy + 40);
      ctx.quadraticCurveTo(width * 0.85, yy + 32, width - 20, yy + 40);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSceneryAndRoad(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  district: number,
  startY: number,
  worldYTop: number,
  stepY: number,
  scale: number,
  toScreenX: (wy: number, lx: number) => number,
  toScreenY: (wy: number) => number,
  _width: number,
  _height: number
): void {
  const shoulderW = 24;
  const totalHalf = ROAD_HALF_WIDTH + shoulderW;

  // Build road polygon points
  const leftEdge: Array<{ x: number; y: number }> = [];
  const rightEdge: Array<{ x: number; y: number }> = [];

  for (let wy = startY; wy <= worldYTop; wy += stepY) {
    const sy = toScreenY(wy);
    leftEdge.push({ x: toScreenX(wy, -totalHalf), y: sy });
    rightEdge.push({ x: toScreenX(wy, totalHalf), y: sy });
  }

  // Beach shoreline strip in District 0
  if (district === 0) {
    ctx.fillStyle = '#E7C8A6';
    ctx.beginPath();
    for (let i = 0; i < leftEdge.length; i++) {
      const lx = leftEdge[i].x - 75 * scale;
      if (i === 0) ctx.moveTo(lx, leftEdge[i].y);
      else ctx.lineTo(lx, leftEdge[i].y);
    }
    for (let i = rightEdge.length - 1; i >= 0; i--) {
      ctx.lineTo(rightEdge[i].x + 280 * scale, rightEdge[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Road shadow / bridge deck in District 1
  if (district === 1) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
    ctx.beginPath();
    for (let i = 0; i < leftEdge.length; i++) {
      const lx = leftEdge[i].x - 16 * scale;
      if (i === 0) ctx.moveTo(lx, leftEdge[i].y);
      else ctx.lineTo(lx, leftEdge[i].y);
    }
    for (let i = rightEdge.length - 1; i >= 0; i--) {
      ctx.lineTo(rightEdge[i].x + 20 * scale, rightEdge[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Main Asphalt surface
  ctx.fillStyle = district === 2 ? '#161925' : '#1E2330';
  ctx.beginPath();
  for (let i = 0; i < leftEdge.length; i++) {
    if (i === 0) ctx.moveTo(leftEdge[i].x, leftEdge[i].y);
    else ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
  }
  for (let i = rightEdge.length - 1; i >= 0; i--) {
    ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Solid Shoulder Lines (Warm Sunset Coral / Gold curb)
  ctx.lineWidth = Math.max(2, 5 * scale);
  ctx.strokeStyle = district === 2 ? '#FF5E7E' : '#F59E0B';
  ctx.beginPath();
  for (let wy = startY; wy <= worldYTop; wy += stepY) {
    const sx = toScreenX(wy, -ROAD_HALF_WIDTH);
    const sy = toScreenY(wy);
    if (wy === startY) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let wy = startY; wy <= worldYTop; wy += stepY) {
    const sx = toScreenX(wy, ROAD_HALF_WIDTH);
    const sy = toScreenY(wy);
    if (wy === startY) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // Guardrails
  ctx.lineWidth = Math.max(2, 4 * scale);
  ctx.strokeStyle = '#94A3B8';
  ctx.beginPath();
  for (let wy = startY; wy <= worldYTop; wy += stepY) {
    const sx = toScreenX(wy, -totalHalf + 4);
    const sy = toScreenY(wy);
    if (wy === startY) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let wy = startY; wy <= worldYTop; wy += stepY) {
    const sx = toScreenX(wy, totalHalf - 4);
    const sy = toScreenY(wy);
    if (wy === startY) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // 3 Interior Lane Dividers (4 lanes)
  const laneLines = [-105, 0, 105];
  for (let l = 0; l < laneLines.length; l++) {
    const lx = laneLines[l];
    const isCenter = lx === 0;
    ctx.strokeStyle = isCenter ? 'rgba(251, 191, 36, 0.72)' : 'rgba(248, 250, 252, 0.36)';
    ctx.lineWidth = Math.max(1.5, (isCenter ? 3.5 : 2.5) * scale);

    for (let wy = startY; wy < worldYTop; wy += stepY) {
      // Dashed segments every other step
      if (!isCenter && Math.floor(wy / stepY) % 2 !== 0) continue;
      const x1 = toScreenX(wy, lx);
      const y1 = toScreenY(wy);
      const x2 = toScreenX(wy + stepY * (isCenter ? 1 : 0.72), lx);
      const y2 = toScreenY(wy + stepY * (isCenter ? 1 : 0.72));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Roadside Palms & Art Deco Hotels / Streetlamps
  const propStep = 240;
  const propStart = Math.floor(startY / propStep) * propStep;
  for (let wy = propStart; wy <= worldYTop; wy += propStep) {
    const sy = toScreenY(wy);
    if (district === 0) {
      // Palm trees on left beach edge
      const pxL = toScreenX(wy, -ROAD_HALF_WIDTH - 68);
      drawPalmTree(ctx, pxL, sy, scale, wy * 0.01);

      // Pastel Art Deco hotel blocks & palms on right
      const pxR = toScreenX(wy, ROAD_HALF_WIDTH + 68);
      drawPalmTree(ctx, pxR, sy, scale, wy * 0.013);
      if (Math.floor(wy / propStep) % 2 === 0) {
        const bx = toScreenX(wy, ROAD_HALF_WIDTH + 185);
        const colors = ['#FDA4AF', '#99F6E4', '#FDE68A', '#FDBA74'];
        const c = colors[Math.abs(Math.floor(wy / propStep)) % colors.length];
        drawArtDecoRoof(ctx, bx, sy, scale, c);
      }
    } else if (district === 1) {
      // Causeway light poles
      const lxL = toScreenX(wy, -totalHalf - 10);
      const lxR = toScreenX(wy, totalHalf + 10);
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(lxL, sy, 4 * scale, 0, Math.PI * 2);
      ctx.arc(lxR, sy, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Downtown Vice Bay Seawall lamps on left, Neon Highrises on right
      const lxL = toScreenX(wy, -totalHalf - 10);
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(lxL, sy, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      const bxR = toScreenX(wy, ROAD_HALF_WIDTH + 155);
      drawCityBlock(ctx, bxR, sy, scale, '#1E293B', Math.floor(wy / propStep) % 2 === 0 ? '#FF5E7E' : '#2DD4BF');
    }
  }
}

function drawPalmTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  phase: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Soft shadow on sand
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(14, 10, 22, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Fronds
  ctx.rotate(phase);
  for (let i = 0; i < 6; i++) {
    ctx.rotate((Math.PI * 2) / 6);
    ctx.fillStyle = i % 2 === 0 ? '#15803D' : '#166534';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, -8, 28, -2);
    ctx.quadraticCurveTo(14, 7, 0, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArtDecoRoof(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  accent: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, -56, -86, 124, 178, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFBEB';
  roundRect(ctx, -64, -92, 124, 178, 8);
  ctx.fill();

  ctx.fillStyle = accent;
  roundRect(ctx, -52, -78, 100, 150, 4);
  ctx.fill();

  ctx.fillStyle = '#FEF3C7';
  roundRect(ctx, -32, -45, 60, 84, 3);
  ctx.fill();
  ctx.restore();
}

function drawCityBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  body: string,
  trim: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = body;
  roundRect(ctx, -60, -82, 120, 164, 6);
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2.5;
  roundRect(ctx, -52, -74, 104, 148, 4);
  ctx.stroke();
  ctx.restore();
}

function drawHazardTelegraph(
  ctx: CanvasRenderingContext2D,
  sx: number,
  kind: 'roadblock' | 'spikes',
  scale: number,
  time: number,
  topY = 78
): void {
  const pulse = 0.75 + Math.sin(time * 18) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.translate(sx, topY);
  ctx.scale(scale, scale);
  ctx.fillStyle = kind === 'spikes' ? '#F59E0B' : '#EF4444';
  roundRect(ctx, -38, -16, 76, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#090B10';
  ctx.font = '800 15px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind === 'spikes' ? '! SPIKES' : '! BLOCK', 0, -1);
  ctx.restore();
}

function drawTopDownSportsCar(
  ctx: CanvasRenderingContext2D,
  bodyColor: string,
  stripeColor: string,
  accentColor: string,
  boosting: boolean,
  drifting: boolean
): void {
  // Wheels
  ctx.fillStyle = '#0F172A';
  roundRect(ctx, -19, -24, 5, 13, 2);
  ctx.fill();
  roundRect(ctx, 14, -24, 5, 13, 2);
  ctx.fill();
  roundRect(ctx, -19, 12, 5, 14, 2);
  ctx.fill();
  roundRect(ctx, 14, 12, 5, 14, 2);
  ctx.fill();

  // Sculpted chassis
  ctx.fillStyle = bodyColor;
  roundRect(ctx, -17, -33, 34, 66, 9);
  ctx.fill();

  // Center racing stripe
  ctx.fillStyle = stripeColor;
  ctx.fillRect(-3.5, -32, 7, 64);

  // Hood intakes / accents
  ctx.fillStyle = accentColor;
  ctx.fillRect(-11, -22, 5, 8);
  ctx.fillRect(6, -22, 5, 8);

  // Cabin glass
  ctx.fillStyle = '#0F172A';
  roundRect(ctx, -12.5, -13, 25, 29, 5);
  ctx.fill();

  // Roof panel
  ctx.fillStyle = bodyColor;
  roundRect(ctx, -10.5, -4, 21, 14, 3);
  ctx.fill();

  // Rear spoiler
  ctx.fillStyle = '#1E293B';
  roundRect(ctx, -17, 25, 34, 6, 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#FEF9C3';
  ctx.fillRect(-14, -33, 7, 3);
  ctx.fillRect(7, -33, 7, 3);

  // Taillights
  ctx.fillStyle = drifting ? '#FF2E54' : '#EF4444';
  ctx.fillRect(-14, 30, 8, 3);
  ctx.fillRect(6, 30, 8, 3);

  // Exhaust flames when boosting
  if (boosting) {
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(-11, 33);
    ctx.lineTo(-8, 52 + Math.random() * 12);
    ctx.lineTo(-5, 33);
    ctx.moveTo(5, 33);
    ctx.lineTo(8, 52 + Math.random() * 12);
    ctx.lineTo(11, 33);
    ctx.fill();
  }
}

function drawTrafficVehicle(
  ctx: CanvasRenderingContext2D,
  t: TrafficCar,
  sx: number,
  sy: number,
  scale: number,
  nightLights: boolean
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);
  ctx.rotate(t.spin);
  ctx.globalAlpha = t.alpha;

  const hw = t.width * 0.5;
  const hl = t.length * 0.5;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  roundRect(ctx, -hw + 4, -hl + 5, t.width, t.length, 7);
  ctx.fill();

  if (t.kind === 'ramp') {
    // Flatbed Stunt Ramp Hauler!
    ctx.fillStyle = '#334155';
    roundRect(ctx, -hw, -hl, t.width, t.length, 5);
    ctx.fill();

    // Cab at front
    ctx.fillStyle = '#F59E0B';
    roundRect(ctx, -hw + 2, -hl + 2, t.width - 4, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-hw + 5, -hl + 5, t.width - 10, 9);

    // Ramp slope with glowing yellow chevrons
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-hw + 3, -hl + 28, t.width - 6, t.length - 31);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    for (let y = hl - 10; y > -hl + 36; y -= 14) {
      ctx.beginPath();
      ctx.moveTo(-12, y);
      ctx.lineTo(0, y - 8);
      ctx.lineTo(12, y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Headlight glow at night
  if (nightLights && !t.wrecked) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.14)';
    ctx.beginPath();
    ctx.moveTo(-hw + 4, -hl);
    ctx.lineTo(-hw - 16, -hl - 70);
    ctx.lineTo(hw + 16, -hl - 70);
    ctx.lineTo(hw - 4, -hl);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = t.color;
  roundRect(ctx, -hw, -hl, t.width, t.length, t.kind === 'truck' ? 5 : 8);
  ctx.fill();

  if (t.kind === 'truck') {
    // Cargo trailer
    ctx.fillStyle = '#E2E8F0';
    roundRect(ctx, -hw + 2, -hl + 24, t.width - 4, t.length - 27, 3);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-hw + 5, -hl + 6, t.width - 10, 10);
  } else {
    // Windshield & rear window
    ctx.fillStyle = '#0F172A';
    roundRect(ctx, -hw + 5, -hl + 15, t.width - 10, t.length * 0.45, 4);
    ctx.fill();
    if (t.kind !== 'convertible') {
      ctx.fillStyle = t.color;
      roundRect(ctx, -hw + 6, -hl + 25, t.width - 12, t.length * 0.24, 3);
      ctx.fill();
    } else {
      // Beige convertible interior seats
      ctx.fillStyle = '#D6D3D1';
      roundRect(ctx, -hw + 7, -hl + 24, t.width - 14, t.length * 0.26, 3);
      ctx.fill();
    }
  }

  // Taillights
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-hw + 4, hl - 3, 6, 3);
  ctx.fillRect(hw - 10, hl - 3, 6, 3);

  ctx.restore();
}

function drawSeaBoat(
  ctx: CanvasRenderingContext2D,
  b: SeaBoat,
  sx: number,
  sy: number,
  scale: number,
  time: number,
  toScreenX: (wy: number, lx: number) => number,
  toScreenY: (wy: number) => number
): void {
  // Targeting laser when locking onto highway lane
  if (b.lockLaneX !== null && b.lockWorldY !== null && !b.disengaging) {
    const tx = toScreenX(b.lockWorldY, b.lockLaneX);
    const ty = toScreenY(b.lockWorldY);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  // Foamy V-shaped water wake trailing behind the gunboat
  const wakeFlicker = Math.sin(time * 18 + b.id) * 4;
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.42)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, 34);
  ctx.lineTo(-34 - wakeFlicker, 118);
  ctx.moveTo(12, 34);
  ctx.lineTo(34 + wakeFlicker, 118);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.moveTo(-10, 34);
  ctx.lineTo(-24, 98);
  ctx.lineTo(24, 98);
  ctx.lineTo(10, 34);
  ctx.closePath();
  ctx.fill();

  // Boat shadow on water
  ctx.fillStyle = 'rgba(2, 6, 23, 0.38)';
  ctx.beginPath();
  ctx.moveTo(4, -46);
  ctx.lineTo(21, -8);
  ctx.lineTo(19, 44);
  ctx.lineTo(-13, 44);
  ctx.lineTo(-15, -8);
  ctx.closePath();
  ctx.fill();

  // Sleek Tactical Gunboat V-Hull
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(17, -12);
  ctx.lineTo(15, 40);
  ctx.lineTo(-15, 40);
  ctx.lineTo(-17, -12);
  ctx.closePath();
  ctx.fill();

  // Armored deck stripe & bridge
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(11, -12);
  ctx.lineTo(10, 34);
  ctx.lineTo(-10, 34);
  ctx.lineTo(-11, -12);
  ctx.closePath();
  ctx.fill();

  // Cabin glass
  ctx.fillStyle = '#0F172A';
  roundRect(ctx, -8, 2, 16, 16, 3);
  ctx.fill();

  // Twin rear outboard engines
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-11, 38, 7, 8);
  ctx.fillRect(4, 38, 7, 8);

  // Rotating Bow Gun Turret aimed at player
  ctx.save();
  ctx.translate(0, -16);
  ctx.rotate(b.turretAngle);
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-2, -18, 4, 18);
  if (!b.disengaging && b.fireCooldown < 0.7) {
    const charge = 0.5 + 0.5 * Math.sin(time * 28);
    ctx.fillStyle = `rgba(56, 189, 248, ${0.5 + charge * 0.45})`;
    ctx.beginPath();
    ctx.arc(0, -19, 4.5 + charge * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Tactical strobe
  if (!b.disengaging) {
    const flash = Math.sin(time * 20 + b.id) > 0;
    ctx.fillStyle = flash ? '#EF4444' : '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, 14, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCopVehicle(
  ctx: CanvasRenderingContext2D,
  c: CopCar,
  sx: number,
  sy: number,
  scale: number,
  time: number,
  _toScreenX: (wy: number, lx: number) => number,
  _toScreenY: (wy: number) => number
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);
  ctx.rotate(c.spin);
  ctx.globalAlpha = c.alpha;

  const hw = c.width * 0.5;
  const hl = c.length * 0.5;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  roundRect(ctx, -hw + 4, -hl + 5, c.width, c.length, 7);
  ctx.fill();

  if (c.kind === 'army_car') {
    // Tactical Olive Armored 4x4 Gun Truck
    ctx.fillStyle = c.hitFlash > 0 ? '#FFFFFF' : '#3F4F3A';
    roundRect(ctx, -hw, -hl, c.width, c.length, 6);
    ctx.fill();

    // Matte armor roof plating
    if (c.hitFlash <= 0) {
      ctx.fillStyle = '#2D3A29';
      roundRect(ctx, -hw + 4, -hl + 14, c.width - 8, c.length - 22, 4);
      ctx.fill();
    }

    // Slit armored windshield
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-hw + 6, -hl + 14, c.width - 12, 10);

    // Roof turret & barrel
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(0, 4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2.5, -18, 5, 20);

    // Tactical Amber/Red beacon
    if (!c.wrecked) {
      const flash = Math.sin(time * 20 + c.id) > 0;
      ctx.fillStyle = flash ? '#F59E0B' : '#EF4444';
      ctx.fillRect(-9, -hl + 27, 18, 4);
    }

    // Heavy steel bullbar
    ctx.fillStyle = '#64748B';
    ctx.fillRect(-hw + 2, -hl - 3, c.width - 4, 4);

    ctx.restore();
    return;
  }

  // Flashing Siren Light Spill on Asphalt for Police vehicles
  if (!c.wrecked) {
    const flash = Math.sin(time * 22 + c.id) > 0;
    const spillGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 68);
    spillGrad.addColorStop(0, flash ? 'rgba(239, 68, 68, 0.28)' : 'rgba(56, 189, 248, 0.28)');
    spillGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spillGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.fill();
  }

  // Police body
  const baseBody =
    c.hitFlash > 0
      ? '#FFFFFF'
      : c.kind === 'swat'
      ? '#1E293B'
      : c.kind === 'interceptor'
      ? '#0F172A'
      : '#111827';
  ctx.fillStyle = baseBody;
  roundRect(ctx, -hw, -hl, c.width, c.length, 7);
  ctx.fill();

  // White police doors / roof
  if (c.kind !== 'swat' && c.hitFlash <= 0) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-hw + 2, -10, c.width - 4, 22);
  }

  // Windshield
  ctx.fillStyle = '#020617';
  roundRect(ctx, -hw + 5, -hl + 14, c.width - 10, 20, 4);
  ctx.fill();

  // Lightbar
  if (!c.wrecked) {
    const flash = Math.sin(time * 22 + c.id) > 0;
    ctx.fillStyle = flash ? '#EF4444' : '#3B82F6';
    ctx.fillRect(-11, -3, 11, 5);
    ctx.fillStyle = flash ? '#3B82F6' : '#EF4444';
    ctx.fillRect(0, -3, 11, 5);
  }

  // Bullbar
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(-hw + 3, -hl - 2, c.width - 6, 3);

  ctx.restore();
}

function drawMissileAndTelegraph(
  ctx: CanvasRenderingContext2D,
  m: Missile,
  toScreenX: (wy: number, lx: number) => number,
  toScreenY: (wy: number) => number,
  scale: number,
  time: number
): void {
  const mx = toScreenX(m.worldY, m.laneX);
  const my = toScreenY(m.worldY);

  if (m.source === 'chopper' || m.source === 'boat') {
    const tx = toScreenX(m.targetWorldY, m.targetLaneX);
    const ty = toScreenY(m.targetWorldY);
    const pulse = 0.65 + Math.sin(time * 26) * 0.35;

    // 1. Clean X Impact Spot Marker on Asphalt (no empty tracking circle!)
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    const markerColor =
      m.source === 'boat'
        ? `rgba(56, 189, 248, ${0.65 + pulse * 0.35})`
        : `rgba(239, 68, 68, ${0.65 + pulse * 0.35})`;

    ctx.strokeStyle = markerColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.lineTo(14, 14);
    ctx.moveTo(14, -14);
    ctx.lineTo(-14, 14);
    ctx.stroke();

    ctx.fillStyle = m.source === 'boat' ? '#BAE6FD' : '#FCA5A5';
    ctx.font = '800 12px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.source === 'boat' ? '! SHELL' : '! MISSILE', 0, -20);
    ctx.restore();

    // 2. Airborne Missile / Sea Shell heading toward impact marker
    const angle = Math.atan2(ty - my, tx - mx) + Math.PI * 0.5;
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(scale, scale);
    ctx.rotate(angle);

    // Exhaust flame
    ctx.fillStyle = m.source === 'boat' ? '#38BDF8' : '#F97316';
    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(0, 26 + Math.random() * 8);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();

    // Body + Fins + Warhead
    ctx.fillStyle = '#E2E8F0';
    roundRect(ctx, -3.5, -11, 7, 22, 2);
    ctx.fill();
    ctx.fillStyle = m.source === 'boat' ? '#0284C7' : '#EF4444';
    ctx.beginPath();
    ctx.moveTo(-3.5, -10);
    ctx.lineTo(0, -18);
    ctx.lineTo(3.5, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, 7, 12, 4);
    ctx.restore();
    return;
  }

  // Army Ground Rocket + subtle lane trajectory line
  const aheadY = m.worldY + (m.speed >= 0 ? 220 : -220);
  const ax = toScreenX(aheadY, m.laneX);
  const ay = toScreenY(aheadY);

  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.36)';
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  ctx.restore();

  const pointingDown = m.speed < 0;
  ctx.save();
  ctx.translate(mx, my);
  ctx.scale(scale, scale);
  if (pointingDown) ctx.rotate(Math.PI);

  // Flame plume
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.moveTo(-4, 12);
  ctx.lineTo(0, 28 + Math.random() * 10);
  ctx.lineTo(4, 12);
  ctx.closePath();
  ctx.fill();

  // Rocket shell
  ctx.fillStyle = '#CBD5E1';
  roundRect(ctx, -4, -12, 8, 24, 3);
  ctx.fill();
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.moveTo(-4, -11);
  ctx.lineTo(0, -20);
  ctx.lineTo(4, -11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.fillRect(-7, 6, 14, 4);
  ctx.restore();
}

function drawHelicopter(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  scale: number,
  rotorAngle: number,
  armedWithRockets: boolean,
  time: number
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  // Elevated Drop Shadow
  ctx.save();
  ctx.translate(36, 44);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-4, 36, 8, 48);
  ctx.restore();

  // Landing Skids
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-19, -22);
  ctx.lineTo(-19, 22);
  ctx.moveTo(19, -22);
  ctx.lineTo(19, 22);
  ctx.stroke();

  // Side Rocket Pods (Stars 4+)
  if (armedWithRockets) {
    ctx.fillStyle = '#334155';
    roundRect(ctx, -26, -8, 10, 22, 2);
    ctx.fill();
    roundRect(ctx, 16, -8, 10, 22, 2);
    ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-24, -10, 6, 3);
    ctx.fillRect(18, -10, 6, 3);
  }

  // Tail Boom
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(-7, 26);
  ctx.lineTo(-3, 82);
  ctx.lineTo(3, 82);
  ctx.lineTo(7, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.fillRect(-11, 70, 22, 5);

  // Main Fuselage
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tactical Accent Stripe
  ctx.strokeStyle = armedWithRockets ? '#F59E0B' : '#FF5E7E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 32, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Bubble Cockpit Glass
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.ellipse(0, -18, 12, 13, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Flashing Beacon
  const strobe = Math.sin(time * 20) > 0;
  ctx.fillStyle = strobe ? '#EF4444' : '#38BDF8';
  ctx.beginPath();
  ctx.arc(0, 14, 4, 0, Math.PI * 2);
  ctx.fill();

  // Rotor Blur Disc
  ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
  ctx.beginPath();
  ctx.arc(0, -2, 66, 0, Math.PI * 2);
  ctx.fill();

  // Rotating 4-Blade Main Rotor
  ctx.save();
  ctx.translate(0, -2);
  ctx.rotate(rotorAngle);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fillRect(-66, -3, 132, 6);
  ctx.fillRect(-3, -66, 6, 132);
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Spinning Tail Rotor
  ctx.save();
  ctx.translate(5, 78);
  ctx.rotate(rotorAngle * 1.9);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
  ctx.fillRect(-2, -12, 4, 24);
  ctx.restore();

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function getLaneCenter(lane: number): number {
  return LANE_CENTERS[lane] ?? 0;
}
