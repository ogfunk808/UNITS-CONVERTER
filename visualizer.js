// Uni3D Visualizer Module - Powered by Three.js & GSAP

let scene, camera, renderer, controls;
let activeGroup = null; // Container for current visualization meshes
let particlesGroup = null; // Container for temperature particle effects
let animFrameId = null;

// Mannequin and reference mesh caching
let referenceModel = null;

// Initialize the 3D Scene
function initVisualizer(canvasId, loaderId, onReady) {
    const canvas = document.getElementById(canvasId);
    const loader = document.getElementById(loaderId);
    const container = canvas.parentElement;

    // 1. Create Scene & Environment
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.015);

    // 2. Setup Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 5, 12);

    // 3. Setup WebGL Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Setup Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going under grid
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.target.set(0, 2, 0);

    // 5. Add Grid floor and lights
    addEnvironmentElements();

    // 6. Setup active display groups
    activeGroup = new THREE.Group();
    scene.add(activeGroup);

    particlesGroup = new THREE.Group();
    scene.add(particlesGroup);

    // 7. Handle Window Resizing
    const handleResize = () => {
        const w = container.clientWidth || 800;
        const h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 8. Start Render Loop
    animate();

    // Hide loader & callback
    if (loader) {
        gsap.to(loader, { opacity: 0, duration: 0.5, onComplete: () => loader.style.display = 'none' });
    }
    if (typeof onReady === 'function') onReady();
}

// Reset camera to default position
function resetCamera() {
    if (!camera || !controls) return;
    gsap.to(camera.position, { x: 0, y: 5, z: 12, duration: 0.8, ease: 'power2.out' });
    gsap.to(controls.target, { x: 0, y: 2, z: 0, duration: 0.8, ease: 'power2.out', onUpdate: () => controls.update() });
}

// Set up lighting & background grid helper
function addEnvironmentElements() {
    // Grid Helper
    const gridHelper = new THREE.GridHelper(30, 30, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Key Directional Light (Cast Shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Soft Fill Lights (Neon Glow style)
    const cyanLight = new THREE.PointLight(0x06b6d4, 1.5, 15);
    cyanLight.position.set(-6, 3, -2);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 1.5, 15);
    purpleLight.position.set(6, 3, -2);
    scene.add(purpleLight);
}

// Helper to clear existing visualizer group
function clearActiveGroup() {
    // Stop any ongoing animations
    gsap.killTweensOf(activeGroup.rotation);
    
    // Recursive dispose helper
    while (activeGroup.children.length > 0) {
        const obj = activeGroup.children[0];
        activeGroup.remove(obj);
        disposeHierarchy(obj);
    }
    
    // Clear particles
    while (particlesGroup.children.length > 0) {
        const obj = particlesGroup.children[0];
        particlesGroup.remove(obj);
        disposeHierarchy(obj);
    }
}

// Deep memory cleanup for Three.js geometries and materials
function disposeHierarchy(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
        } else {
            obj.material.dispose();
        }
    }
    if (obj.children) {
        obj.children.forEach(disposeHierarchy);
    }
}

// Generate Canvas texture for text labels
function createTextSprite(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 512, 128);
    
    // Semi-transparent backdrop for text readability
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    roundRect(ctx, 4, 4, 504, 120, 16, true, true);
    
    // Font details
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4, 1, 1);
    return sprite;
}

