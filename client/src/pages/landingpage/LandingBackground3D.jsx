import { useEffect, useRef } from "react";

export default function LandingBackground3D() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;
    let dispose = () => {};

    // Load the 3D engine after the page content. The CSS aurora remains as a fallback.
    import("three").then(THREE => {
      if (cancelled || !host) return;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      } catch {
        return;
      }

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const compact = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x121110, 0.018);
      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 110);
      camera.position.set(0, 7, 23);
      renderer.setClearColor(0x121110, 0);
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      const terrainGeometry = new THREE.PlaneGeometry(95, 85, compact ? 38 : 72, compact ? 30 : 54);
      terrainGeometry.rotateX(-Math.PI / 2);
      const terrainMaterial = new THREE.MeshBasicMaterial({ color: 0xe0b66e, wireframe: true, transparent: true, opacity: compact ? 0.25 : 0.3, depthWrite: false });
      const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
      terrain.position.set(0, -6, -19);
      scene.add(terrain);
      const vertices = terrainGeometry.attributes.position;
      vertices.setUsage(THREE.DynamicDrawUsage);

      const particleCount = compact ? 55 : 130;
      const particlePositions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        particlePositions[index * 3] = ((index * 37 % 101) / 100 - 0.5) * 65;
        particlePositions[index * 3 + 1] = ((index * 23 % 97) / 96) * 23 - 5;
        particlePositions[index * 3 + 2] = -((index * 17 % 89) / 88) * 55;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      const particleMaterial = new THREE.PointsMaterial({ color: 0xffdda0, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      const shapeGeometry = new THREE.IcosahedronGeometry(1.6, 0);
      const shapeMaterial = new THREE.MeshBasicMaterial({ color: 0xe4b974, wireframe: true, transparent: true, opacity: 0.36, depthWrite: false });
      const shapes = [
        [-17, 7, -14], [19, 10, -24], [11, -1, -8], [-9, 13, -34], [-22, 0, -20], [25, 3, -32],
      ].slice(0, compact ? 3 : 6).map((position, index) => {
        const mesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
        mesh.position.set(...position);
        mesh.userData.baseY = position[1];
        mesh.scale.setScalar(0.7 + index * 0.25);
        scene.add(mesh);
        return mesh;
      });

      let frame = 0;
      let previous = 0;
      let elapsed = 0;
      let targetX = 0;
      let targetY = 0;
      let contextLost = false;
      const frameInterval = 1000 / (compact ? 24 : 30);

      const render = () => {
        for (let index = 0; index < vertices.count; index += 1) {
          const x = vertices.getX(index);
          const z = vertices.getZ(index);
          vertices.setY(index, Math.sin(x * 0.14 + elapsed * 0.5) * 2 + Math.cos(z * 0.17 + elapsed * 0.38) * 1.4 + Math.sin((x + z) * 0.09 + elapsed * 0.3) * 1.8);
        }
        vertices.needsUpdate = true;
        particles.rotation.y = Math.sin(elapsed * 0.07) * 0.2;
        particles.position.y = Math.sin(elapsed * 0.22) * 1.1;
        shapes.forEach((shape, index) => {
          shape.rotation.set(elapsed * 0.12 + index, elapsed * 0.16, index * 0.3);
          shape.position.y = shape.userData.baseY + Math.sin(elapsed * 0.35 + index) * 0.9;
        });
        camera.position.x += ((reducedMotion.matches ? 0 : targetX) - camera.position.x) * 0.035;
        camera.position.y += (7 + (reducedMotion.matches ? 0 : targetY) - camera.position.y) * 0.035;
        camera.lookAt(0, -1, -12);
        renderer.render(scene, camera);
      };

      const animate = now => {
        frame = 0;
        if (cancelled || contextLost || document.hidden || reducedMotion.matches) return;
        if (now - previous >= frameInterval) {
          elapsed += Math.min((now - previous) / 1000, 0.06);
          previous = now;
          render();
        }
        frame = requestAnimationFrame(animate);
      };

      const syncAnimation = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        if (document.hidden || contextLost || cancelled) return;
        render();
        previous = performance.now();
        if (!reducedMotion.matches) frame = requestAnimationFrame(animate);
      };
      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height || contextLost) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.5));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
      };
      const movePointer = event => {
        if (reducedMotion.matches || event.pointerType !== "mouse" || compact) return;
        targetX = (event.clientX / window.innerWidth - 0.5) * 3;
        targetY = (event.clientY / window.innerHeight - 0.5) * 1.5;
      };
      const loseContext = event => {
        event.preventDefault();
        contextLost = true;
        cancelAnimationFrame(frame);
      };
      const restoreContext = () => { contextLost = false; resize(); syncAnimation(); };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      window.addEventListener("pointermove", movePointer, { passive: true });
      document.addEventListener("visibilitychange", syncAnimation);
      reducedMotion.addEventListener("change", syncAnimation);
      renderer.domElement.addEventListener("webglcontextlost", loseContext);
      renderer.domElement.addEventListener("webglcontextrestored", restoreContext);

      dispose = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener("pointermove", movePointer);
        document.removeEventListener("visibilitychange", syncAnimation);
        reducedMotion.removeEventListener("change", syncAnimation);
        renderer.domElement.removeEventListener("webglcontextlost", loseContext);
        renderer.domElement.removeEventListener("webglcontextrestored", restoreContext);
        [terrainGeometry, terrainMaterial, particleGeometry, particleMaterial, shapeGeometry, shapeMaterial].forEach(resource => resource.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
      resize();
      syncAnimation();
    }).catch(() => { dispose(); });

    return () => { cancelled = true; dispose(); };
  }, []);

  return <div className="home-background-3d" ref={hostRef} aria-hidden="true" />;
}
