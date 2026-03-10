// Sticky Navbar
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Canvas Data Lines Animation (Restored)
const canvas = document.getElementById('data-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let animationId; // For potential control

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
        /* Increased base opacity for brighter particles */
        this.alpha = (Math.random() * 0.5) + 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    // Only animate if canvas exists
    if (!canvas) return;

    ctx.clearRect(0, 0, width, height);

    // Draw connecting lines with higher opacity
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    animationId = requestAnimationFrame(animateParticles);
}

if (canvas) {
    window.addEventListener('resize', resize);
    resize();
    initParticles();
    animateParticles();
}

// 3D Interaction Logic
const systemSection = document.querySelector('.system-core-section');
const blocks = document.querySelectorAll('.system-block');
const close3dBtn = document.querySelector('.close-3d-btn');

const screenData = {
    captacion: {
        center: { title: "Estrategia de Captación", desc: "Atracción inteligente basada en intención real." },
        left: { title: "Fuentes", content: "Meta Ads, Google Search, TikTok Ads." },
        right: { title: "Eficacia", content: "Costo por lead optimizado mediante IA." }
    },
    conversion: {
        center: { title: "Embudos de Conversión", desc: "Arquitectura persuasiva de alto impacto." },
        left: { title: "UX/UI", content: "Fricción cero. Enfoque total en el checkout." },
        right: { title: "Tracking", content: "Medición absoluta del viaje del usuario." }
    },
    automatizacion: {
        center: { title: "Motores de Escala", desc: "Sistemas autónomos que operan 24/7." },
        left: { title: "CRM", content: "Nutrición automática de prospectos." },
        right: { title: "Backend", content: "Procesos optimizados sin error humano." }
    },
    produccion: {
        center: { title: "Activos Estratégicos", desc: "Narrativa visual diseñada para vender." },
        left: { title: "Video", content: "Storytelling que retiene y convence." },
        right: { title: "Creative", content: "Diseño modular para testing constante." }
    }
};

if (blocks.length > 0) {
    blocks.forEach(block => {
        block.addEventListener('click', (e) => {
            const target = block.getAttribute('data-target');
            const data = screenData[target];

            if (data) {
                // 1. Mark Sidebar State immediately
                blocks.forEach(b => b.classList.remove('active-in-3d'));
                block.classList.add('active-in-3d');

                // 2. Animation Sequencer
                const screens = document.querySelectorAll('.virtual-screen');
                const isAlreadyActive = systemSection.classList.contains('active-3d');

                // Function to update content (Safe to call anytime screens are invisible)
                const updateContent = () => {
                    document.querySelector('#screen-center .screen-main-title').innerText = data.center.title;
                    document.querySelector('#screen-center .screen-description').innerText = data.center.desc;
                    document.querySelector('#screen-left .data-placeholder').innerHTML = `<p class="screen-description">${data.left.content}</p>`;
                    document.querySelector('#screen-left .screen-title').innerText = data.left.title;
                    document.querySelector('#screen-right .data-placeholder').innerHTML = `<p class="screen-description">${data.right.content}</p>`;
                    document.querySelector('#screen-right .screen-title').innerText = data.right.title;
                };

                if (isAlreadyActive) {
                    // --- SWITCHING BLOCKS (Cinematic Transition) ---

                    // 1. Trigger Fly Past Escape
                    screens.forEach(s => {
                        s.classList.remove('anim-enter');
                        s.classList.add('anim-exit');
                    });

                    // 2. Wait for exit to clear screen (600ms match CSS)
                    setTimeout(() => {
                        // 3. Reset State (Instant)
                        screens.forEach(s => {
                            s.classList.remove('anim-exit');
                            // CSS ensures they are now opacity: 0 and deep position
                        });

                        // 4. Update Content
                        updateContent();

                        // 5. Force Reflow
                        void systemSection.offsetWidth;

                        // 6. Trigger Deep Entry
                        screens.forEach(s => s.classList.add('anim-enter'));

                    }, 550); // Slightly less than 0.6s to overlap ensuring continuous motion

                } else {
                    // --- FIRST ENTRY ---
                    systemSection.classList.add('active-3d');

                    // Clear any residuals
                    screens.forEach(s => {
                        s.classList.remove('anim-exit');
                        // Force reflow to ensuring clean state before adding enter
                        void s.offsetWidth;
                        s.classList.add('anim-enter');
                    });

                    updateContent();
                }
            }
        });
    });

    if (close3dBtn) {
        close3dBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Hard Reset
            systemSection.classList.remove('active-3d');
            blocks.forEach(b => b.classList.remove('active-in-3d'));

            // Clear all animation classes
            const screens = document.querySelectorAll('.virtual-screen');
            screens.forEach(s => {
                s.classList.remove('anim-enter', 'anim-exit');
            });
        });
    }

    // Also close on background click within section, but NOT on screens
    systemSection.addEventListener('click', (e) => {
        if (e.target === systemSection || e.target.classList.contains('core-container')) {
            systemSection.classList.remove('active-3d');
            blocks.forEach(b => b.classList.remove('active-in-3d'));
        }
    });
}