// Canvas rounded rectangle helper
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// Low-poly humanoid model for scale reference (1.8m height)
function createReferenceMannequin() {
    const group = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x64748b, 
        roughness: 0.5, 
        metalness: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    // Head (Sphere)
    const headGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.y = 1.62;
    head.castShadow = true;
    group.add(head);

    // Torso (Cylinder)
    const torsoGeom = new THREE.CylinderGeometry(0.18, 0.12, 0.6, 12);
    const torso = new THREE.Mesh(torsoGeom, bodyMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    group.add(torso);

    // Legs (Cylinders)
    const legGeom = new THREE.CylinderGeometry(0.07, 0.05, 0.8, 8);
    const leftLeg = new THREE.Mesh(legGeom, bodyMat);
    leftLeg.position.set(-0.09, 0.4, 0);
    leftLeg.castShadow = true;
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.09;
    group.add(leftLeg, rightLeg);

    // Arms
    const armGeom = new THREE.CylinderGeometry(0.06, 0.05, 0.55, 8);
    const leftArm = new THREE.Mesh(armGeom, bodyMat);
    leftArm.position.set(-0.25, 1.1, 0);
    leftArm.rotation.z = 0.1;
    leftArm.castShadow = true;
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.25;
    rightArm.rotation.z = -0.1;
    group.add(leftArm, rightArm);

    // Floating reference tag
    const refLabel = createTextSprite("Human Ref (1.8m)", "#64748b");
    refLabel.position.y = 1.95;
    refLabel.scale.set(2, 0.5, 0.5);
    group.add(refLabel);

    return group;
}


// --- CORE ROUTER FOR VISUALIZATIONS ---
function updateVisualization(category, fromVal, fromUnit, toUnit, toVal) {
    if (!scene) return;
    clearActiveGroup();

    // Adjust camera targets depending on category size
    controls.target.set(0, 2, 0);

    switch (category) {
        case 'length':
            showLengthVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
        case 'area':
            showAreaVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
        case 'volume':
            showVolumeVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
        case 'mass':
            showMassVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
        case 'temperature':
            showTemperatureVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
        case 'speed':
            showSpeedVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
        case 'digital':
            showDigitalVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
        case 'time':
            showTimeVisualization(fromVal, fromUnit, toUnit, toVal);
            break;
    }
}


// --- 1. LENGTH VISUALIZER ---
function showLengthVisualization(fromVal, fromUnit, toUnit, toVal) {
    // Normalize physical sizes to fit well on screen (Target length: 1 to 6 meters visual height)
    // We compute the physical length in meters
    const fromFactor = getUnitFactor('length', fromUnit);
    const physicalMeters = fromVal * fromFactor;

    // Scale mapping factor
    let displayScale = 1.0;
    if (physicalMeters > 0) {
        if (physicalMeters > 50) displayScale = 5 / physicalMeters;
        else if (physicalMeters < 0.1) displayScale = 1 / physicalMeters;
        else displayScale = 3 / physicalMeters;
    }

    const heightFrom = Math.max(0.01, physicalMeters * displayScale);
    const heightTo = Math.max(0.01, toVal * getUnitFactor('length', toUnit) * displayScale);

    // Materials
    const fromMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3, metalness: 0.2, emissive: 0x06b6d4, emissiveIntensity: 0.2 });
    const toMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.3, metalness: 0.2, emissive: 0x8b5cf6, emissiveIntensity: 0.2 });

    // Rulers (Cylinders)
    const radius = 0.15;
    
    // Left cylinder (From)
    const geomFrom = new THREE.CylinderGeometry(radius, radius, heightFrom, 32);
    geomFrom.translate(0, heightFrom / 2, 0); // Pivot at bottom
    const meshFrom = new THREE.Mesh(geomFrom, fromMat);
    meshFrom.position.set(-1.8, 0, 0);
    meshFrom.castShadow = true;
    meshFrom.receiveShadow = true;
    activeGroup.add(meshFrom);

    // Right cylinder (To)
    const geomTo = new THREE.CylinderGeometry(radius, radius, heightTo, 32);
    geomTo.translate(0, heightTo / 2, 0);
    const meshTo = new THREE.Mesh(geomTo, toMat);
    meshTo.position.set(1.8, 0, 0);
    meshTo.castShadow = true;
    meshTo.receiveShadow = true;
    activeGroup.add(meshTo);

    // Create tick marks representing subdivisions on the poles
    // "From" subdivisions
    const ticksFrom = Math.min(10, Math.ceil(fromVal));
    const stepFrom = heightFrom / fromVal;
    for (let i = 0; i <= ticksFrom; i++) {
        const tickGeom = new THREE.BoxGeometry(0.4, 0.02, 0.4);
        const tick = new THREE.Mesh(tickGeom, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        tick.position.set(-1.8, i * stepFrom, 0);
        activeGroup.add(tick);
    }

    // "To" subdivisions
    const ticksTo = Math.min(10, Math.ceil(toVal));
    const stepTo = heightTo / toVal;
    for (let i = 0; i <= ticksTo; i++) {
        const tickGeom = new THREE.BoxGeometry(0.4, 0.02, 0.4);
        const tick = new THREE.Mesh(tickGeom, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        tick.position.set(1.8, i * stepTo, 0);
        activeGroup.add(tick);
    }

    // Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-1.8, heightFrom + 0.6, 0);
    activeGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(1.8, heightTo + 0.6, 0);
    activeGroup.add(labelTo);

    // Reference human model
    const refMan = createReferenceMannequin();
    refMan.position.set(0, 0, 0);
    activeGroup.add(refMan);

    // Introduce entrance zoom animation
    gsap.from([meshFrom.scale, meshTo.scale], { y: 0, duration: 0.6, ease: 'back.out(1.5)', stagger: 0.1 });
}


// --- 2. AREA VISUALIZER ---
function showAreaVisualization(fromVal, fromUnit, toUnit, toVal) {
    const fromFactor = getUnitFactor('area', fromUnit);
    const physicalArea = fromVal * fromFactor;

    // Side length of squares
    const sideFrom = Math.sqrt(physicalArea);
    const sideTo = Math.sqrt(toVal * getUnitFactor('area', toUnit));

    // Normalize side length for viewport (Target size: 1.5 to 5 units side length)
    let displayScale = 1.0;
    if (sideFrom > 0) {
        if (sideFrom > 20) displayScale = 4 / sideFrom;
        else if (sideFrom < 0.2) displayScale = 1 / sideFrom;
        else displayScale = 2.5 / sideFrom;
    }

    const wFrom = Math.max(0.1, sideFrom * displayScale);
    const wTo = Math.max(0.1, sideTo * displayScale);

    // Left Plane (From) - Glowing Glass Mesh with visible edges
    const pFromGeom = new THREE.PlaneGeometry(wFrom, wFrom);
    pFromGeom.rotateX(-Math.PI / 2); // Lay flat
    pFromGeom.translate(0, 0.01, 0); // Lift slightly above grid

    const fromMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.2
    });
    
    const pFrom = new THREE.Mesh(pFromGeom, fromMat);
    pFrom.position.set(-2, 0, 0);
    activeGroup.add(pFrom);

    const edgesFrom = new THREE.EdgesGeometry(pFromGeom);
    const lineFrom = new THREE.LineSegments(edgesFrom, new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 }));
    lineFrom.position.set(-2, 0, 0);
    activeGroup.add(lineFrom);

    // Right Plane (To)
    const pToGeom = new THREE.PlaneGeometry(wTo, wTo);
    pToGeom.rotateX(-Math.PI / 2);
    pToGeom.translate(0, 0.01, 0);

    const toMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.2
    });

    const pTo = new THREE.Mesh(pToGeom, toMat);
    pTo.position.set(2, 0, 0);
    activeGroup.add(pTo);

    const edgesTo = new THREE.EdgesGeometry(pToGeom);
    const lineTo = new THREE.LineSegments(edgesTo, new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 }));
    lineTo.position.set(2, 0, 0);
    activeGroup.add(lineTo);

    // Subgrid details inside the planes to demonstrate subdivisions
    const subdivisionsFrom = Math.min(8, Math.ceil(Math.sqrt(fromVal)));
    if (subdivisionsFrom > 1) {
        const gridFrom = new THREE.GridHelper(wFrom, subdivisionsFrom, 0xffffff, 0x06b6d4);
        gridFrom.position.set(-2, 0.02, 0);
        activeGroup.add(gridFrom);
    }

    const subdivisionsTo = Math.min(8, Math.ceil(Math.sqrt(toVal)));
    if (subdivisionsTo > 1) {
        const gridTo = new THREE.GridHelper(wTo, subdivisionsTo, 0xffffff, 0x8b5cf6);
        gridTo.position.set(2, 0.02, 0);
        activeGroup.add(gridTo);
    }

    // Reference icon (Laptop layout silhouette on grid floor)
    const refGeom = new THREE.BoxGeometry(0.6, 0.01, 0.4);
    const refMesh = new THREE.Mesh(refGeom, new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
    refMesh.position.set(0, 0.005, 0);
    activeGroup.add(refMesh);
    
    const refTag = createTextSprite("Laptop ref (0.6x0.4m)", '#64748b');
    refTag.position.set(0, 0.5, 0);
    refTag.scale.set(1.5, 0.38, 0.38);
    activeGroup.add(refTag);

    // Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-2, 1.2, 0);
    activeGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(2, 1.2, 0);
    activeGroup.add(labelTo);

    // Entrance Animation
    gsap.from([pFrom.scale, pTo.scale, lineFrom.scale, lineTo.scale], { x: 0, z: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 });
}


