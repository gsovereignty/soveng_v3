import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function forceScrollTop() {
  const previousBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  document.documentElement.style.scrollBehavior = previousBehavior;
}

forceScrollTop();
window.addEventListener("load", forceScrollTop, { once: true });
window.addEventListener("pageshow", forceScrollTop);

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SHARD_COLUMNS = 125;
const SHARD_ROWS = 80;
const SHARD_COUNT = SHARD_COLUMNS * SHARD_ROWS;

function createShardGlobe(canvas, image) {
  const context = canvas.getContext("2d", { alpha: true });
  const state = { progress: 0, rotation: 0 };
  const shards = Array.from({ length: SHARD_COUNT }, (_, index) => ({
    column: index % SHARD_COLUMNS,
    row: Math.floor(index / SHARD_COLUMNS),
    scatterX: Math.sin(index * 91.137) * .22,
    scatterY: Math.cos(index * 47.713) * .22,
    angle: Math.sin(index * 17.17) * Math.PI
  }));

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }

  function render() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);

    const imageRatio = image.naturalWidth / image.naturalHeight;
    const viewRatio = width / height;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (imageRatio > viewRatio) {
      sourceWidth = image.naturalHeight * viewRatio;
      sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = image.naturalWidth / viewRatio;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }

    const targetWidth = width / SHARD_COLUMNS;
    const targetHeight = height / SHARD_ROWS;
    const sourceTileWidth = sourceWidth / SHARD_COLUMNS;
    const sourceTileHeight = sourceHeight / SHARD_ROWS;
    const radius = Math.min(width, height) * .31;
    const centerX = width / 2;
    const centerY = height / 2;
    const assembleProgress = gsap.utils.clamp(0, 1, state.progress / .32);
    const rawFlattenProgress = gsap.utils.clamp(0, 1, (state.progress - .48) / .32);
    const flattenProgress = rawFlattenProgress * rawFlattenProgress * (3 - 2 * rawFlattenProgress);
    const flightScatter = Math.sin(flattenProgress * Math.PI) * Math.max(width, height) * .045;

    const projected = shards.map(shard => {
      const madeiraLongitude = -16.9595 * Math.PI / 180;
      const madeiraLatitude = 32.7607 * Math.PI / 180;
      const worldLongitude = ((shard.column + .5) / SHARD_COLUMNS) * Math.PI * 2 - Math.PI;
      const longitude = worldLongitude - madeiraLongitude + state.rotation;
      const latitude = Math.PI / 2 - ((shard.row + .5) / SHARD_ROWS) * Math.PI;
      const latitudeRadius = Math.cos(latitude);
      const worldY = Math.sin(latitude);
      const worldZ = latitudeRadius * Math.cos(longitude);
      const centeredY = worldY * Math.cos(madeiraLatitude) - worldZ * Math.sin(madeiraLatitude);
      const depth = worldY * Math.sin(madeiraLatitude) + worldZ * Math.cos(madeiraLatitude);
      const sphereX = centerX + latitudeRadius * Math.sin(longitude) * radius;
      const sphereY = centerY - centeredY * radius;
      const depthScale = .28 + ((depth + 1) / 2) * .72;
      return { ...shard, depth, depthScale, sphereX, sphereY };
    }).sort((a, b) => a.depth - b.depth);

    projected.forEach(shard => {
      const targetX = shard.column * targetWidth + targetWidth / 2;
      const targetY = shard.row * targetHeight + targetHeight / 2;
      const cloudX = shard.sphereX + shard.scatterX * Math.max(width, height) * 1.9;
      const cloudY = shard.sphereY + shard.scatterY * Math.max(width, height) * 1.9;
      const globeX = gsap.utils.interpolate(cloudX, shard.sphereX, assembleProgress);
      const globeY = gsap.utils.interpolate(cloudY, shard.sphereY, assembleProgress);
      const x = gsap.utils.interpolate(globeX, targetX, flattenProgress) + shard.scatterX * flightScatter;
      const y = gsap.utils.interpolate(globeY, targetY, flattenProgress) + shard.scatterY * flightScatter;
      const globeSize = Math.max(2.4, Math.min(targetWidth, targetHeight) * .5) * shard.depthScale;
      const cloudSize = Math.max(1.2, globeSize * .34);
      const formedSize = gsap.utils.interpolate(cloudSize, globeSize, assembleProgress);
      const tileWidth = gsap.utils.interpolate(formedSize, targetWidth + .35, flattenProgress);
      const tileHeight = gsap.utils.interpolate(formedSize, targetHeight + .35, flattenProgress);
      const rotation = shard.angle * (1 - assembleProgress * .82) * (1 - flattenProgress);
      const shade = .28 + ((shard.depth + 1) / 2) * .72;

      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      const shardAlpha = gsap.utils.interpolate(.55, shade, assembleProgress) * (1 - flattenProgress) + flattenProgress;
      context.globalAlpha = shardAlpha;
      context.drawImage(
        image,
        sourceX + shard.column * sourceTileWidth,
        sourceY + shard.row * sourceTileHeight,
        sourceTileWidth + .2,
        sourceTileHeight + .2,
        -tileWidth / 2,
        -tileHeight / 2,
        tileWidth,
        tileHeight
      );
      context.restore();
    });

  }

  resize();
  window.addEventListener("resize", resize);
  return { state, render };
}