// Smooth Scroll for Anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// --- Modal & Contact Logic ---

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://motor-advertising-production.up.railway.app'; // Replace with real Railway URL later

const modal = document.getElementById('contact-modal');
const modalClose = document.getElementById('modal-close');
const btnEmpresa = document.getElementById('btn-soy-empresa');
const btnProfesional = document.getElementById('btn-soy-profesional');
const formEmpresa = document.getElementById('form-empresa');
const formProfesional = document.getElementById('form-profesional');
const successStep = document.getElementById('modal-success');
const btnSuccessBack = document.getElementById('success-back');

// Open Modal
function openModal(type) {
    modal.classList.add('active');
    document.body.classList.add('no-scroll');

    // Reset steps
    formEmpresa.classList.add('hidden');
    formProfesional.classList.add('hidden');
    successStep.classList.add('hidden');

    if (type === 'empresa') {
        formEmpresa.classList.remove('hidden');
    } else {
        formProfesional.classList.remove('hidden');
    }
}

// Close Modal
function closeModal() {
    modal.classList.remove('active');
    document.body.classList.remove('no-scroll');
    // Reset forms
    document.getElementById('empresa-contact-form').reset();
    document.getElementById('profesional-contact-form').reset();
}

if (btnEmpresa) btnEmpresa.addEventListener('click', () => openModal('empresa'));
if (btnProfesional) btnProfesional.addEventListener('click', () => openModal('profesional'));
if (modalClose) modalClose.addEventListener('click', closeModal);

// Close on backdrop click
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Close on ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) closeModal();
});

if (btnSuccessBack) btnSuccessBack.addEventListener('click', closeModal);

// Form Submission Handling
async function handleFormSubmit(e, type) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('.btn-submit');
    const originalBtnText = submitBtn.innerText;

    // Loading State
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const errorContainer = form.querySelector('.form-error');
    if (errorContainer) errorContainer.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/api/contact/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            form.closest('.form-step').classList.add('hidden');
            successStep.classList.remove('hidden');
        } else {
            if (errorContainer) {
                errorContainer.innerText = result.message || 'Error al enviar el formulario';
                errorContainer.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Submission Error:', error);
        if (errorContainer) {
            errorContainer.innerText = 'No se pudo conectar con el servidor. Por favor intenta más tarde.';
            errorContainer.classList.remove('hidden');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
    }
}

if (document.getElementById('empresa-contact-form')) {
    document.getElementById('empresa-contact-form').addEventListener('submit', (e) => handleFormSubmit(e, 'empresa'));
}
if (document.getElementById('profesional-contact-form')) {
    document.getElementById('profesional-contact-form').addEventListener('submit', (e) => handleFormSubmit(e, 'profesional'));
}

// =============================================
// PORTFOLIO SECTION — Web Projects Interactivity
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    const projectItems = document.querySelectorAll('.project-item');
    const previewImages = document.querySelectorAll('.preview-img');
    const detailContents = document.querySelectorAll('.details-content');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const mainVisitBtn = document.getElementById('main-visit-btn');
    const previewVisitBtn = document.querySelector('.preview-cta');

    if (!projectItems.length) return; // Exit if portfolio section not present

    const projectLinks = {
        'luxury-real-estate': 'https://luxury-real-estate.example.com',
        'saas-funnel': 'https://itsizzy.com/',
        'tech-store': 'https://vortex-tech.example.com',
        'fintech-corporate': 'https://nexus-fintech.example.com'
    };

    function switchProject(projectId) {
        projectItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-project') === projectId);
        });

        previewImages.forEach(img => {
            img.classList.toggle('active', img.getAttribute('data-project') === projectId);
        });

        detailContents.forEach(content => {
            content.classList.toggle('active', content.getAttribute('data-project') === projectId);
        });

        const url = projectLinks[projectId] || '#';
        if (mainVisitBtn) mainVisitBtn.href = url;
        if (previewVisitBtn) previewVisitBtn.href = url;
    }

    projectItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            switchProject(item.getAttribute('data-project'));
        });
        item.addEventListener('click', () => {
            switchProject(item.getAttribute('data-project'));
        });
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');

            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            projectItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    item.style.opacity = '0';
                    setTimeout(() => { item.style.opacity = '1'; }, 50);
                } else {
                    item.style.display = 'none';
                }
            });

            const firstVisible = document.querySelector('.project-item[style*="display: block"]');
            if (firstVisible) {
                switchProject(firstVisible.getAttribute('data-project'));
            }
        });
    });
});