// --- 3. VOLUME VISUALIZER ---
function showVolumeVisualization(fromVal, fromUnit, toUnit, toVal) {
    const fromFactor = getUnitFactor('volume', fromUnit);
    const physicalLiters = fromVal * fromFactor;

    // Containers radius/height setup (Let's represent them as glass cylinders)
    const maxRadius = 0.9;
    const glassHeight = 3.0;

    // Calculate fluid level height based on quantity
    // Base standard represents 5 Liters visually filling the cup
    let displayFactor = 1.0;
    if (physicalLiters > 0) {
        if (physicalLiters > 100) displayFactor = 50 / physicalLiters;
        else if (physicalLiters < 0.5) displayFactor = 2 / physicalLiters;
        else displayFactor = 2.0 / physicalLiters;
    }

    // Calculate actual liquid level heights (Clamped to fit glass containers)
    const liquidVolumeRatio = Math.min(1.0, physicalLiters * displayFactor / 5.0);
    const liquidHeight = Math.max(0.05, liquidVolumeRatio * glassHeight * 0.9); // Capped at 90% full

    // 3D Glass Cylinders
    const glassGeom = new THREE.CylinderGeometry(maxRadius, maxRadius, glassHeight, 32, 1, true);
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        roughness: 0.1,
        metalness: 0.9,
        side: THREE.DoubleSide
    });

    // Glass Base circles
    const baseGeom = new THREE.CylinderGeometry(maxRadius, maxRadius, 0.1, 32);

    // Left Container (From)
    const containerFrom = new THREE.Mesh(glassGeom, glassMat);
    containerFrom.position.set(-2, glassHeight / 2, 0);
    activeGroup.add(containerFrom);

    const baseFrom = new THREE.Mesh(baseGeom, glassMat);
    baseFrom.position.set(-2, 0.05, 0);
    activeGroup.add(baseFrom);

    // Right Container (To)
    const containerTo = containerFrom.clone();
    containerTo.position.x = 2;
    activeGroup.add(containerTo);

    const baseTo = baseFrom.clone();
    baseTo.position.x = 2;
    activeGroup.add(baseTo);

    // Glowing Fluids
    const liquidFromGeom = new THREE.CylinderGeometry(maxRadius - 0.02, maxRadius - 0.02, liquidHeight, 32);
    liquidFromGeom.translate(0, liquidHeight / 2, 0); // Bottom anchor

    const liquidFromMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.7,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.3
    });

    const liquidToMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.7,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.3
    });

    const fluidFrom = new THREE.Mesh(liquidFromGeom, liquidFromMat);
    fluidFrom.position.set(-2, 0.1, 0);
    fluidFrom.castShadow = true;
    activeGroup.add(fluidFrom);

    const fluidTo = new THREE.Mesh(liquidFromGeom, liquidToMat);
    fluidTo.position.set(2, 0.1, 0);
    fluidTo.castShadow = true;
    activeGroup.add(fluidTo);

    // Glass measurement lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const markGeom = new THREE.RingGeometry(maxRadius - 0.01, maxRadius, 32);
    markGeom.rotateX(Math.PI / 2);

    for (let i = 1; i <= 5; i++) {
        const ringY = (glassHeight / 5) * i;
        
        const ringL = new THREE.LineLoop(markGeom, lineMat);
        ringL.position.set(-2, ringY, 0);
        activeGroup.add(ringL);

        const ringR = ringL.clone();
        ringR.position.x = 2;
        activeGroup.add(ringR);
    }

    // Floating Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-2, glassHeight + 0.6, 0);
    activeGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(2, glassHeight + 0.6, 0);
    activeGroup.add(labelTo);

    // Reference Soda Can model next to it (12 fl oz, 12cm height, 6.6cm diam)
    const canGroup = new THREE.Group();
    const canGeom = new THREE.CylinderGeometry(0.33, 0.33, 1.2, 16);
    const canMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.3 });
    const can = new THREE.Mesh(canGeom, canMat);
    can.position.y = 0.6;
    can.castShadow = true;
    canGroup.add(can);

    const canLabel = createTextSprite("Soda Can Ref (355ml)", '#ef4444');
    canLabel.position.y = 1.4;
    canLabel.scale.set(1.5, 0.38, 0.38);
    canGroup.add(canLabel);

    canGroup.position.set(0, 0, 0.5);
    activeGroup.add(canGroup);

    // Fluid filling animation
    gsap.from([fluidFrom.scale, fluidTo.scale], { y: 0, duration: 1.0, ease: 'power2.out' });
}


