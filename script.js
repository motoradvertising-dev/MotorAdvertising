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
        'saas-funnel': 'https://saas-ui.example.com',
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

