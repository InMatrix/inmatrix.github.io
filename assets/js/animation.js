(function() {
    function initAnimation() {
        const container = document.getElementById('canvas_container');
        if (!container || typeof THREE === 'undefined') return;

        // Check prefers-reduced-motion
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        let prefersReducedMotion = motionQuery.matches;
        motionQuery.addEventListener('change', (e) => {
            prefersReducedMotion = e.matches;
            if (prefersReducedMotion) {
                stopAnimation();
            } else if (isIntersecting && !document.hidden) {
                startAnimation();
            }
        });

        // Set up scene, camera, and renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true 
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Create snow particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 50;
        const posArray = new Float32Array(particlesCount * 3);
        const velocityArray = new Float32Array(particlesCount);
        const sizeArray = new Float32Array(particlesCount);

        for (let i = 0; i < particlesCount * 3; i += 3) {
            posArray[i] = (Math.random() - 0.5) * 35;
            posArray[i + 1] = Math.random() * 35 - 10;
            posArray[i + 2] = (Math.random() - 0.5) * 20;
            
            velocityArray[i / 3] = Math.random() * 0.01 + 0.002;
            sizeArray[i / 3] = Math.random() * 0.7 + 0.3;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

        // Create material with snowflake-shaped points
        const particlesMaterial = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
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

                    float angle = atan(rotatedUv.y, rotatedUv.x);
                    float snowflake = 0.0;

                    for (float i = 0.0; i < 6.0; i++) {
                        float a = i * 3.14159 / 3.0;
                        float value = abs(cos(angle - a) * length(rotatedUv));
                        float arm = 1.0 - smoothstep(0.0, 0.15 + 0.05 * noise(rotatedUv + time), value);
                        snowflake = max(snowflake, arm);
                    }

                    for (float i = 0.0; i < 6.0; i++) {
                        float a = (i * 3.14159 / 3.0) + 3.14159 / 6.0;
                        float value = abs(cos(angle - a) * length(rotatedUv));
                        float secondaryArm = (1.0 - smoothstep(0.0, 0.05, value)) * 0.5;
                        snowflake = max(snowflake, secondaryArm * (1.0 - r));
                    }

                    float detail = abs(cos(angle * 12.0)) * 0.1;
                    detail += abs(cos(angle * 18.0)) * 0.05;
                    snowflake += detail * (1.0 - r) * (0.5 + 0.5 * noise(rotatedUv + time));

                    float sparkle = noise(rotatedUv * 10.0 + time) * (1.0 - r * r);
                    snowflake += sparkle * 0.1;

                    snowflake *= smoothstep(1.0, 0.2, r);

                    float brightness = 0.9 + 0.1 * noise(rotatedUv + time);
                    float opacity = snowflake * 0.3 * brightness;
                    gl_FragColor = vec4(1.0, 1.0, 1.0, opacity);
                }
            `
        });

        // Create mesh
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        camera.position.z = 5;

        let mouseX = 0;
        let time = 0;
        let animationFrameId = null;
        let isIntersecting = true;

        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX / window.innerWidth - 0.5) * 0.1;
        });

        function renderFrame() {
            time += 0.005;
            particlesMaterial.uniforms.time.value = time;

            const positions = particlesGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= velocityArray[i / 3];
                positions[i] += mouseX * 0.1;

                if (positions[i + 1] < -5) {
                    positions[i + 1] = 25;
                    positions[i] = (Math.random() - 0.5) * 35;
                    positions[i + 2] = (Math.random() - 0.5) * 20;
                }
            }

            particlesGeometry.attributes.position.needsUpdate = true;
            renderer.render(scene, camera);
        }

        function animate() {
            renderFrame();
            animationFrameId = requestAnimationFrame(animate);
        }

        function startAnimation() {
            if (!animationFrameId && !prefersReducedMotion && isIntersecting && !document.hidden) {
                animationFrameId = requestAnimationFrame(animate);
            }
        }

        function stopAnimation() {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        // Render initial frame
        renderFrame();

        // Start animation if motion is allowed
        if (!prefersReducedMotion) {
            startAnimation();
        }

        // IntersectionObserver: Pause when off-screen
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    isIntersecting = entry.isIntersecting;
                    if (isIntersecting) {
                        startAnimation();
                    } else {
                        stopAnimation();
                    }
                });
            }, { threshold: 0 });
            observer.observe(container);
        }

        // Visibility Change: Pause when tab is backgrounded
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAnimation();
            } else if (isIntersecting && !prefersReducedMotion) {
                startAnimation();
            }
        });

        // Resize handler
        window.addEventListener('resize', () => {
            if (!container.clientHeight || !container.clientWidth) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
            particlesMaterial.uniforms.pixelRatio.value = Math.min(window.devicePixelRatio, 2);
            if (prefersReducedMotion || !animationFrameId) {
                renderer.render(scene, camera);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnimation);
    } else {
        initAnimation();
    }
})();
