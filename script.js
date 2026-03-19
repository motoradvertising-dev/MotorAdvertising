// Throttle helper
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Sticky Navbar - Throttled
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', throttle(() => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}, 100));


// Particle system (Moving Nodes Background)
(function() {
    const canvas = document.getElementById('data-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

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
            this.alpha = Math.random() * 0.5;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                this.reset();
            }
        }
        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 1.5})`; // More visible dots
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const particleCount = window.innerWidth < 768 ? 30 : 50; // Dynamic count
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }


    let animationFrameId;
    let isVisible = false;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
            if (isVisible) {
                if (!animationFrameId) animateParticles();
            } else {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
    }, { threshold: 0.1 });

    function animateParticles() {
        if (!isVisible) return;
        
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // More visible lines
        ctx.lineWidth = 0.8;
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 22500) { // 150 * 150
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(animateParticles);
    }

    window.addEventListener('resize', resize);
    resize();
    initParticles();
    observer.observe(canvas);

})();

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

                        // 5. Trigger Deep Entry via RAF to avoid layout thrashing
                        requestAnimationFrame(() => {
                            screens.forEach(s => s.classList.add('anim-enter'));
                        });


                    }, 550); // Slightly less than 0.6s to overlap ensuring continuous motion

                } else {
                    // --- FIRST ENTRY ---
                    systemSection.classList.add('active-3d');

                    // Clear any residuals
                    screens.forEach(s => {
                        s.classList.remove('anim-exit', 'anim-enter');
                    });

                    updateContent();

                    // Trigger Entry via RAF
                    requestAnimationFrame(() => {
                        screens.forEach(s => s.classList.add('anim-enter'));
                    });

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

// New Projects Showcase Logic
(function() {
    const projects = [
        {
          id: 0,
          slug: 'luxury-real-estate',
          title: "LUXURY REAL ESTATE",
          category: "BIENES RAÍCES",
          year: "2024",
          description: "Portal inmobiliario premium diseñado para captar inversionistas de alto nivel y leads internacionales. Enfoque en visuales de gran formato.",
          platform: "WordPress / UI Custom",
          objective: "Leads de alto valor",
          features: ["CRM", "Multilingüe"],
          image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000",
          tags: ["SEO", "Leads"],
          url: "https://luxury-real-estate.example.com"
        },
        {
          id: 1,
          slug: 'saas-funnel',
          title: "IZZY PLATFORM",
          category: "FUNNELS",
          year: "2025",
          description: "Plataforma de conversión optimizada para influencers con sistemas de seguimiento de métricas.",
          platform: "Next.js / Tailwind",
          objective: "Conversión",
          features: ["Analytics", "Pagos"],
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000",
          tags: ["Influencer", "Performance"],
          url: "https://itsizzy.com/"
        },
        {
          id: 2,
          slug: 'tech-store',
          title: "VORTEX TECH STORE",
          category: "ECOMMERCE",
          year: "2023",
          description: "Tienda de tecnología con catálogo dinámico y proceso de checkout ultra-rápido.",
          platform: "Shopify Headless",
          objective: "Ventas Directas",
          features: ["Stock Sync", "Filtros"],
          image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1000",
          tags: ["Performance", "Ventas"],
          url: "https://vortex-tech.example.com"
        },
        {
          id: 3,
          slug: 'fintech-corporate',
          title: "NEXUS FINTECH",
          category: "CORPORATIVO",
          year: "2023",
          description: "Sitio corporativo para servicios financieros con altos estándares de seguridad.",
          platform: "Webflow",
          objective: "Autoridad",
          features: ["Seguridad", "Blog"],
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000",
          tags: ["Marca", "Seguridad"],
          url: "https://nexus-fintech.example.com"
        }
    ];

    let activeFilter = 'TODOS';
    let selectedProjectId = 0;

    function renderSelector() {
        const listContainer = document.getElementById('project-selector-list');
        if (!listContainer) return;

        const filtered = activeFilter === 'TODOS' 
            ? projects 
            : projects.filter(p => p.category === activeFilter);

        listContainer.innerHTML = filtered.map(p => `
            <div class="selector-item ${selectedProjectId === p.id ? 'active' : ''}" data-id="${p.id}">
                <div class="selector-icon">
                    <i class="fas ${p.category === 'ECOMMERCE' ? 'fa-globe' : 'fa-desktop'}"></i>
                </div>
                <div class="selector-content">
                    <h4>${p.title}</h4>
                    <p>${p.category}</p>
                </div>
                <i class="fas fa-chevron-right selector-arrow"></i>
            </div>
        `).join('');

        // Bind events
        listContainer.querySelectorAll('.selector-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                setSelectedProject(id);
            });
        });
    }

    function setSelectedProject(id) {
        selectedProjectId = id;
        const p = projects.find(proj => proj.id === id);
        if (!p) return;

        // Update UI elements
        const mainImg = document.getElementById('main-project-image');
        const mainTitle = document.getElementById('main-project-title');
        const mainDesc = document.getElementById('main-project-desc');
        const mainCat = document.getElementById('main-project-category');
        const mainPlatform = document.getElementById('main-project-platform');
        const mainObj = document.getElementById('main-project-objective');
        const mainYear = document.getElementById('main-project-year');
        const mainTags = document.getElementById('main-project-tags');
        const mainCTA = document.querySelector('.showcase-cta');

        if (mainImg) {
            mainImg.style.opacity = '0';
            setTimeout(() => {
                mainImg.src = p.image;
                mainImg.style.opacity = '1';
            }, 300);
        }
        if (mainTitle) mainTitle.textContent = p.title;
        if (mainDesc) mainDesc.textContent = p.description;
        if (mainCat) mainCat.textContent = p.category;
        if (mainPlatform) mainPlatform.textContent = p.platform;
        if (mainObj) mainObj.textContent = p.objective;
        if (mainYear) mainYear.textContent = p.year;
        
        if (mainTags) {
            mainTags.innerHTML = p.tags.map(t => `<span class="tag-badge">${t}</span>`).join('');
        }

        if (mainCTA) {
            // Set href if it was an <a> tag, or add listener
            mainCTA.onclick = () => window.open(p.url, '_blank');
        }

        renderSelector(); // Update active state in list
    }

    document.addEventListener('DOMContentLoaded', () => {
        const filterBtns = document.querySelectorAll('.filter-btn-new');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.getAttribute('data-filter');
                
                // Switch to first project in filtered list
                const filtered = activeFilter === 'TODOS' ? projects : projects.filter(p => p.category === activeFilter);
                if (filtered.length > 0) {
                    setSelectedProject(filtered[0].id);
                }
                renderSelector();
            });
        });

        renderSelector();
        setSelectedProject(0);
    });
})();

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

    // Interactive PM Cards (toggle for mobile/click)
    document.querySelectorAll('.pm-card').forEach(card => {
        card.addEventListener('click', () => {
            // Deactivate others
            document.querySelectorAll('.pm-card').forEach(c => {
                if (c !== card) c.classList.remove('active');
            });
            card.classList.toggle('active');
        });
    });
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
        { id: 1, title_es: 'Producción Audiovisual', title_en: 'Audiovisual Production', desc_es: 'Contenido cinematográfico de alto impacto y storytelling.', desc_en: 'High-impact cinematic content and storytelling.', x: 20, y: 25 },
        { id: 2, title_es: 'Posicionamiento SEO & SEM', title_en: 'SEO & SEM Positioning', desc_es: 'Dominando resultados de búsqueda con estrategia basada en datos.', desc_en: 'Dominating search results through data-driven strategy.', x: 15, y: 50 },
        { id: 3, title_es: 'Estrategia de Contenidos', title_en: 'Content Strategy', desc_es: 'Creando mensajes que conectan y convierten audiencias.', desc_en: 'Crafting messages that resonate and convert audiences.', x: 20, y: 75 },
        { id: 4, title_es: 'Producción Video IA', title_en: 'AI Video Production', desc_es: 'Automatización de nueva generación con excelencia creativa.', desc_en: 'Next-gen automation meets creative excellence.', x: 80, y: 25 },
        { id: 5, title_es: 'CRM & Automatizaciones', title_en: 'CRM & Automations', desc_es: 'Optimizando flujos de trabajo para máxima eficiencia.', desc_en: 'Optimizing workflows for maximum business efficiency.', x: 85, y: 50 },
        { id: 6, title_es: 'Chatbots Inteligentes', title_en: 'Smart Chatbots', desc_es: 'Soluciones de atención al cliente inteligente 24/7.', desc_en: '24/7 intelligent customer engagement solutions.', x: 80, y: 75 },
    ];

    function drawLines() {
        if (!container || !svg) return;
        dimensions = { width: container.clientWidth, height: container.clientHeight };
        svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

        let pathsHtml = `<defs>
            <filter id="venom-goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            </filter>
        </defs>

        <g filter="url(#venom-goo)">`;

        const center = { x: 50, y: 50 };
        const startX = (center.x / 100) * dimensions.width;
        const startY = (center.y / 100) * dimensions.height;

        services.forEach(s => {
            const endX = (s.x / 100) * dimensions.width;
            const endY = (s.y / 100) * dimensions.height;
            const cp1x = startX + (endX - startX) * 0.5;
            const cp1y = startY;
            const cp2x = startX + (endX - startX) * 0.5;
            const cp2y = endY;

            const isHovered = hoveredNodeId === s.id;

            // Venom Style Layers
            const strokeColorBase = isHovered ? "#22d3ee" : "#0c3a4a";
            const strokeWidthBase = isHovered ? "16" : "10";
            const dashArrayBase = '100, 50';
            const animBase = `veinFlow ${isHovered ? '2s' : '12s'} linear infinite`;

            const strokeColorCore = isHovered ? "#fff" : "rgba(34, 211, 238, 0.2)";
            const strokeWidthCore = isHovered ? "4" : "2";
            const dashArrayCore = isHovered ? '40, 160' : '5, 200';
            const animCore = `veinFlow ${isHovered ? '1.5s' : '8s'} linear infinite`;

            pathsHtml += `
            <g class="vein-group">
                <!-- Base Organic Layer -->
                <path d="M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}"
                    stroke="${strokeColorBase}" stroke-width="${strokeWidthBase}" fill="none" stroke-linecap="round"
                    style="stroke-dasharray: ${dashArrayBase}; animation: ${animBase};" />
                
                <!-- Bright Core Pulse -->
                <path d="M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}"
                    stroke="${strokeColorCore}" stroke-width="${strokeWidthCore}" fill="none" stroke-linecap="round"
                    style="stroke-dasharray: ${dashArrayCore}; animation: ${animCore};" />
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
            const lang = window._currentLang || 'es';
            hubLabel.textContent = lang === 'es' ? 'Detalle del Servicio' : 'Service Detail';
            hubLabel.classList.add('active-label');
            hubTitle.textContent = s['title_' + lang];
            hubTitle.classList.add('active-title');
            hubDesc.textContent = s['desc_' + lang];
            hubZap.style.display = 'block';

            hubCore.classList.add('hovered-core');
            drawLines();
        });
        node.addEventListener('mouseleave', () => {
            hoveredNodeId = null;
            node.classList.remove('hovered');

            const lang2 = window._currentLang || 'es';
            hubLabel.textContent = lang2 === 'es' ? 'Ecosistema' : 'Ecosystem';
            hubLabel.classList.remove('active-label');
            hubTitle.textContent = 'Motor Advertising';
            hubTitle.classList.remove('active-title');
            hubDesc.textContent = lang2 === 'es' ? 'Marketing impulsado por tecnología' : 'Technology-driven marketing';
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

        const geometry = new THREE.IcosahedronGeometry(1, 10); // Reduced subdivision from 15 to 10

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

    let hubVisible = false;
    const hubObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            hubVisible = entry.isIntersecting;
            if (hubVisible) {
                if (!frameId) animateThree();
            } else {
                cancelAnimationFrame(frameId);
                frameId = null;
            }
        });
    }, { threshold: 0.1 });

    function animateThree() {
        if (!window.THREE || !sphere || !hubVisible) return;
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

    if (hubCore) {
        hubObserver.observe(hubCore);
    }

    setTimeout(drawLines, 100);

});

