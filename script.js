// Sticky Navbar
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Particle system removed per user request

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
                        s.classList.remove('anim-exit', 'anim-enter');
                    });

                    updateContent();

                    // FORCE REFLOW (Critical for animation start)
                    void systemSection.offsetWidth;

                    // Trigger Entry
                    screens.forEach(s => s.classList.add('anim-enter'));
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

// Portfolio Interactivity
document.addEventListener('DOMContentLoaded', () => {
    const projectItems = document.querySelectorAll('.project-item');
    const previewImages = document.querySelectorAll('.preview-img');
    const detailContents = document.querySelectorAll('.details-content');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const mainVisitBtn = document.getElementById('main-visit-btn');
    const previewVisitBtn = document.querySelector('.preview-cta');

    // Project data for links (example placeholder links)
    const projectLinks = {
        'luxury-real-estate': 'https://luxury-real-estate.example.com',
        'saas-funnel': 'https://itsizzy.com/',
        'tech-store': 'https://vortex-tech.example.com',
        'fintech-corporate': 'https://nexus-fintech.example.com'
    };

    function switchProject(projectId) {
        // Update Project Items
        projectItems.forEach(item => {
            if (item.getAttribute('data-project') === projectId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Preview Images (Fade transition)
        previewImages.forEach(img => {
            if (img.getAttribute('data-project') === projectId) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });

        // Update Details (Slide up animation handled by CSS)
        detailContents.forEach(content => {
            if (content.getAttribute('data-project') === projectId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Update External Links
        const url = projectLinks[projectId] || '#';
        if (mainVisitBtn) mainVisitBtn.href = url;
        if (previewVisitBtn) previewVisitBtn.href = url;
    }

    // Hover Interaction (Desktop)
    projectItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const projectId = item.getAttribute('data-project');
            switchProject(projectId);
        });

        // Handle Tap/Click for Mobile
        item.addEventListener('click', () => {
            const projectId = item.getAttribute('data-project');
            switchProject(projectId);
        });
    });

    // Filter Logic
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');

            // Update button state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter items
            projectItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    // Animation trigger
                    item.style.opacity = '0';
                    setTimeout(() => {
                        item.style.opacity = '1';
                    }, 50);
                } else {
                    item.style.display = 'none';
                }
            });

            // Select first visible project after filtering
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
            const outerDash = isHovered ? "none" : "80, 50";
            const outerAnimation = isHovered ? "none" : "veinFlow 15s linear infinite";

            const strokeColorOuter = isHovered ? "#22d3ee" : "#0c3a4a";
            const strokeWidthOuter = isHovered ? "40" : "22";

            const strokeColorInner = isHovered ? "#fff" : "rgba(34, 211, 238, 0.4)";
            const strokeWidthInner = isHovered ? "8" : "4";

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