function createPlantAnimation(canvas, species, seed) {
  const context = canvas.getContext("2d");
  const state = { progress: reduced ? 1 : 0 };
  const speciesConfig = {
    cherry: { height: .7, leaves: 17, leafLength: .13, leafWidth: .027, trunk: "#553a35", trunkWidth: 8, leaf: "#4c7148", accent: "#ed7e91", flowers: 11, crown: false, shape: "pointed" },
    cashew: { height: 0, leaves: 0, leafLength: 0, leafWidth: 0, trunk: "#9b622d", trunkWidth: 0, leaf: "#d8ad68", accent: "#f1cf8b", flowers: 0, crown: false, shape: "cashew" },
    banyan: { height: .8, leaves: 28, leafLength: .16, leafWidth: .045, trunk: "#604933", trunkWidth: 16, leaf: "#2f6644", accent: "#ed3238", flowers: 0, crown: true, shape: "broad", roots: true },
    papyrus: { height: .82, leaves: 34, leafLength: .19, leafWidth: .009, trunk: "#71884d", trunkWidth: 7, leaf: "#5c8b55", accent: "#d9b83e", flowers: 0, crown: true, shape: "needle" },
    mangrove: { height: .67, leaves: 24, leafLength: .13, leafWidth: .035, trunk: "#594737", trunkWidth: 13, leaf: "#346c52", accent: "#ed3238", flowers: 0, crown: false, shape: "broad", roots: true },
    firebush: { height: .65, leaves: 25, leafLength: .11, leafWidth: .025, trunk: "#3d6b42", trunkWidth: 6, leaf: "#386f45", accent: "#ed3e2f", flowers: 12, crown: false, shape: "pointed" }
  };
  const config = speciesConfig[species];

  const smooth = value => value * value * (3 - 2 * value);
  const clamp = value => Math.max(0, Math.min(1, value));
  const noise = value => Math.sin((value + seed * 17.13) * 91.73) * .5 + .5;
  const cashews = [10, 8, 7, 5, 3, 1].flatMap((count, row) =>
    Array.from({ length: count }, (_, column) => ({
      row,
      x: (column - (count - 1) / 2) / 10 + (noise(row * 13 + column) - .5) * .018,
      y: row * .073,
      rotation: (noise(row * 31 + column + 70) - .5) * 1.8,
      scale: .82 + noise(row * 17 + column + 140) * .32
    }))
  );

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function stemPoint(t, width, height) {
    const rootX = width / 2;
    const rootY = height * .96;
    const lean = (seed % 2 ? -1 : 1) * width * .035;
    return {
      x: rootX + Math.sin(t * Math.PI * 1.35 + seed) * width * .012 + lean * t,
      y: rootY - t * height * config.height
    };
  }

  function drawStem(progress, width, height) {
    const stemGrowth = smooth(clamp(progress / .58));
    context.beginPath();
    for (let step = 0; step <= 50; step += 1) {
      const t = stemGrowth * step / 50;
      const point = stemPoint(t, width, height);
      if (step === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = config.trunk;
    context.lineWidth = config.trunkWidth;
    context.lineCap = "round";
    context.stroke();
    context.strokeStyle = "rgba(255,255,255,.18)";
    context.lineWidth = 1.2;
    context.stroke();
  }

  function drawLeaf(x, y, angle, length, width, growth, color, shape) {
    if (growth <= 0) return;
    const grownLength = length * growth;
    const shapeWidth = shape === "coin" ? 1.5 : shape === "needle" ? .48 : shape === "broad" ? 1.2 : 1;
    const grownWidth = width * shapeWidth * Math.sin(growth * Math.PI / 2);
    const endX = x + Math.cos(angle) * grownLength;
    const endY = y + Math.sin(angle) * grownLength;
    const normalX = -Math.sin(angle) * grownWidth;
    const normalY = Math.cos(angle) * grownWidth;
    const bend = (shape === "needle" ? .08 : .2) * grownLength;
    const bendX = -Math.sin(angle) * bend;
    const bendY = Math.cos(angle) * bend;

    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(
      x + (endX - x) * .34 + normalX + bendX,
      y + (endY - y) * .34 + normalY + bendY,
      x + (endX - x) * .75 + normalX * .5,
      y + (endY - y) * .75 + normalY * .5,
      endX,
      endY
    );
    context.bezierCurveTo(
      x + (endX - x) * .75 - normalX * .5,
      y + (endY - y) * .75 - normalY * .5,
      x + (endX - x) * .34 - normalX + bendX,
      y + (endY - y) * .34 - normalY + bendY,
      x,
      y
    );
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = "rgba(8,35,19,.5)";
    context.lineWidth = 1;
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo((x + endX) / 2 + bendX, (y + endY) / 2 + bendY, endX, endY);
    context.strokeStyle = "rgba(238,232,221,.38)";
    context.stroke();
  }

  function drawLeaves(progress, width, height) {
    for (let index = 0; index < config.leaves; index += 1) {
      const fraction = index / Math.max(1, config.leaves - 1);
      const threshold = .14 + fraction * .68;
      const growth = smooth(clamp((progress - threshold) / .2));
      let attach = config.crown ? .72 + (index % 4) * .055 : .18 + fraction * .75;
      let angle;
      if (config.crown) {
        angle = -Math.PI + .24 + fraction * (Math.PI - .48);
      } else {
        const side = index % 2 ? 1 : -1;
        angle = side > 0 ? -.55 - noise(index) * .35 : -2.6 + noise(index) * .35;
      }
      angle += (noise(index + 40) - .5) * .22;
      const point = stemPoint(attach, width, height);
      const length = width * config.leafLength * (.68 + noise(index + 80) * .45);
      const leafWidth = width * config.leafWidth * (.75 + noise(index + 120) * .4);
      const shade = index % 3 === 0 ? config.leaf : index % 3 === 1 ? "#315f3d" : "#54834a";
      drawLeaf(point.x, point.y, angle, length, leafWidth, growth, shade, config.shape);
    }
  }

  function drawFlowers(progress, width, height) {
    for (let index = 0; index < config.flowers; index += 1) {
      const threshold = .62 + index * .025;
      const growth = smooth(clamp((progress - threshold) / .2));
      if (!growth) continue;
      const attach = species === "firebush" ? .4 + index * .045 : .72 + (index % 4) * .065;
      const point = stemPoint(attach, width, height);
      const side = index % 2 ? 1 : -1;
      const x = point.x + side * width * (.025 + index * .007);
      const y = point.y - index * 5;
      const radius = width * (species === "cherry" ? .01 : .012) * growth;
      context.save();
      context.translate(x, y);
      context.rotate(side * .45);
      const petals = species === "cherry" ? 5 : 4;
      for (let petal = 0; petal < petals; petal += 1) {
        context.rotate(Math.PI * 2 / petals);
        context.beginPath();
        context.ellipse(0, -radius, radius * .7, radius * 1.35, 0, 0, Math.PI * 2);
        context.fillStyle = config.accent;
        context.fill();
      }
      context.beginPath();
      context.arc(0, 0, radius * .45, 0, Math.PI * 2);
      context.fillStyle = "#f1c34b";
      context.fill();
      context.restore();
    }
  }

  function drawCashewPile(progress, width, height) {
    const baseX = width / 2;
    const baseY = height * .9;
    const nutSize = Math.max(22, Math.min(44, width * .035));
    cashews.forEach((nut, index) => {
      const start = index / cashews.length * .88;
      const growth = smooth(clamp((progress - start) / .085));
      if (!growth) return;
      const x = baseX + nut.x * Math.min(width, 980);
      const y = baseY - nut.y * Math.min(width, 820) - (1 - growth) * height * .13;
      context.save();
      context.translate(x, y);
      context.rotate(nut.rotation * growth);
      context.scale(nut.scale * growth, nut.scale * growth);
      context.lineCap = "round";
      context.strokeStyle = "rgba(55,31,15,.22)";
      context.lineWidth = nutSize * .62;
      context.beginPath(); context.moveTo(-nutSize * .28, -nutSize * .36); context.bezierCurveTo(-nutSize * .65, -nutSize * .02, -nutSize * .32, nutSize * .55, nutSize * .2, nutSize * .35); context.stroke();
      context.strokeStyle = index % 3 === 0 ? "#d09a52" : index % 3 === 1 ? "#e0b76f" : "#c78d45";
      context.lineWidth = nutSize * .5;
      context.beginPath(); context.moveTo(-nutSize * .28, -nutSize * .42); context.bezierCurveTo(-nutSize * .68, -nutSize * .06, -nutSize * .34, nutSize * .5, nutSize * .22, nutSize * .3); context.stroke();
      context.strokeStyle = "rgba(255,235,181,.52)";
      context.lineWidth = nutSize * .08;
      context.beginPath(); context.moveTo(-nutSize * .34, -nutSize * .38); context.bezierCurveTo(-nutSize * .55, -.04 * nutSize, -nutSize * .27, nutSize * .27, nutSize * .06, nutSize * .24); context.stroke();
      context.restore();
    });
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    if (species === "cashew") {
      drawCashewPile(state.progress, width, height);
      return;
    }
    if (config.roots) {
      const rootGrowth = smooth(clamp(state.progress / .34));
      const root = stemPoint(0, width, height);
      context.strokeStyle = config.trunk;
      context.lineWidth = config.trunkWidth * .55;
      context.lineCap = "round";
      [-1, 1].forEach(side => {
        context.beginPath(); context.moveTo(root.x, root.y);
        context.bezierCurveTo(root.x + side * width * .035 * rootGrowth, root.y - height * .1 * rootGrowth, root.x + side * width * .09 * rootGrowth, root.y - height * .035, root.x + side * width * .13 * rootGrowth, root.y);
        context.stroke();
      });
    }
    drawStem(state.progress, width, height);
    drawLeaves(state.progress, width, height);
    drawFlowers(state.progress, width, height);
  }

  resize();
  window.addEventListener("resize", resize);
  return { state, draw };
}

function createDragonFinale() {
  const canvas = document.querySelector(".dragon-scene");
  const context = canvas.getContext("2d");
  const finale = document.querySelector(".finale");
  const state = { progress: reduced ? 1 : 0, time: 0, x: 0, y: 0, targetX: 0, targetY: 0, visible: true };
  let width = 0;
  let height = 0;
  let frame = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => value * value * (3 - 2 * value);
  const phase = (start, end) => smooth(clamp((state.progress - start) / (end - start)));
  const smoke = Array.from({ length: 72 }, (_, index) => ({
    x: Math.sin(index * 73.17) * .5,
    y: Math.cos(index * 41.91) * .5,
    size: .025 + (Math.sin(index * 19.31) * .5 + .5) * .055,
    drift: Math.sin(index * 8.73),
    depth: index % 3
  }));

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function drawCave() {
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#030405");
    background.addColorStop(.55, "#101013");
    background.addColorStop(1, "#050505");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const glowX = width * .55 + state.x * 18;
    const glowY = height * .61 + state.y * 10;
    const glow = context.createRadialGradient(glowX, glowY, 10, glowX, glowY, width * .24);
    glow.addColorStop(0, "rgba(255,205,67,.72)");
    glow.addColorStop(.35, "rgba(185,93,20,.34)");
    glow.addColorStop(1, "rgba(8,8,8,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#09090b";
    context.beginPath();
    context.moveTo(0, 0); context.lineTo(width, 0); context.lineTo(width, height * .17);
    for (let index = 12; index >= 0; index -= 1) context.lineTo(width * index / 12, height * (.08 + Math.sin(index * 2.3) * .06 + Math.random() * 0));
    context.closePath(); context.fill();
    context.save();
    context.translate(state.x * 34, state.y * 18);
    context.fillStyle = "#121216";
    context.beginPath(); context.moveTo(0, height); context.lineTo(0, height * .48); context.quadraticCurveTo(width * .12, height * .27, width * .25, height * .45); context.lineTo(width * .19, height); context.fill();
    context.beginPath(); context.moveTo(width, height); context.lineTo(width, height * .36); context.quadraticCurveTo(width * .88, height * .24, width * .82, height * .5); context.lineTo(width * .88, height); context.fill();
    context.restore();
  }

  function drawSmoke(foreground = false) {
    const gather = phase(0, .42);
    const clear = phase(.72, 1);
    smoke.forEach((puff, index) => {
      if ((puff.depth === 2) !== foreground) return;
      const orbit = index * 1.73 + state.time * (.035 + puff.depth * .012);
      const spread = (1 - gather * .62) * Math.min(width, height);
      const centerX = width * .52 + state.x * (8 + puff.depth * 8);
      const centerY = height * .54 + state.y * 10;
      const x = centerX + puff.x * spread + Math.sin(orbit) * 34;
      const y = centerY + puff.y * spread * .62 - gather * Math.abs(puff.x) * height * .12 + Math.cos(orbit * .7) * 22;
      const radius = Math.min(width, height) * puff.size * (1 + gather * .55);
      const fade = foreground ? 1 - clear * .8 : 1 - clear;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${foreground ? "125,117,121" : "84,79,84"},${(.2 + gather * .13) * fade})`);
      gradient.addColorStop(1, "rgba(40,38,42,0)");
      context.fillStyle = gradient;
      context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
    });
  }

  function drawWing(side, growth, bodyX, bodyY, scale, breath) {
    if (growth <= 0) return;
    context.save(); context.translate(bodyX, bodyY); context.scale(scale * side, scale);
    const span = 265 * growth;
    const lift = (150 + breath * 4) * growth;
    context.fillStyle = "rgba(61,20,27,.96)"; context.strokeStyle = "#13090c"; context.lineWidth = 5;
    context.beginPath(); context.moveTo(25, -65);
    context.bezierCurveTo(74, -115, span * .62, -lift, span, -112 * growth);
    context.quadraticCurveTo(span * .72, -56, span * .83, 18);
    context.quadraticCurveTo(span * .49, -38, 44, -5); context.closePath(); context.fill(); context.stroke();
    context.strokeStyle = "rgba(183,60,60,.32)"; context.lineWidth = 2;
    [0.34, .57, .78].forEach(rib => { context.beginPath(); context.moveTo(32, -55); context.lineTo(span * rib, -lift * (1 - rib * .42)); context.stroke(); });
    context.restore();
  }

  function drawDragon() {
    const skeleton = phase(.18, .52);
    const mass = phase(.31, .68);
    const wings = phase(.43, .79);
    const detail = phase(.62, .94);
    if (!skeleton) return;
    const compact = width < 720 ? .66 : 1;
    const scale = Math.max(.72, Math.min(1.32, width / 1100)) * compact;
    const bodyX = width * .52 + state.x * 12;
    const bodyY = height * .66 + (1 - skeleton) * 90 + state.y * 8;
    const breath = detail * Math.sin(state.time * 1.7) * 4;
    const alpha = .18 + mass * .82;

    context.save(); context.globalAlpha = alpha;
    drawWing(-1, wings, bodyX, bodyY, scale, breath);
    drawWing(1, wings * .96, bodyX, bodyY, scale, breath);
    context.translate(bodyX, bodyY); context.scale(scale, scale);
    context.lineCap = "round";
    context.strokeStyle = "#491921"; context.lineWidth = 34 * skeleton;
    context.beginPath(); context.moveTo(0, 0); context.bezierCurveTo(40, -90, 28, -172, -8, -218); context.stroke();
    context.strokeStyle = "#321117"; context.lineWidth = 29 * skeleton;
    context.beginPath(); context.moveTo(66, -12); context.bezierCurveTo(150, 16, 215, 66, 292 * skeleton, 34); context.stroke();
    context.fillStyle = "#581e27"; context.strokeStyle = "#16090c"; context.lineWidth = 5;
    context.beginPath(); context.ellipse(0, -45 + breath, 92 * mass, 72 * mass, -.08, 0, Math.PI * 2); context.fill(); context.stroke();
    context.beginPath(); context.moveTo(-65 * mass, -246); context.quadraticCurveTo(-7, -278, 57 * mass, -235); context.lineTo(31, -198); context.quadraticCurveTo(-29, -190, -65 * mass, -246); context.closePath(); context.fill(); context.stroke();
    context.fillStyle = "#220b10";
    [-38, 4, 39].forEach((x, index) => { const horn = detail * (1 - index * .08); context.beginPath(); context.moveTo(x, -253); context.lineTo(x + (index - 1) * 16, -253 - 53 * horn); context.lineTo(x + 17, -247); context.closePath(); context.fill(); });
    context.strokeStyle = "#3d141b"; context.lineWidth = 22;
    context.beginPath(); context.moveTo(-49, -72); context.lineTo(-94 * mass, 19); context.moveTo(47, -72); context.lineTo(94 * mass, 19); context.stroke();
    if (detail > 0) {
      context.fillStyle = `rgba(242,55,44,${detail})`;
      [-28, 24].forEach(x => { context.shadowColor = "#ed3238"; context.shadowBlur = 22 * detail; context.beginPath(); context.ellipse(x, -238, 7 * detail, 4 * detail, 0, 0, Math.PI * 2); context.fill(); });
      context.shadowBlur = 0;
      context.strokeStyle = `rgba(228,105,91,${detail * .35})`; context.lineWidth = 2;
      for (let row = 0; row < 5; row += 1) for (let col = -2; col <= 2; col += 1) {
        const x = col * 25 + (row % 2) * 12; const y = -105 + row * 24;
        context.beginPath(); context.arc(x, y, 12, Math.PI, 0); context.stroke();
      }
    }
    context.restore();
  }

  function draw() { drawCave(); drawSmoke(false); drawDragon(); drawSmoke(true); }

  function tick(time) {
    state.time = time / 1000;
    state.x += (state.targetX - state.x) * .055;
    state.y += (state.targetY - state.y) * .055;
    if (state.visible) draw();
    if (!document.hidden && !reduced) frame = requestAnimationFrame(tick);
  }

  resize(); window.addEventListener("resize", resize);
  if (!reduced) frame = requestAnimationFrame(tick);
  finale.addEventListener("pointermove", event => {
    if (reduced) return;
    const bounds = finale.getBoundingClientRect();
    state.targetX = (event.clientX - bounds.left) / bounds.width - .5;
    state.targetY = (event.clientY - bounds.top) / bounds.height - .5;
  });
  finale.addEventListener("pointerleave", () => { state.targetX = 0; state.targetY = 0; });
  ScrollTrigger.create({
    trigger: finale,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onToggle: self => { state.visible = self.isActive || self.progress === 1; },
    onUpdate: self => {
      state.progress = reduced ? 1 : self.progress;
      state.targetY = (self.progress - .5) * .35;
      gsap.set(".dragon-cue", { opacity: 1 - phase(.55, .82) });
      draw();
    }
  });
}

async function runExperience() {
  const cityImage = document.querySelector(".city img");
  try { await cityImage.decode(); } catch { /* Browser can still draw loaded fallback. */ }
  const shardCanvas = document.querySelector(".shard-canvas");
  const globe = createShardGlobe(shardCanvas, cityImage);

  document.body.classList.add("sharding");
  document.body.style.overflow = "hidden";
  gsap.set(".title-line", { opacity: 0 });
  gsap.set(".opening-kicker", { opacity: 0 });
  const opening = gsap.timeline({ defaults: { ease: "power3.out" } });
  opening
    .from(".prologue-mark", { opacity: 0, scale: .7, duration: .6 })
    .from(".prologue-code", { opacity: 0, y: 8, duration: .35 }, "<.15")
    .from(".prologue-line span", { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, "<.1")
    .from(".prologue-status", { opacity: 0, duration: .35 })
    .to(".prologue", { clipPath: "inset(0 0 100% 0)", duration: .85, ease: "power4.inOut", delay: .3, onComplete: () => {
      gsap.set(".prologue", { display: "none" });
      document.body.style.overflow = "";
    }})
    .from([".opening-meta", ".nav"], { opacity: 0, duration: .6 }, "<.3");

  gsap.to(".city-bloom", { scale: 1.25, opacity: .55, duration: 3.5, ease: "sine.inOut", yoyo: true, repeat: -1 });

  const firstLine = "BUILD THE TOOLS.";
  const secondLine = "SHIP THE FUTURE.";
  const totalCharacters = firstLine.length + secondLine.length;
  const firstTarget = document.querySelector(".typed-one");
  const secondTarget = document.querySelector(".typed-two");
  let shardFrame = 0;
  const scheduleShardRender = () => {
    if (shardFrame) return;
    shardFrame = requestAnimationFrame(() => {
      shardFrame = 0;
      globe.render();
    });
  };

  ScrollTrigger.create({
    trigger: ".opening",
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: self => {
      const progress = self.progress;
      globe.state.progress = progress;
      const assembleProgress = gsap.utils.clamp(0, 1, progress / .32);
      const flattenProgress = gsap.utils.clamp(0, 1, (progress - .48) / .32);
      const spinProgress = gsap.utils.clamp(0, 1, (progress - .32) / .16);
      globe.state.rotation = gsap.utils.interpolate(-.7, 0, assembleProgress) + spinProgress * Math.PI * 4 + flattenProgress * .15;
      scheduleShardRender();

      const rawBlendProgress = gsap.utils.clamp(0, 1, (progress - .76) / .1);
      const blendProgress = rawBlendProgress * rawBlendProgress * (3 - 2 * rawBlendProgress);
      document.body.classList.remove("sharding");
      gsap.set(cityImage, { opacity: blendProgress });
      gsap.set(shardCanvas, { display: blendProgress >= 1 ? "none" : "block", opacity: 1 - blendProgress });
      const dimProgress = gsap.utils.clamp(0, 1, (progress - .7) / .1);
      const brightness = gsap.utils.interpolate(1.35, .42, dimProgress);
      const saturation = gsap.utils.interpolate(1.2, .7, dimProgress);
      shardCanvas.style.filter = `brightness(${brightness}) saturate(${saturation}) contrast(1.25)`;

      const typeProgress = gsap.utils.clamp(0, 1, (progress - .82) / .16);
      const visibleCharacters = Math.floor(typeProgress * totalCharacters);
      firstTarget.textContent = firstLine.slice(0, Math.min(firstLine.length, visibleCharacters));
      secondTarget.textContent = secondLine.slice(0, Math.max(0, visibleCharacters - firstLine.length));
      gsap.set(".title-line", { opacity: visibleCharacters > 0 ? 1 : 0 });
      gsap.set(".opening-kicker", { opacity: gsap.utils.clamp(0, 1, (progress - .76) / .08) });
      gsap.set(".ghost-word", { yPercent: progress * -70, opacity: progress * .7 });
      gsap.set(".opening-meta", { opacity: 1 - gsap.utils.clamp(0, 1, (progress - .72) / .12) });
    }
  });

  gsap.utils.toArray(".manifesto-copy p").forEach((line, index) => {
    gsap.from(line, { x: index % 2 ? 80 : -80, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: { trigger: line, start: "top 85%" } });
  });

  gsap.utils.toArray(".chapter").forEach(chapter => {
    gsap.from(chapter.querySelector("h2"), { yPercent: 70, opacity: 0, duration: 1, ease: "power4.out", scrollTrigger: { trigger: chapter, start: "top 60%" } });
    gsap.from(chapter.querySelector(".chapter-body"), { y: 40, opacity: 0, duration: .8, delay: .2, scrollTrigger: { trigger: chapter, start: "top 55%" } });
    gsap.to(chapter.querySelector(".chapter-number"), { yPercent: -18, scrollTrigger: { trigger: chapter, start: "top bottom", end: "bottom top", scrub: 1 } });
  });

  gsap.to(".signal span", { scaleY: () => gsap.utils.random(.2, 1), duration: .5, stagger: { each: .09, repeat: -1, yoyo: true }, ease: "sine.inOut" });
  gsap.utils.toArray(".project-plant").forEach((project, index) => {
    const plant = project.querySelector(".botanical");
    const renderer = createPlantAnimation(plant, plant.dataset.species, index + 1);
    const copy = project.querySelector(".plant-copy");
    ScrollTrigger.create({
      trigger: project,
      start: "top 88%",
      end: "bottom 52%",
      scrub: true,
      onUpdate: self => {
        renderer.state.progress = self.progress;
        renderer.draw();
        const copyProgress = gsap.utils.clamp(0, 1, (self.progress - .72) / .2);
        gsap.set(plant, { rotate: (index % 2 ? 1 : -1) * 10 * self.progress, transformOrigin: "50% 100%" });
        gsap.set(copy, { opacity: copyProgress, y: (1 - copyProgress) * 32 });
      }
    });
  });
  gsap.to(".finale-horizon", { scale: 1.35, rotate: 25, scrollTrigger: { trigger: ".finale", start: "top bottom", end: "bottom bottom", scrub: 1 } });
  gsap.from(".finale h2", { y: 100, opacity: 0, duration: 1.2, ease: "power4.out", scrollTrigger: { trigger: ".finale", start: "top 55%" } });
}

if (!reduced) {
  runExperience();
} else {
  document.querySelectorAll(".botanical").forEach((plant, index) => {
    createPlantAnimation(plant, plant.dataset.species, index + 1);
  });
}
createDragonFinale();

const light = document.querySelector(".cursor-light");
window.addEventListener("pointermove", event => {
  if (reduced) return;
  gsap.to(light, { x: event.clientX, y: event.clientY, duration: 1.2, ease: "power3.out" });
  if (window.scrollY < window.innerHeight * 2.4) {
    const x = event.clientX / window.innerWidth - .5;
    const y = event.clientY / window.innerHeight - .5;
    gsap.to(".city img", { x: x * -24, y: y * -16, duration: 1.5, ease: "power3.out", overwrite: "auto" });
  }
});

document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener("click", event => event.preventDefault()));