// --- 4. MASS/WEIGHT VISUALIZER ---
function showMassVisualization(fromVal, fromUnit, toUnit, toVal) {
    const fromFactor = getUnitFactor('mass', fromUnit);
    const physicalKgs = fromVal * fromFactor;

    // Scale factors for visual representations of masses (boxes)
    let sizeFrom = 0.6;
    if (physicalKgs > 0) {
        if (physicalKgs > 100) sizeFrom = 0.3 * Math.log10(physicalKgs);
        else if (physicalKgs < 0.1) sizeFrom = 0.2;
        else sizeFrom = 0.4 + (physicalKgs * 0.05);
    }
    sizeFrom = Math.min(1.2, Math.max(0.15, sizeFrom));

    // Balance scale geometry group
    const scaleGroup = new THREE.Group();
    activeGroup.add(scaleGroup);

    // 1. Center base and pole (Metallic)
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });
    const baseGeom = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 24);
    const base = new THREE.Mesh(baseGeom, metalMat);
    base.position.y = 0.075;
    base.receiveShadow = true;
    scaleGroup.add(base);

    const pillarGeom = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 16);
    const pillar = new THREE.Mesh(pillarGeom, metalMat);
    pillar.position.y = 1.6;
    pillar.castShadow = true;
    scaleGroup.add(pillar);

    // 2. Pivoting Beam
    const beamGeom = new THREE.BoxGeometry(4.4, 0.15, 0.15);
    const beam = new THREE.Mesh(beamGeom, metalMat);
    beam.position.set(0, 3.2, 0);
    beam.castShadow = true;
    scaleGroup.add(beam);

    // 3. Hanging Pan lines & pans
    const panWireGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8);
    const panPlateGeom = new THREE.CylinderGeometry(0.9, 0.9, 0.05, 32);
    
    // Left Hanging Pan Group
    const leftPanGroup = new THREE.Group();
    leftPanGroup.position.set(-2.2, 3.2, 0); // Relative to beam left end

    const leftPanPlate = new THREE.Mesh(panPlateGeom, metalMat);
    leftPanPlate.position.y = -1.4;
    leftPanPlate.receiveShadow = true;
    leftPanPlate.castShadow = true;
    leftPanGroup.add(leftPanPlate);

    // Wires (Triangular suspension look)
    const lWire1 = new THREE.Mesh(panWireGeom, metalMat);
    lWire1.position.set(0, -0.7, 0);
    leftPanGroup.add(lWire1);

    scaleGroup.add(leftPanGroup);

    // Right Hanging Pan Group
    const rightPanGroup = leftPanGroup.clone();
    rightPanGroup.position.x = 2.2;
    scaleGroup.add(rightPanGroup);

    // 4. Weight Masses
    // From Block (Cyan box)
    const blockFromGeom = new THREE.BoxGeometry(sizeFrom, sizeFrom, sizeFrom);
    const blockFromMat = new THREE.MeshStandardMaterial({ 
        color: 0x06b6d4, 
        roughness: 0.4, 
        metalness: 0.1,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.25 
    });
    const blockFrom = new THREE.Mesh(blockFromGeom, blockFromMat);
    blockFrom.position.set(-2.2, 3.2 - 1.4 + sizeFrom/2, 0);
    blockFrom.castShadow = true;
    scaleGroup.add(blockFrom);

    // To Block (Purple box) - Sized equivalent to highlight equivalence
    const blockToGeom = new THREE.BoxGeometry(sizeFrom, sizeFrom, sizeFrom);
    const blockToMat = new THREE.MeshStandardMaterial({ 
        color: 0x8b5cf6, 
        roughness: 0.4, 
        metalness: 0.1,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.25 
    });
    const blockTo = new THREE.Mesh(blockToGeom, blockToMat);
    blockTo.position.set(2.2, 3.2 - 1.4 + sizeFrom/2, 0);
    blockTo.castShadow = true;
    scaleGroup.add(blockTo);

    // 5. Floating Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-2.2, 3.2 + 0.6, 0);
    scaleGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(2.2, 3.2 + 0.6, 0);
    scaleGroup.add(labelTo);

    // --- Dynamic Balance Scale Animation ---
    // Simulates placing masses onto the scale: it dips, oscillates, and balances.
    const initialTilt = -0.15; // Left side goes down initially (heavy drop simulation)
    
    // Set initial off-balance values
    beam.rotation.z = initialTilt;
    leftPanGroup.position.y = 3.2 + Math.sin(initialTilt) * 2.2;
    rightPanGroup.position.y = 3.2 - Math.sin(initialTilt) * 2.2;
    blockFrom.position.y = leftPanGroup.position.y - 1.4 + sizeFrom/2;
    blockTo.position.y = rightPanGroup.position.y - 1.4 + sizeFrom/2;

    // GSAP dampened oscillation animation to perfectly balance
    const tl = gsap.timeline();
    tl.to(beam.rotation, {
        z: 0.08,
        duration: 0.5,
        ease: 'power1.inOut',
        onUpdate: syncPanPositions
    })
    .to(beam.rotation, {
        z: -0.04,
        duration: 0.6,
        ease: 'power1.inOut',
        onUpdate: syncPanPositions
    })
    .to(beam.rotation, {
        z: 0.02,
        duration: 0.7,
        onUpdate: syncPanPositions
    })
    .to(beam.rotation, {
        z: 0,
        duration: 0.9,
        ease: 'elastic.out(1, 0.4)',
        onUpdate: syncPanPositions
    });

    function syncPanPositions() {
        const angle = beam.rotation.z;
        
        // Pan positions pivot at end of beams
        leftPanGroup.position.y = 3.2 + Math.sin(angle) * 2.2;
        leftPanGroup.position.x = -Math.cos(angle) * 2.2;
        
        rightPanGroup.position.y = 3.2 - Math.sin(angle) * 2.2;
        rightPanGroup.position.x = Math.cos(angle) * 2.2;

        blockFrom.position.x = leftPanGroup.position.x;
        blockFrom.position.y = leftPanGroup.position.y - 1.4 + sizeFrom/2;

        blockTo.position.x = rightPanGroup.position.x;
        blockTo.position.y = rightPanGroup.position.y - 1.4 + sizeFrom/2;
    }
}