// =========================================
// LANGUAGE SWITCHING SYSTEM (i18n)
// =========================================
(function() {
    const translations = {
        en: {
            // Nav
            nav_inicio: 'Home',
            nav_webs: 'Webs',
            nav_pauta: 'Paid Media',
            nav_servicios: 'Services',
            nav_contacto: 'Contact',
            // Hero
            hero_headline: 'Your brand. <span class="highlight">Our engine.</span>',
            hero_subheadline: 'Marketing is not a series of isolated actions.<br>It\'s a system that must adapt, learn and evolve.',
            hero_support: 'We interpret data, market behavior and brand momentum to decide how to move, when to scale and when to adjust.',
            hero_cta_primary: 'Activate the engine',
            hero_cta_secondary: 'Learn the system',
            // System Core Blocks
            block_captacion: 'Acquisition',
            block_captacion_desc: 'We activate acquisition systems designed to attract real clients, not just traffic. Each campaign responds to a clear reading of context and data.',
            block_conversion: 'Conversion',
            block_conversion_desc: 'We design digital structures that transform attention into measurable results. Nothing is left to improvisation.',
            block_automatizacion: 'Automation',
            block_automatizacion_desc: 'We integrate technology to reduce friction, organize processes and amplify human judgment. Less improvisation, more structure.',
            block_produccion: 'Production',
            block_produccion_desc: 'We create and execute strategic assets aligned to the complete system. Each piece responds to a clear objective within the engine.',
            // Screens
            screen_analitica: 'Analytics',
            screen_estrategia: 'Strategy',
            screen_flujo: 'Flow',
            // Portfolio
            portfolio_visit: 'Visit Website',
            portfolio_title: 'Web Projects',
            portfolio_subtitle: 'High-performance websites and landing pages designed for growth and conversion.',
            filter_all: 'All',
            filter_realestate: 'Real Estate',
            filter_funnels: 'Funnels',
            filter_ecommerce: 'Ecommerce',
            filter_corporate: 'Corporate',
            cat_influencer: 'Influencer Platform',
            tag_ventas: 'Sales',
            tag_marca: 'Brand',
            tag_seguridad: 'Security',
            proj_luxury_desc: 'Premium real estate portal designed to capture high-ticket investors and international leads.',
            label_plataforma: 'Platform:',
            label_objetivo: 'Objective:',
            label_caracteristicas: 'Features:',
            proj_luxury_obj: 'High-ticket leads',
            proj_luxury_feat: 'CRM integration, multilingual, interactive maps',
            proj_izzy_desc: 'A premium influencer marketing platform connecting creators and brands to drive organic growth.',
            proj_izzy_plat: 'Custom Application',
            proj_izzy_obj: 'Brand & Creator Alignment',
            proj_izzy_feat: 'Omnichannel Buy & Try, Performance Dashboard, Automated Workflows',
            portfolio_casestudy: 'View Case Study',
            // Paid Media
            pm_title: 'Paid Media Performance',
            pm_subtitle: 'From creative ideas to measurable revenue through data-driven advertising.',
            pm_idea: 'Idea',
            pm_idea_1: 'Campaign strategy',
            pm_idea_2: 'Audience targeting',
            pm_idea_3: 'Creative concept',
            pm_idea_tip: 'We analyze audience behavior and define the campaign direction.',
            pm_creative: 'Creative Production',
            pm_creative_1: 'Ad creative production',
            pm_creative_2: 'Short-form videos',
            pm_creative_3: 'High-converting visuals',
            pm_creative_tip: 'We produce creatives designed specifically for conversion and attention.',
            pm_launch: 'Campaign Launch',
            pm_launch_1: 'Campaign deployment',
            pm_launch_2: 'Audience segmentation',
            pm_launch_3: 'Budget optimization',
            pm_launch_tip: 'We deploy campaigns across the most effective platforms for your audience.',
            pm_metrics: 'Performance Metrics',
            pm_metrics_tip: 'We continuously optimize campaigns based on real-time data.',
            pm_revenue: 'Revenue',
            pm_revenue_1: 'Leads generated',
            pm_revenue_2: 'Sales growth',
            pm_revenue_3: 'Revenue impact',
            pm_revenue_tip: 'Measurable business results and direct revenue impact.',
            // Services
            services_title: 'Services',
            services_subtitle: 'Integrated marketing capabilities powered by strategy, content, automation and performance.',
            hub_label: 'Ecosystem',
            hub_desc: 'Technology-driven marketing',
            services_footer: 'High Performance Agency',
            // Contact
            contact_title: 'START THE CHANGE',
            contact_subtitle: 'Select your profile to start the process.',
            contact_empresa: 'I\'m a Company',
            contact_profesional: 'I\'m a Professional',
            // Forms
            form_empresa_title: 'Company Profile',
            form_empresa_desc: 'I want to scale my brand with a solid growth system.',
            form_nombre: 'Full name',
            form_email_corp: 'Corporate email',
            form_empresa_nombre: 'Company/brand name',
            form_presupuesto: 'Estimated monthly budget',
            form_select_rango: 'Select a range',
            form_mas_10k: 'More than $10,000 USD',
            form_desafio: 'Current main challenge',
            form_activar: 'Activate Engine',
            form_prof_title: 'Professional Profile',
            form_prof_desc: 'I want to be part of the engine as a Trafficker, CM or Creator.',
            form_especialidad: 'Specialty',
            form_select_opcion: 'Select an option',
            form_productor: 'Audiovisual Producer',
            form_analista: 'Data Analyst',
            form_portfolio: 'CV/Portfolio link',
            form_experiencia: 'Experience summary',
            form_enviar: 'Send profile',
            // Success
            success_title: 'Information received.',
            success_desc: 'Our team will contact you soon.',
            success_back: 'Go back',
            // Pauta Dashboard
            pauta_dash_title: 'Paid Media Performance',
            pauta_dash_subtitle: 'Data-driven campaigns designed to scale revenue and customer acquisition.',
            pauta_metric_campaigns: 'Active campaigns',
            pauta_metric_creatives: 'Content creatives',
            pauta_metric_retention: 'Client retention',
            pauta_metric_revenue: 'Revenue generated',
            pauta_ad_sponsored: 'Sponsored',
            pauta_ad_cta: 'Learn more',
            pauta_bubble_lead: 'New lead',
            pauta_bubble_purchase: 'Purchase $120',
            pauta_bubble_eng: 'Ad engagement +32%',
            pauta_text_title: 'Scale your brand strategically',
            pauta_text_p1: 'Our paid media systems combine creative production, audience targeting and performance optimization to drive measurable growth.',
            pauta_text_p2: 'Every campaign is designed to maximize ROI, increase qualified leads and transform advertising investment into predictable revenue.',
            pauta_ana_reach: 'Total reach',
            pauta_ana_eng: 'Engagement rate',
            pauta_ana_conv: 'Conversions',
            pauta_ana_rev: 'Revenue generated',
            pauta_chart_title: 'Monthly Performance Trend',
            month_jan: 'Jan',
            month_feb: 'Feb',
            month_mar: 'Mar',
            month_apr: 'Apr',
            month_may: 'May',
            // Cases
            cases_title: 'Success Cases',
            cases_subtitle: 'We operate with clear logic: order, learning and constant evolution, always seeking to extract the maximum potential from every brand we work with.',
            cases_view: 'View Analysis',
            // Footer
            footer_since: 'Since 2025',
        },
        es: {
            nav_inicio: 'Inicio',
            nav_webs: 'Webs',
            nav_pauta: 'Pauta',
            nav_servicios: 'Servicios',
            nav_contacto: 'Contacto',
            hero_headline: 'Tu marca. <span class="highlight">Nuestro motor.</span>',
            hero_subheadline: 'El marketing no es una serie de acciones aisladas.<br>Es un sistema que debe adaptarse, aprender y evolucionar.',
            hero_support: 'Interpretamos datos, comportamiento del mercado y momento de la marca para decidir cómo debe moverse, cuándo escalar y cuándo ajustar.',
            hero_cta_primary: 'Activar el motor',
            hero_cta_secondary: 'Conocer el sistema',
            block_captacion: 'Captación',
            block_captacion_desc: 'Activamos sistemas de adquisición diseñados para atraer clientes reales, no solo tráfico. Cada campaña responde a una lectura clara del contexto y los datos.',
            block_conversion: 'Conversión',
            block_conversion_desc: 'Diseñamos estructuras digitales que transforman atención en resultados medibles. Nada se deja a la improvisación.',
            block_automatizacion: 'Automatización',
            block_automatizacion_desc: 'Integramos tecnología para reducir fricción, ordenar procesos y amplificar el criterio humano. Menos improvisación, más estructura.',
            block_produccion: 'Producción',
            block_produccion_desc: 'Creamos y ejecutamos activos estratégicos alineados al sistema completo. Cada pieza responde a un objetivo claro dentro del motor.',
            screen_analitica: 'Analítica',
            screen_estrategia: 'Estrategia',
            screen_flujo: 'Flujo',
            portfolio_visit: 'Visitar Sitio Web',
            portfolio_title: 'Proyectos Web',
            portfolio_subtitle: 'Sitios web y landing pages de alto rendimiento diseñados para el crecimiento y la conversión.',
            filter_all: 'Todos',
            filter_realestate: 'Bienes Raíces',
            filter_funnels: 'Funnels',
            filter_ecommerce: 'Ecommerce',
            filter_corporate: 'Corporativo',
            cat_influencer: 'Plataforma de Influencers',
            tag_ventas: 'Ventas',
            tag_marca: 'Marca',
            tag_seguridad: 'Seguridad',
            proj_luxury_desc: 'Portal inmobiliario premium diseñado para captar inversionistas de alto nivel y leads internacionales.',
            label_plataforma: 'Plataforma:',
            label_objetivo: 'Objetivo:',
            label_caracteristicas: 'Características:',
            proj_luxury_obj: 'Leads de alto valor',
            proj_luxury_feat: 'Integración CRM, multilingüe, mapas interactivos',
            proj_izzy_desc: 'Plataforma premium de marketing de influencers que conecta creadores y marcas para impulsar el crecimiento orgánico.',
            proj_izzy_plat: 'Aplicación Personalizada',
            proj_izzy_obj: 'Alineación Marca y Creador',
            proj_izzy_feat: 'Compra y Prueba Omnicanal, Panel de Rendimiento, Flujos Automatizados',
            portfolio_casestudy: 'Ver Caso de Éxito',
            pm_title: 'Rendimiento de Pauta Digital',
            pm_subtitle: 'De ideas creativas a ingresos medibles a través de publicidad basada en datos.',
            pm_idea: 'Idea',
            pm_idea_1: 'Estrategia de campaña',
            pm_idea_2: 'Segmentación de audiencia',
            pm_idea_3: 'Concepto creativo',
            pm_idea_tip: 'Analizamos el comportamiento de la audiencia y definimos la dirección de la campaña.',
            pm_creative: 'Producción Creativa',
            pm_creative_1: 'Producción de creativos',
            pm_creative_2: 'Videos de formato corto',
            pm_creative_3: 'Visuales de alta conversión',
            pm_creative_tip: 'Producimos creativos diseñados específicamente para conversión y atención.',
            pm_launch: 'Lanzamiento de Campaña',
            pm_launch_1: 'Despliegue de campaña',
            pm_launch_2: 'Segmentación de audiencia',
            pm_launch_3: 'Optimización de presupuesto',
            pm_launch_tip: 'Desplegamos campañas en las plataformas más efectivas para tu audiencia.',
            pm_metrics: 'Métricas de Rendimiento',
            pm_metrics_tip: 'Optimizamos continuamente las campañas basándonos en datos en tiempo real.',
            pm_revenue: 'Ingresos',
            pm_revenue_1: 'Leads generados',
            pm_revenue_2: 'Crecimiento en ventas',
            pm_revenue_3: 'Impacto en ingresos',
            pm_revenue_tip: 'Resultados de negocio medibles e impacto directo en ingresos.',
            services_title: 'Servicios',
            services_subtitle: 'Capacidades de marketing integradas impulsadas por estrategia, contenido, automatización y rendimiento.',
            hub_label: 'Ecosistema',
            hub_desc: 'Marketing impulsado por tecnología',
            services_footer: 'Agencia de Alto Rendimiento',
            contact_title: 'INICIA EL CAMBIO',
            contact_subtitle: 'Selecciona tu perfil para iniciar el proceso.',
            contact_empresa: 'Soy una Empresa',
            contact_profesional: 'Soy un Profesional',
            form_empresa_title: 'Perfil Empresa',
            form_empresa_desc: 'Busco escalar mi marca con un sistema de crecimiento sólido.',
            form_nombre: 'Nombre completo',
            form_email_corp: 'Email corporativo',
            form_empresa_nombre: 'Nombre de la empresa/marca',
            form_presupuesto: 'Presupuesto mensual estimado',
            form_select_rango: 'Selecciona un rango',
            form_mas_10k: 'Más de $10,000 USD',
            form_desafio: 'Principal desafío actual',
            form_activar: 'Activar Motor',
            form_prof_title: 'Perfil Profesional',
            form_prof_desc: 'Quiero ser parte del motor como Trafficker, CM o Creador.',
            form_especialidad: 'Especialidad',
            form_select_opcion: 'Selecciona una opción',
            form_productor: 'Productor Audiovisual',
            form_analista: 'Analista de Datos',
            form_portfolio: 'Link a CV/Portafolio',
            form_experiencia: 'Resumen de experiencia',
            form_enviar: 'Enviar perfil',
            success_title: 'Información recibida.',
            success_desc: 'Nuestro equipo te contactará pronto.',
            success_back: 'Volver',
            // Pauta Dashboard
            pauta_dash_title: 'Rendimiento de pauta digital',
            pauta_dash_subtitle: 'Campañas basadas en datos diseñadas para escalar ingresos y adquisición de clientes.',
            pauta_metric_campaigns: 'Campañas activas',
            pauta_metric_creatives: 'Creativos de contenido',
            pauta_metric_retention: 'Retención de clientes',
            pauta_metric_revenue: 'Ingresos generados',
            pauta_ad_sponsored: 'Publicidad',
            pauta_ad_cta: 'Más información',
            pauta_bubble_lead: 'Nuevo lead',
            pauta_bubble_purchase: 'Compra $120',
            pauta_bubble_eng: 'Interacción +32%',
            pauta_text_title: 'Escala tu marca estratégicamente',
            pauta_text_p1: 'Nuestros sistemas de pauta digital combinan producción creativa, segmentación de audiencia y optimización de rendimiento para impulsar un crecimiento medible.',
            pauta_text_p2: 'Cada campaña se diseña para maximizar el ROI, aumentar los leads calificados y transformar la inversión publicitaria en ingresos predecibles.',
            pauta_ana_reach: 'Alcance total',
            pauta_ana_eng: 'Tasa de interacción',
            pauta_ana_conv: 'Conversiones',
            pauta_ana_rev: 'Ingresos generados',
            pauta_chart_title: 'Tendencia de rendimiento mensual',
            month_jan: 'Ene',
            month_feb: 'Feb',
            month_mar: 'Mar',
            month_apr: 'Abr',
            month_may: 'May',
            cases_title: 'Casos de Éxito',
            cases_subtitle: 'Operamos con una lógica clara: orden, aprendizaje y evolución constante, buscando siempre extraer el máximo potencial de cada marca con la que trabajamos.',
            cases_view: 'Ver Análisis',
            footer_since: 'Desde 2025',
        }
    };

    window._currentLang = localStorage.getItem('motor_lang') || 'es';

    function applyLanguage(lang) {
        window._currentLang = lang;
        localStorage.setItem('motor_lang', lang);
        document.documentElement.lang = lang;

        const dict = translations[lang];
        if (!dict) return;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    // Don't overwrite input values
                } else {
                    el.innerHTML = dict[key];
                }
            }
        });

        // Update hub default text if not hovered
        const hubLabel = document.getElementById('hub-label');
        const hubDesc = document.getElementById('hub-desc');
        if (hubLabel && !hubLabel.classList.contains('active-label')) {
            hubLabel.textContent = dict.hub_label;
        }
        if (hubDesc && !document.getElementById('hub-core')?.classList.contains('hovered-core')) {
            hubDesc.textContent = dict.hub_desc;
        }

        // Update lang switcher buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Apply saved language on load
        applyLanguage(window._currentLang);

        // Bind language switcher buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                applyLanguage(lang);
            });
        });
    });
})();

