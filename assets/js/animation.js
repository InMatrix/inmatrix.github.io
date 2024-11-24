document.addEventListener('DOMContentLoaded', function() {
    // Set up scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const container = document.getElementById('canvas_container');
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Create material
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.005,
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.8
    });

    // Create mesh
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Position camera
    camera.position.z = 3;

    // Mouse movement
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = event.clientX / window.innerWidth - 0.5;
        mouseY = event.clientY / window.innerHeight - 0.5;
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        particlesMesh.rotation.y += 0.001;
        particlesMesh.rotation.x += 0.001;

        // Respond to mouse movement
        particlesMesh.rotation.y += mouseX * 0.1;
        particlesMesh.rotation.x += mouseY * 0.1;

        renderer.render(scene, camera);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    animate();
});