// --- 5. TEMPERATURE VISUALIZER ---
function showTemperatureVisualization(fromVal, fromUnit, toUnit, toVal) {
    // We convert everything to Celsius for visual mapping
    let tempC = fromVal;
    if (fromUnit === '°F') tempC = (fromVal - 32) * 5/9;
    else if (fromUnit === 'K') tempC = fromVal - 273.15;

    // Thermometer structure
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.1,
        metalness: 0.2
    });

    // Outer glass tube
    const outerGeom = new THREE.CylinderGeometry(0.35, 0.35, 3.6, 24);
    const outerTube = new THREE.Mesh(outerGeom, glassMat);
    outerTube.position.y = 2.1;
    activeGroup.add(outerTube);

    // Bulb glass sphere at bottom
    const bulbGeom = new THREE.SphereGeometry(0.6, 24, 24);
    const bulb = new THREE.Mesh(bulbGeom, glassMat);
    bulb.position.y = 0.4;
    activeGroup.add(bulb);

    // Determine color scheme based on temperature
    // Freezing (<0 C) = Neon Blue
    // Moderate (0 to 30 C) = Neon Cyan
    // Hot (>30 C) = Neon Pink/Red
    let glowColor = 0x06b6d4; // Default cyan
    let particlesType = 'none'; // 'snow' or 'fire'

    if (tempC < 0) {
        glowColor = 0x3b82f6; // Blue
        particlesType = 'snow';
    } else if (tempC > 30) {
        glowColor = 0xf43f5e; // Pink-Red
        particlesType = 'fire';
    }

    // Thermometer fluid column height mapping
    // Normal bounds: -40°C to 100°C visually matches height 0.5 to 3.5 units
    let visualRatio = (tempC + 40) / 140; 
    visualRatio = Math.max(0.01, Math.min(1.0, visualRatio)); // Clamp
    const colHeight = 0.1 + (visualRatio * 3.1);

    // Fluid column cylinder
    const columnGeom = new THREE.CylinderGeometry(0.18, 0.18, colHeight, 16);
    columnGeom.translate(0, colHeight / 2, 0); // Anchor pivot at bottom
    
    const columnMat = new THREE.MeshStandardMaterial({
        color: glowColor,
        roughness: 0.1,
        metalness: 0.1,
        emissive: glowColor,
        emissiveIntensity: 0.6
    });
    
    const fluidCol = new THREE.Mesh(columnGeom, columnMat);
    fluidCol.position.set(0, 0.4, 0);
    activeGroup.add(fluidCol);

    // Bulb liquid content
    const bulbLiquidGeom = new THREE.SphereGeometry(0.48, 16, 16);
    const bulbLiquid = new THREE.Mesh(bulbLiquidGeom, columnMat);
    bulbLiquid.position.y = 0.4;
    activeGroup.add(bulbLiquid);

    // Ticks & Labels on the digital thermometer
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    for (let i = 0; i <= 10; i++) {
        const tickY = 0.5 + (3.0 / 10) * i;
        const tickL = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, tickY, 0), new THREE.Vector3(-0.35, tickY, 0)]),
            lineMat
        );
        const tickR = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.35, tickY, 0), new THREE.Vector3(0.5, tickY, 0)]),
            lineMat
        );
        activeGroup.add(tickL, tickR);
    }

    // Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-1.8, 2.2, 0);
    activeGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(1.8, 2.2, 0);
    activeGroup.add(labelTo);

    // Particle effect systems (Heartbeat / snow / sparks)
    initTemperatureParticles(particlesType, glowColor);

    // GSAP rise animation
    gsap.from(fluidCol.scale, { y: 0, duration: 1.0, ease: 'power2.out' });
}

