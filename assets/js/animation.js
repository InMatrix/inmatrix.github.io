document.addEventListener('DOMContentLoaded', function() {
    // Set up scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const container = document.getElementById('canvas_container');
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true,
        antialias: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Create snow particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 50;
    const posArray = new Float32Array(particlesCount * 3);
    const velocityArray = new Float32Array(particlesCount);
    const sizeArray = new Float32Array(particlesCount);

    for(let i = 0; i < particlesCount * 3; i += 3) {
        // Spread particles across a much wider area
        posArray[i] = (Math.random() - 0.5) * 35;     // Much wider X spread
        posArray[i + 1] = Math.random() * 35 - 10;    // Much higher Y spread
        posArray[i + 2] = (Math.random() - 0.5) * 20; // Much deeper Z spread
        
        // Random falling speed and size for each particle
        velocityArray[i/3] = Math.random() * 0.01 + 0.002; // Even slower fall
        sizeArray[i/3] = Math.random() * 0.7 + 0.3;   // Slightly smaller
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    // Create material with snowflake-shaped points
    const particlesMaterial = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            pixelRatio: { value: window.devicePixelRatio },
            time: { value: 0.0 }
        },
        vertexShader: `
            attribute float size;
            uniform float pixelRatio;
            uniform float time;
            varying vec2 vUv;
            varying float vRandom;
            
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                gl_PointSize = size * pixelRatio * (100.0 / -mvPosition.z);
                vUv = position.xy;
                vRandom = fract(sin(dot(position.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying float vRandom;
            uniform float time;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            void main() {
                // Rotate UV coordinates based on time and random value
                vec2 uv = gl_PointCoord * 2.0 - 1.0;
                float rotation = time * 0.15 * (vRandom - 0.5);
                float c = cos(rotation);
                float s = sin(rotation);
                vec2 rotatedUv = vec2(
                    uv.x * c - uv.y * s,
                    uv.x * s + uv.y * c
                );
                
                float r = length(rotatedUv);
                if (r > 1.0) discard;

                // Create six-pointed snowflake shape
                float angle = atan(rotatedUv.y, rotatedUv.x);
                float snowflake = 0.0;

                // Main arms with varying thickness
                for (float i = 0.0; i < 6.0; i++) {
                    float a = i * 3.14159 / 3.0;
                    float value = abs(cos(angle - a) * length(rotatedUv));
                    float arm = 1.0 - smoothstep(0.0, 0.15 + 0.05 * noise(rotatedUv + time), value);
                    snowflake = max(snowflake, arm);
                }

                // Secondary arms
                for (float i = 0.0; i < 6.0; i++) {
                    float a = (i * 3.14159 / 3.0) + 3.14159 / 6.0;
                    float value = abs(cos(angle - a) * length(rotatedUv));
                    float secondaryArm = (1.0 - smoothstep(0.0, 0.05, value)) * 0.5;
                    snowflake = max(snowflake, secondaryArm * (1.0 - r));
                }

                // Add crystalline details
                float detail = abs(cos(angle * 12.0)) * 0.1;
                detail += abs(cos(angle * 18.0)) * 0.05;
                snowflake += detail * (1.0 - r) * (0.5 + 0.5 * noise(rotatedUv + time));

                // Add sparkle effect
                float sparkle = noise(rotatedUv * 10.0 + time) * (1.0 - r * r);
                snowflake += sparkle * 0.1;

                // Fade out edges
                snowflake *= smoothstep(1.0, 0.2, r);

                // Add subtle variation in brightness
                float brightness = 0.9 + 0.1 * noise(rotatedUv + time);
                
                float opacity = snowflake * 0.3 * brightness;
                gl_FragColor = vec4(1.0, 1.0, 1.0, opacity);
            }
        `
    });

    // Create mesh
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Position camera
    camera.position.z = 5;

    // Mouse movement for subtle wind effect
    let mouseX = 0;
    let mouseY = 0;
    let time = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth - 0.5) * 0.1;
        mouseY = (event.clientY / window.innerHeight - 0.5) * 0.1;
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;
        particlesMaterial.uniforms.time.value = time;

        const positions = particlesGeometry.attributes.position.array;

        // Update each particle's position
        for(let i = 0; i < positions.length; i += 3) {
            // Apply gravity (falling effect)
            positions[i + 1] -= velocityArray[i/3];

            // Add slight horizontal movement based on mouse position
            positions[i] += mouseX * 0.1;

            // Reset particle to top when it falls below view
            if(positions[i + 1] < -5) {
                positions[i + 1] = 25;  // Start much higher
                positions[i] = (Math.random() - 0.5) * 35;  // Match new spread
                positions[i + 2] = (Math.random() - 0.5) * 20;
            }
        }

        particlesGeometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        particlesMaterial.uniforms.pixelRatio.value = window.devicePixelRatio;
    });

    animate();
});
