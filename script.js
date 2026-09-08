import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const wrapper = document.getElementById('hero-canvas-wrapper');

// GSAP Initialization
gsap.registerPlugin(ScrollTrigger);

if (wrapper) {
  // ===== SCENE SETUP =====
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f1a);
  
  const camera = new THREE.PerspectiveCamera(45, wrapper.clientWidth / wrapper.clientHeight, 0.1, 1000);
  camera.position.set(6, 4, 12);
  camera.lookAt(0, 0, 0);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrapper.appendChild(renderer.domElement);

  // ===== LIGHTING =====
  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);
  
  const mainLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  mainLight.position.set(5, 10, 7);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  scene.add(mainLight);
  
  const fillLight = new THREE.DirectionalLight(0x4466ff, 0.4);
  fillLight.position.set(-5, 2, 5);
  scene.add(fillLight);
  
  const backLight = new THREE.PointLight(0xd4af37, 0.6);
  backLight.position.set(-2, 1, -5);
  scene.add(backLight);
  
  const rimLight = new THREE.PointLight(0xd4af37, 0.3);
  rimLight.position.set(3, 2, -4);
  scene.add(rimLight);

  // ===== FLOOR =====
  const floorGeo = new THREE.PlaneGeometry(14, 14);
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.4, color: 0x000000 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.5;
  floor.receiveShadow = true;
  scene.add(floor);
  
  const gridHelper = new THREE.GridHelper(12, 16, 0xd4af37, 0x3a4a6a);
  gridHelper.position.y = -1.4;
  scene.add(gridHelper);

  // ===== PHYSICS WORLD =====
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0.5;
  
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  groundBody.position.y = -1.5;
  world.addBody(groundBody);

  // ===== CREATE OBJECTS =====
  const objects = [];
  const colors = [0xd4af37, 0x4a7db4, 0xe67e22, 0x2ecc71, 0xe74c3c, 0x9b59b6];
  
  function createPhysicsObject(shape, pos, size, color) {
    let mesh;
    if (shape === 'sphere') {
      const geo = new THREE.SphereGeometry(size, 32, 32);
      const mat = new THREE.MeshStandardMaterial({ 
        color, roughness: 0.2, metalness: 0.6, 
        emissive: new THREE.Color(color).multiplyScalar(0.1) 
      });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({ 
        color, roughness: 0.3, metalness: 0.4, 
        emissive: new THREE.Color(color).multiplyScalar(0.05) 
      });
      mesh = new THREE.Mesh(geo, mat);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(pos);
    scene.add(mesh);
    
    let body;
    if (shape === 'sphere') {
      body = new CANNON.Body({ mass: 1 });
      body.addShape(new CANNON.Sphere(size));
    } else {
      body = new CANNON.Body({ mass: 1 });
      body.addShape(new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2)));
    }
    body.position.set(pos.x, pos.y, pos.z);
    world.addBody(body);
    return { mesh, body, shape, size };
  }

  const positions = [
    { x: -2.5, y: 2, z: 1.5 }, { x: 0, y: 3, z: -1 }, { x: 2.8, y: 1.5, z: 2 },
    { x: -1.8, y: 4, z: -2 }, { x: 1.5, y: 2.5, z: -2.5 }, { x: -0.5, y: 5, z: 0.5 },
    { x: 3.2, y: 3.2, z: -1.2 }, { x: -3, y: 2.8, z: -1.8 }
  ];
  const shapes = ['sphere', 'box', 'sphere', 'box', 'sphere', 'box', 'sphere', 'box'];
  
  positions.forEach((p, i) => {
    const color = colors[i % colors.length];
    const size = 0.5 + Math.random() * 0.4;
    const shape = shapes[i % shapes.length];
    const obj = createPhysicsObject(shape, new THREE.Vector3(p.x, p.y, p.z), size, color);
    objects.push(obj);
  });

  // ===== DRAG INTERACTION =====
  let selectedBody = null, selectedMesh = null;
  let dragPlane = new THREE.Plane(), offset = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const meshes = objects.map(o => o.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const obj = objects.find(o => o.mesh === hit);
      if (obj) {
        selectedBody = obj.body;
        selectedMesh = obj.mesh;
        selectedBody.velocity.set(0, 0, 0);
        const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        dragPlane.setFromNormalAndCoplanarPoint(planeNormal, selectedMesh.position);
        const pt = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, pt);
        if (pt) offset.copy(pt).sub(selectedMesh.position);
        if (selectedMesh.material) {
          selectedMesh.material.emissive.setHex(0xd4af37);
          setTimeout(() => { 
            if (selectedMesh.material) selectedMesh.material.emissive.setHex(0x000000); 
          }, 150);
        }
      }
    }
  }

  function onPointerMove(event) {
    if (!selectedBody) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const pt = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, pt);
    if (pt) {
      const newPos = pt.clone().sub(offset);
      newPos.x = Math.min(5, Math.max(-5, newPos.x));
      newPos.z = Math.min(5, Math.max(-5, newPos.z));
      newPos.y = Math.max(-1, newPos.y);
      selectedBody.position.set(newPos.x, newPos.y, newPos.z);
      selectedBody.velocity.set(0, 0, 0);
    }
  }

  function onPointerUp(event) {
    if (selectedBody) {
      const vel = new THREE.Vector3((event.movementX || 0) * 0.03, (event.movementY || 0) * 0.03, 0);
      selectedBody.velocity.set(vel.x, vel.y + 1.5, vel.z);
      selectedBody = null;
      selectedMesh = null;
    }
  }

  // ===== EVENT LISTENERS =====
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  
  renderer.domElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    onPointerDown({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });
  
  window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    if (touch) onPointerMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });
  
  window.addEventListener('touchend', (e) => {
    onPointerUp({ movementX: 0, movementY: 0 });
  });

  // ===== COLLISION EFFECT =====
  world.addEventListener('postStep', () => {
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const speed = obj.body.velocity.length();
      if (speed > 2.5 && obj.mesh.material) {
        obj.mesh.material.emissive.setHex(0xd4af37);
        setTimeout(() => { 
          if (obj.mesh.material) obj.mesh.material.emissive.setHex(0x000000); 
        }, 200);
      }
    }
  });

  // ===== ANIMATION LOOP =====
  function animate() {
    requestAnimationFrame(animate);
    world.step(1/60);
    objects.forEach(obj => {
      obj.mesh.position.copy(obj.body.position);
      obj.mesh.quaternion.copy(obj.body.quaternion);
    });
    renderer.render(scene, camera);
  }
  animate();

  // ===== RESIZE HANDLER =====
  window.addEventListener('resize', () => {
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ===== SCROLL REACTIVE LIGHTING =====
  window.addEventListener('scroll', () => {
    const y = window.scrollY / window.innerHeight;
    mainLight.position.y = 10 + y * 3;
    rimLight.intensity = 0.3 + y * 0.2;
  });

  // ===== GSAP REVEALS =====
  document.querySelectorAll('.reveal').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 50 }, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  // ===== CTA BUTTONS (Updated to redirect to Contact Page) =====
  document.getElementById('cta-hero')?.addEventListener('click', () => {
    window.location.href = 'contact.html';
  });
  
  document.getElementById('cta-admission')?.addEventListener('click', () => {
    window.location.href = 'contact.html';
  });

  // ===== FAQ ACCORDION (Agar index.html mein hai) =====
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      item.classList.toggle('active');
    });
  });

  // ===== PRICING TOGGLE (Agar index.html mein hai) =====
  const toggle = document.getElementById('pricingToggle');
  if (toggle) {
    let yearly = false;
    toggle.addEventListener('click', () => {
      yearly = !yearly;
      toggle.classList.toggle('active');
      const pro = document.getElementById('proPrice');
      const ent = document.getElementById('enterprisePrice');
      if (yearly) {
        pro.innerHTML = '$15 <span>/mo</span>';
        ent.innerHTML = '$39 <span>/mo</span>';
      } else {
        pro.innerHTML = '$19 <span>/mo</span>';
        ent.innerHTML = '$49 <span>/mo</span>';
      }
    });
  }

  console.log('🚀 EduSphere 3D physics active');
}