// Particle System engine for extreme premium feel
function initTemperatureParticles(type, colorHex) {
    if (type === 'none') return;

    const count = 40;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
        // Distribute particles randomly around the thermometer
        const angle = Math.random() * Math.PI * 2;
        const r = 0.5 + Math.random() * 1.5;
        
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = Math.random() * 4.0; // Random heights
        positions[i * 3 + 2] = Math.sin(angle) * r;

        // Custom speeds
        velocities.push({
            x: (Math.random() - 0.5) * 0.01,
            y: type === 'snow' ? -(0.01 + Math.random() * 0.015) : (0.015 + Math.random() * 0.02),
            z: (Math.random() - 0.5) * 0.01,
            wobbleSpeed: 1 + Math.random() * 3,
            wobbleWidth: 0.01 + Math.random() * 0.02
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle material
    const mat = new THREE.PointsMaterial({
        color: colorHex,
        size: type === 'snow' ? 0.08 : 0.06,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, mat);
    particles.userData = { velocities, type, birthtime: Date.now() };
    particlesGroup.add(particles);
}

// Update particle motions within rendering loop
function updateParticles() {
    if (particlesGroup.children.length === 0) return;

    particlesGroup.children.forEach(points => {
        const geo = points.geometry;
        const posAttr = geo.attributes.position;
        const velocities = points.userData.velocities;
        const type = points.userData.type;
        const time = (Date.now() - points.userData.birthtime) * 0.001;

        for (let i = 0; i < posAttr.count; i++) {
            let px = posAttr.getX(i);
            let py = posAttr.getY(i);
            let pz = posAttr.getZ(i);
            const vel = velocities[i];

            py += vel.y;
            px += vel.x + Math.sin(time * vel.wobbleSpeed) * vel.wobbleWidth;
            pz += vel.z + Math.cos(time * vel.wobbleSpeed) * vel.wobbleWidth;

            // Recycler boundaries
            if (type === 'snow' && py < 0) {
                py = 4.0;
                px = (Math.random() - 0.5) * 2;
                pz = (Math.random() - 0.5) * 2;
            } else if (type === 'fire' && py > 4.0) {
                py = 0.4; // Restart near bulb
                px = (Math.random() - 0.5) * 0.8;
                pz = (Math.random() - 0.5) * 0.8;
            }

            posAttr.setXYZ(i, px, py, pz);
        }

        posAttr.needsUpdate = true;
    });
}


// --- 6. SPEED VISUALIZER ---
function showSpeedVisualization(fromVal, fromUnit, toUnit, toVal) {
    const mpsFrom = fromVal * getUnitFactor('speed', fromUnit);
    const mpsTo = toVal * getUnitFactor('speed', toUnit);

    // Create 3D track platform
    const trackGeom = new THREE.BoxGeometry(6, 0.2, 2);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const track = new THREE.Mesh(trackGeom, trackMat);
    track.position.set(0, 0.1, 0);
    track.receiveShadow = true;
    activeGroup.add(track);

    // Glowing speed orb / craft (Left - From)
    const craftFromGeom = new THREE.ConeGeometry(0.3, 0.8, 16);
    craftFromGeom.rotateZ(-Math.PI / 2);
    const craftFromMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.5 });
    const craftFrom = new THREE.Mesh(craftFromGeom, craftFromMat);
    craftFrom.position.set(-2, 0.6, -0.4);
    craftFrom.castShadow = true;
    activeGroup.add(craftFrom);

    // Glowing speed orb / craft (Right - To)
    const craftToGeom = new THREE.ConeGeometry(0.3, 0.8, 16);
    craftToGeom.rotateZ(-Math.PI / 2);
    const craftToMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 0.5 });
    const craftTo = new THREE.Mesh(craftToGeom, craftToMat);
    craftTo.position.set(-2, 0.6, 0.4);
    craftTo.castShadow = true;
    activeGroup.add(craftTo);

    // Speed vector trail particles
    const speedScale = Math.min(3, Math.max(0.2, mpsFrom / 10));
    gsap.to(craftFrom.position, { x: 2, duration: Math.max(0.5, 4 / speedScale), repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(craftTo.position, { x: 2, duration: Math.max(0.5, 4 / speedScale), repeat: -1, yoyo: true, ease: 'sine.inOut' });

    // Floating Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-1.8, 1.8, -0.4);
    activeGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(1.8, 1.8, 0.4);
    activeGroup.add(labelTo);
}

// --- 7. DIGITAL DATA VISUALIZER ---
function showDigitalVisualization(fromVal, fromUnit, toUnit, toVal) {
    const bytesFrom = fromVal * getUnitFactor('digital', fromUnit);
    const stackCountFrom = Math.min(8, Math.max(1, Math.ceil(Math.log10(bytesFrom + 1))));

    // Server stack (From)
    for (let i = 0; i < stackCountFrom; i++) {
        const geom = new THREE.BoxGeometry(1.4, 0.25, 1.4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x06b6d4,
            emissiveIntensity: 0.2
        });
        const serverBlock = new THREE.Mesh(geom, mat);
        serverBlock.position.set(-1.8, 0.2 + i * 0.3, 0);
        serverBlock.castShadow = true;
        activeGroup.add(serverBlock);
    }

    // Server stack (To)
    for (let i = 0; i < stackCountFrom; i++) {
        const geom = new THREE.BoxGeometry(1.4, 0.25, 1.4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x8b5cf6,
            emissiveIntensity: 0.2
        });
        const serverBlock = new THREE.Mesh(geom, mat);
        serverBlock.position.set(1.8, 0.2 + i * 0.3, 0);
        serverBlock.castShadow = true;
        activeGroup.add(serverBlock);
    }

    // Floating Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-1.8, 0.5 + stackCountFrom * 0.3, 0);
    activeGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(1.8, 0.5 + stackCountFrom * 0.3, 0);
    activeGroup.add(labelTo);
}