// --- Paid Media Animation Logic ---
document.addEventListener("DOMContentLoaded", () => {
    const pmSection = document.querySelector('.paid-media-section');
    if (!pmSection) return;

    const pmCounters = document.querySelectorAll('.pm-counter');
    let animated = false;

    const animateValue = (obj, start, end, duration, formatFloat) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let val = progress * (end - start) + start;
            if (formatFloat) val = val.toFixed(1);
            else val = Math.floor(val);

            // Format with commas for large numbers
            if (end > 1000) {
                obj.innerHTML = val.toLocaleString();
            } else {
                obj.innerHTML = val;
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    const startAnimations = () => {
        if (animated) return;
        animated = true;

        // Add class to trigger CSS transitions and line draw
        pmSection.classList.add('in-view');

        // Animate counter numbers, but wait for their respective cards to fade in
        pmCounters.forEach(counter => {
            const target = parseFloat(counter.getAttribute('data-target'));
            const speed = counter.getAttribute('data-speed');
            const duration = speed === 'fast' ? 1500 : 2000;
            const isFloat = target % 1 !== 0;
            const card = counter.closest('.pm-card');
            const stage = parseInt(card.getAttribute('data-stage'));

            // Calculate delay based on stage's transition delay
            const delay = (stage * 0.8) * 1000;

            setTimeout(() => {
                animateValue(counter, 0, target, duration, isFloat);
            }, delay);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startAnimations();
            }
        });
    }, { threshold: 0.3 });

    observer.observe(pmSection);
});