// =========================================
// STORY MODAL (Casos de Éxito)
// =========================================
(function() {
    const CASES_DATA = [
        {
            title: 'Ecoraconsciente: El Placer de Viajar',
            longDescription: 'San Andrés es un paraíso, pero la competencia es feroz. Para Ecoraconsciente, no vendimos "tours", vendimos la sensación de libertad. Diseñamos anuncios que capturan el ojo en 1 segundo y guían al usuario sin fricciones hasta la reserva. El resultado: un sistema de ventas automático que permite al dueño enfocarse en dar la mejor experiencia mientras los clientes llegan solos por la web.',
            tags: ['Turismo', 'Ventas en Automático', 'San Andrés'],
            trigger: 'Deseo y Libertad',
            icon: 'fas fa-map-pin',
            color: '#06b6d4',
            colorClass: 'case-color-cyan',
            thumbnail: 'https://images.unsplash.com/photo-1520116468816-95b69f847357?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900522/Video_amanecer_ecoraconsiente_ai77wl.mp4',
        },
        {
            title: 'Justicia con Empatía',
            longDescription: 'Nadie busca un abogado por gusto, sino por necesidad. Para Soluciones Legales, humanizamos la marca para que el cliente sintiera alivio desde el primer anuncio. Creamos un puente directo a WhatsApp donde la asesoría se siente cercana, logrando que personas con problemas legales complejos den el primer paso con confianza y rapidez.',
            tags: ['Legal', 'Confianza', 'Leads Calificados'],
            trigger: 'Paz Mental',
            icon: 'fas fa-comment',
            color: '#334155',
            colorClass: 'case-color-slate',
            thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773899658/Compa%C3%B1ia_soluciones_legales_f8volg.mp4',
        },
        {
            title: 'La Magia de los Eventos',
            longDescription: 'Un evento vacío es el mayor miedo de un organizador. Usamos el poder de la recomendación (influencers) y la velocidad de la tecnología (bots de WhatsApp) para crear un efecto de "no me lo puedo perder". Logramos que más de mil personas dijeran "presente", automatizando las dudas frecuentes para que el equipo solo se encargara de disfrutar el éxito del evento.',
            tags: ['Eventos Masivos', 'Viralidad', 'Automatización'],
            trigger: 'Sentido de Pertenencia',
            icon: 'fas fa-share-nodes',
            color: '#9333ea',
            colorClass: 'case-color-purple',
            thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773899990/Evento_techno_axo2o0.mp4',
        },
        {
            title: 'Macca: La Estrella del Barrio',
            longDescription: 'Macca quería que todas sus vecinas supieran del nuevo tratamiento anti-frizz. Hicimos pauta solo a la redonda del local. Logramos que la gente que pasa a diario por el frente viera el anuncio en su celular y se animara a agendar su cita de una vez por WhatsApp. Dejamos de ser un salón más para ser el favorito de la zona.',
            tags: ['Local', 'Agendamiento', 'Cercanía'],
            trigger: 'Comodidad',
            icon: 'fas fa-bullseye',
            color: '#d97706',
            colorClass: 'case-color-amber',
            thumbnail: 'assets/macca_thumb.png',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900383/Macca_lc8teo.mp4',
        },
        {
            title: 'Vital Balance: Salud Sin Fronteras',
            longDescription: 'Vender salud en EE.UU. requiere precisión y respeto. Para Vital Balance, personalizamos los anuncios por ciudad para que cada persona sintiera que le hablábamos directamente a ella. Con una web sencilla y el poder de una llamada por WhatsApp, facilitamos que miles de pacientes accedan a Insulife, mejorando sus vidas mientras la empresa escala con orden y control.',
            tags: ['Salud', 'Mercado USA', 'Impacto Social'],
            trigger: 'Cuidado y Familia',
            icon: 'fas fa-heart-pulse',
            color: '#059669',
            colorClass: 'case-color-emerald',
            thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900190/INSULIFE_Vital_Balance_kxxewe.mp4',
        },
        {
            title: 'Cirugía Capilar: Clientes que Vuelven',
            longDescription: 'A veces el tesoro está en casa. En lugar de gastar fortunas en clientes nuevos, fuimos por quienes ya amaban la marca. Con un retargeting inteligente, les presentamos la nueva Cirugía Capilar. Al ser una marca conocida, la confianza ya estaba ahí, logrando que el lanzamiento fuera un éxito rotundo con una inversión mínima.',
            tags: ['Belleza', 'Fidelización', 'Lanzamiento'],
            trigger: 'Familiaridad',
            icon: 'fas fa-scissors',
            color: '#f472b6',
            colorClass: 'case-color-pink',
            thumbnail: 'assets/cirugia_capilar_thumb.png',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773899315/CIRUGIA_CAPIALR_YOMI_fa7ntv.mp4',
        },
        {
            title: 'Vital Balance: KetoXL - Salud Integral',
            longDescription: 'KetoXL de Vital Balance atacó la necesidad latente de mejorar la salud y el bienestar físico. Implementamos una estrategia de distribución omnicanal que cubrió todas las ciudades, permitiendo que miles de personas descubrieran un aliado seguro para adelgazar. No solo vendimos un producto, vendimos la posibilidad de un cambio de vida real y duradero a través de la suplementación inteligente.',
            tags: ['Salud Integral', 'Pérdida de Peso', 'Alcance Nacional'],
            trigger: 'Salud y Resultados',
            icon: 'fas fa-weight-scale',
            color: '#10b981',
            colorClass: 'case-color-emerald',
            thumbnail: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900300/keto_xl_Vital_Balance_ws3wls.mp4', 
        },
        {
            title: 'YomiLove: El Poder de un Regalo',
            longDescription: '¿A quién no le gusta un detalle? Creamos un video gancho para las amantes de las uñas. La promesa era simple: ven al salón, muestra este video y recibe un regalo. Esto rompió el hielo con clientas nuevas, llenó el local de energía y nos dio una forma real de decir: "Este anuncio trajo a esta persona hoy".',
            tags: ['Uñas', 'Incentivo', 'Nuevas Clientas'],
            trigger: 'Gratitud',
            icon: 'fas fa-gift',
            color: '#d946ef',
            colorClass: 'case-color-fuchsia',
            thumbnail: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900466/Regalo_Yomi_jylqri.mp4',
        },
    ];

    let activeIndex = null;
    let progress = 0;
    let isPaused = false;
    let interval = null;
    let pressStartTime = 0;

    const storyModal = document.getElementById('story-modal');
    const storyClose = document.getElementById('story-close');
    const storyImage = document.getElementById('story-image');
    const storyVideo = document.getElementById('story-video');
    const storyProgressBar = document.getElementById('story-progress-bar');
    const storyHeaderInfo = document.getElementById('story-header-info');
    const storyPauseOverlay = document.getElementById('story-pause-overlay');
    const storyRight = document.getElementById('story-right');
    const storyTouchLeft = document.getElementById('story-touch-left');
    const storyTouchRight = document.getElementById('story-touch-right');
    const casesGrid = document.getElementById('cases-grid');

    function renderCases() {
        if (!casesGrid) return;
        casesGrid.innerHTML = CASES_DATA.map((c, i) => `
            <div class="case-card" data-case="${i}">
                <img src="${c.thumbnail}" alt="${c.title}" class="case-thumb">
                ${c.videoUrl ? `<video src="${c.videoUrl}" class="case-video-hover" loop playsinline></video>` : ''}
                <div class="case-overlay"></div>
                <div class="case-card-content">
                    <div class="case-card-trigger" style="color:${c.color};">${c.trigger}</div>
                    <h3 class="case-card-title">${c.title}</h3>
                    <div class="case-card-footer">
                        <span data-i18n="cases_view">Ver Análisis</span>
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
            </div>
        `).join('');

        // Re-bind clicks
        document.querySelectorAll('.case-card').forEach(card => {
            const video = card.querySelector('.case-video-hover');
            
            card.addEventListener('mouseenter', () => {
                if (video) {
                    video.currentTime = 0;
                    video.muted = false;
                    video.play().catch(e => {
                        console.log('Hover video play with sound blocked, playing muted');
                        video.muted = true;
                        video.play();
                    });
                }
            });

            card.addEventListener('mouseleave', () => {
                if (video) {
                    video.pause();
                }
            });

            card.addEventListener('click', () => {
                const idx = parseInt(card.getAttribute('data-case'));
                openStory(idx);
            });
        });
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        renderCases();
    });

    function openStory(index) {
        activeIndex = index;
        progress = 0;
        isPaused = false;
        storyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderStory();
        startProgress();
    }

    function closeStory() {
        activeIndex = null;
        storyModal.classList.remove('active');
        document.body.style.overflow = '';
        storyVideo.pause();
        storyVideo.src = '';
        stopProgress();
    }

    function nextStory() {
        if (activeIndex < CASES_DATA.length - 1) {
            activeIndex++;
            progress = 0;
            renderStory();
        } else {
            closeStory();
        }
    }

    function prevStory() {
        if (activeIndex > 0) {
            activeIndex--;
            progress = 0;
            renderStory();
        } else {
            progress = 0;
        }
    }

    function startProgress() {
        stopProgress();
        const c = CASES_DATA[activeIndex];
        if (c.videoUrl) {
            // El progreso se manejará con los eventos del video
            return;
        }
        interval = setInterval(() => {
            if (!isPaused && activeIndex !== null) {
                progress += 1;
                updateProgressBar();
                if (progress >= 100) {
                    nextStory();
                }
            }
        }, 60);
    }

    function stopProgress() {
        if (interval) clearInterval(interval);
    }

    function updateProgressBar() {
        const segments = storyProgressBar.querySelectorAll('.story-progress-fill');
        segments.forEach((seg, i) => {
            if (i < activeIndex) seg.style.width = '100%';
            else if (i === activeIndex) seg.style.width = progress + '%';
            else seg.style.width = '0%';
        });
    }

    function renderStory() {
        if (activeIndex === null) return;
        const c = CASES_DATA[activeIndex];

        if (c.videoUrl) {
            storyImage.style.display = 'none';
            storyVideo.style.display = 'block';
            storyVideo.src = c.videoUrl;
            storyVideo.loop = false; // Queremos que termine para ir al siguiente
            storyVideo.muted = false;
            
            storyVideo.ontimeupdate = () => {
                if (storyVideo.duration) {
                    progress = (storyVideo.currentTime / storyVideo.duration) * 100;
                    updateProgressBar();
                }
            };
            
            storyVideo.onended = () => {
                nextStory();
            };

            storyVideo.play().catch(e => {
                console.log('Story video autoplay with sound blocked, trying muted');
                storyVideo.muted = true;
                storyVideo.play();
            });
        } else {
            storyImage.style.display = 'block';
            storyVideo.style.display = 'none';
            storyVideo.pause();
            storyVideo.src = '';
            storyImage.src = c.thumbnail;
        }

        // Progress bar segments
        storyProgressBar.innerHTML = CASES_DATA.map((_, i) =>
            `<div class="story-progress-segment"><div class="story-progress-fill" style="width:${i < activeIndex ? '100%' : '0%'}"></div></div>`
        ).join('');

        // Header info
        storyHeaderInfo.innerHTML = `
            <div class="story-info-icon ${c.colorClass}" style="background:${c.color};"><i class="${c.icon}"></i></div>
            <div class="story-info-text">
                <div class="story-info-title">${c.title}</div>
                <div class="story-info-trigger">${c.trigger}</div>
            </div>
        `;

        // Right panel content
        storyRight.innerHTML = `
            <div class="story-label-line"><div class="line"></div><span>La Historia Detrás</span></div>
            <h2 class="story-detail-title">${c.title}</h2>
            <div class="story-detail-tags">${c.tags.map(t => `<span><i class="fas fa-tag"></i>${t}</span>`).join('')}</div>
            <div class="story-how-label">Cómo lo logramos</div>
            <p class="story-how-text">${c.longDescription}</p>
            <div class="story-psych-card">
                <div class="story-psych-glow" style="background:${c.color};"></div>
                <div class="story-psych-label">Psicología de Ventas</div>
                <div class="story-psych-content">
                    <div class="story-psych-icon" style="background:${c.color};"><i class="${c.icon}"></i></div>
                    <div>
                        <div class="story-psych-title">Efecto: ${c.trigger}</div>
                        <p class="story-psych-desc">Uso estrategias de comportamiento para que el anuncio no se sienta como una interrupción, sino como la respuesta a lo que tu cliente ya está buscando.</p>
                    </div>
                </div>
            </div>
            <div class="story-cta-group">
                <button class="story-cta-primary">Escalar mis resultados</button>
                <button class="story-cta-secondary">Ver Proceso</button>
            </div>
        `;

        storyPauseOverlay.classList.remove('active');
        isPaused = false;
    }

    // Events
    if (storyClose) storyClose.addEventListener('click', closeStory);

    const storyTouchCenter = document.getElementById('story-touch-center');

    function togglePausePlay() {
        if (isPaused) {
            isPaused = false;
            storyPauseOverlay.classList.remove('active');
            if (CASES_DATA[activeIndex].videoUrl) {
                storyVideo.play().catch(e => console.log('Video play error:', e));
            }
        } else {
            isPaused = true;
            storyPauseOverlay.classList.add('active');
            if (CASES_DATA[activeIndex].videoUrl) {
                storyVideo.pause();
            }
        }
    }

    if (storyTouchCenter) {
        storyTouchCenter.addEventListener('click', togglePausePlay);
    }
    if (storyTouchLeft) {
        storyTouchLeft.addEventListener('click', prevStory);
    }
    if (storyTouchRight) {
        storyTouchRight.addEventListener('click', nextStory);
    }

    // Close on ESC
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && storyModal && storyModal.classList.contains('active')) closeStory();
    });

    // Close on backdrop click
    if (storyModal) {
        storyModal.addEventListener('click', (e) => {
            if (e.target === storyModal) closeStory();
        });
    }
})();