// --- 8. TIME VISUALIZER ---
function showTimeVisualization(fromVal, fromUnit, toUnit, toVal) {
    const secFrom = fromVal * getUnitFactor('time', fromUnit);

    // Glowing Holographic Clock Ring
    const ringGeom = new THREE.TorusGeometry(1.6, 0.08, 16, 64);
    const ringMatFrom = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.5 });
    const ringFrom = new THREE.Mesh(ringGeom, ringMatFrom);
    ringFrom.position.set(-1.8, 1.8, 0);
    activeGroup.add(ringFrom);

    const ringMatTo = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 0.5 });
    const ringTo = new THREE.Mesh(ringGeom, ringMatTo);
    ringTo.position.set(1.8, 1.8, 0);
    activeGroup.add(ringTo);

    // Rotating clock hands
    const handGeom = new THREE.BoxGeometry(0.06, 1.2, 0.06);
    handGeom.translate(0, 0.5, 0);
    
    const handFrom = new THREE.Mesh(handGeom, ringMatFrom);
    handFrom.position.set(-1.8, 1.8, 0);
    activeGroup.add(handFrom);

    const handTo = new THREE.Mesh(handGeom, ringMatTo);
    handTo.position.set(1.8, 1.8, 0);
    activeGroup.add(handTo);

    const speedRatio = Math.min(5, Math.max(0.1, secFrom / 60));
    gsap.to(handFrom.rotation, { z: `-=${Math.PI * 2}`, duration: Math.max(1, 6 / speedRatio), repeat: -1, ease: 'none' });
    gsap.to(handTo.rotation, { z: `-=${Math.PI * 2}`, duration: Math.max(1, 6 / speedRatio), repeat: -1, ease: 'none' });

    // Floating Labels
    const labelFrom = createTextSprite(`${fromVal} ${fromUnit}`, '#06b6d4');
    labelFrom.position.set(-1.8, 3.6, 0);
    activeGroup.add(labelFrom);

    const labelTo = createTextSprite(`${formatNumberText(toVal)} ${toUnit}`, '#8b5cf6');
    labelTo.position.set(1.8, 3.6, 0);
    activeGroup.add(labelTo);
}