// --- Services Network Animation Logic ---
document.addEventListener("DOMContentLoaded", () => {
    const snSection = document.querySelector('.services-network-section');
    if (!snSection) return;

    // Trigger Scroll Animation
    const snObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                snSection.classList.add('anim-active');
            }
        });
    }, { threshold: 0.3 });
    snObserver.observe(snSection);

    // DYNAMIC GRAPH RENDER & HOVER LOGIC
    const container = document.getElementById('services-graph-container');
    const svg = document.getElementById('services-svg');
    const nodes = document.querySelectorAll('.service-node');
    const hubLabel = document.getElementById('hub-label');
    const hubTitle = document.getElementById('hub-title');
    const hubDesc = document.getElementById('hub-desc');
    const hubZap = document.getElementById('hub-icon-zap');
    const hubCore = document.getElementById('hub-core');

    let hoveredNodeId = null;
    let dimensions = { width: 0, height: 0 };

    const services = [
        { id: 1, title: 'Audiovisual Production', desc: 'High-impact cinematic content and storytelling.', x: 20, y: 25 },
        { id: 2, title: 'SEO & SEM Positioning', desc: 'Dominating search results through data-driven strategy.', x: 15, y: 50 },
        { id: 3, title: 'Content Strategy', desc: 'Crafting messages that resonate and convert audiences.', x: 20, y: 75 },
        { id: 4, title: 'AI Video Production', desc: 'Next-gen automation meets creative excellence.', x: 80, y: 25 },
        { id: 5, title: 'CRM & Automations', desc: 'Optimizing workflows for maximum business efficiency.', x: 85, y: 50 },
        { id: 6, title: 'Chatbots', desc: '24/7 intelligent customer engagement solutions.', x: 80, y: 75 },
    ];

    function drawLines() {
        if (!container || !svg) return;
        dimensions = { width: container.clientWidth, height: container.clientHeight };
        svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

        let pathsHtml = `<defs>
            <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8" result="goo" />
            </filter>
        </defs>
        <g filter="url(#goo)">`;

        const center = { x: 50, y: 50 };
        const startX = (center.x / 100) * dimensions.width;
        const startY = (center.y / 100) * dimensions.height;

        services.forEach(s => {
            const endX = (s.x / 100) * dimensions.width;
            const endY = (s.y / 100) * dimensions.height;
            const cp1x = startX + (endX - startX) * 0.4;
            const cp1y = startY;
            const cp2x = startX + (endX - startX) * 0.6;
            const cp2y = endY;

            const isHovered = hoveredNodeId === s.id;

            // The outer thick path is what forms the visible dashes
            const outerDash = isHovered ? "none" : "20, 24";
            const outerAnimation = isHovered ? "none" : "veinFlow 15s linear infinite";

            const strokeColorOuter = isHovered ? "#22d3ee" : "rgba(34, 211, 238, 0.4)";
            const strokeWidthOuter = isHovered ? "28" : "12";

            const strokeColorInner = isHovered ? "#fff" : "rgba(34, 211, 238, 0.8)";
            const strokeWidthInner = isHovered ? "6" : "2";

            pathsHtml += `
            <g class="vein-group">
                <path d="M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}"
                    stroke="${strokeColorOuter}" stroke-width="${strokeWidthOuter}" fill="none" stroke-linecap="round"
                    style="transition: all 0.5s ease-in-out; stroke-dasharray: ${outerDash}; animation: ${outerAnimation};" />
                <path d="M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}"
                    stroke="${strokeColorInner}" stroke-width="${strokeWidthInner}" fill="none" stroke-linecap="round"
                    style="transition: all 0.3s ease-in-out;" />
            </g>`;
        });

        pathsHtml += `</g>`;
        svg.innerHTML = pathsHtml;
    }

    nodes.forEach(node => {
        const id = parseInt(node.getAttribute('data-id'));
        node.addEventListener('mouseenter', () => {
            hoveredNodeId = id;
            node.classList.add('hovered');

            const s = services.find(srv => srv.id === id);
            hubLabel.textContent = 'Service Detail';
            hubLabel.classList.add('active-label');
            hubTitle.textContent = s.title;
            hubTitle.classList.add('active-title');
            hubDesc.textContent = s.desc;
            hubZap.style.display = 'block';

            hubCore.classList.add('hovered-core');
            drawLines();
        });
        node.addEventListener('mouseleave', () => {
            hoveredNodeId = null;
            node.classList.remove('hovered');

            hubLabel.textContent = 'Ecosystem';
            hubLabel.classList.remove('active-label');
            hubTitle.textContent = 'Motor Advertising';
            hubTitle.classList.remove('active-title');
            hubDesc.textContent = 'Technology-driven marketing';
            hubZap.style.display = 'none';

            hubCore.classList.remove('hovered-core');
            drawLines();
        });
    });

    window.addEventListener('resize', drawLines);

    // --- Three.js Dynamic Hub Integration ---
    let sphere, scene, camera, renderer, frameId;
    function initThreeJS() {
        if (!window.THREE) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = () => startThree();
            document.head.appendChild(script);
        } else {
            startThree();
        }
    }

    function startThree() {
        if (!hubCore) return;

        let container = document.getElementById('three-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'three-container';
            container.style.position = 'absolute';
            container.style.inset = '0';
            container.style.zIndex = '0';
            container.style.borderRadius = '50%';
            container.style.overflow = 'hidden';
            hubCore.insertBefore(container, hubCore.firstChild);
        }

        const width = hubCore.clientWidth;
        const height = hubCore.clientHeight;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 2.2;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const geometry = new THREE.IcosahedronGeometry(1, 15);
        const material = new THREE.MeshPhongMaterial({
            color: 0x000000,
            emissive: 0x0891b2,
            emissiveIntensity: 0.5,
            shininess: 100,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        const light1 = new THREE.PointLight(0x22d3ee, 2, 10);
        light1.position.set(2, 2, 2);
        scene.add(light1);

        const light2 = new THREE.PointLight(0x0e7490, 1, 10);
        light2.position.set(-2, -2, 2);
        scene.add(light2);

        animateThree();
    }

    function animateThree() {
        if (!window.THREE || !sphere) return;
        frameId = requestAnimationFrame(animateThree);

        sphere.rotation.y += 0.005;
        sphere.rotation.x += 0.002;

        const time = Date.now() * 0.002;
        const speed = hoveredNodeId ? 1.5 : 1.0;
        const scale = 1 + Math.sin(time * speed) * 0.05;
        sphere.scale.set(scale, scale, scale);

        sphere.material.emissiveIntensity = hoveredNodeId ? 1.4 : 0.6;
        sphere.material.opacity = hoveredNodeId ? 0.95 : 0.6;

        renderer.render(scene, camera);
    }

    initThreeJS();

    window.addEventListener('resize', () => {
        if (renderer && camera && hubCore) {
            const width = hubCore.clientWidth;
            const height = hubCore.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    });

    setTimeout(drawLines, 100);
});