// --- UTILITY MATHEMATICAL CONTROLS ---
function getUnitFactor(category, unitKey) {
    const factors = {
        length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
        area: { 'm²': 1, 'km²': 1000000, 'cm²': 0.0001, 'mi²': 2589988.11, ac: 4046.856, ha: 10000, 'ft²': 0.09290304 },
        volume: { L: 1, mL: 0.001, 'm³': 1000, gal: 3.78541178, qt: 0.94635294, cup: 0.23658823, 'fl oz': 0.02957352 },
        mass: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523, st: 6.35029318 },
        speed: { 'm/s': 1.0, 'km/h': 0.277777778, 'mph': 0.44704, 'knot': 0.514444444 },
        digital: { 'B': 1.0, 'KB': 1024.0, 'MB': 1048576.0, 'GB': 1073741824.0, 'TB': 1099511627776.0 },
        time: { 's': 1.0, 'min': 60.0, 'hr': 3600.0, 'day': 86400.0 }
    };
    return (factors[category] && factors[category][unitKey]) || 1.0;
}

function formatNumberText(num) {
    if (num === 0) return '0.00';
    const absVal = Math.abs(num);
    if (absVal < 1e-3 || absVal > 1e5) {
        return num.toExponential(3);
    }
    return absVal > 10 ? num.toFixed(1) : num.toFixed(3);
}


// --- MAIN RENDERING ANIMATION ENGINE ---
function animate() {
    animFrameId = requestAnimationFrame(animate);

    // Rotate the visualizer group gently for added visual dimension
    if (activeGroup && activeGroup.children.length > 0) {
        // Slow lazy idle rotations
        activeGroup.rotation.y += 0.0018;
    }

    // Move floating items
    updateParticles();

    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

export { initVisualizer, resetCamera, updateVisualization };
