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

// Force Hero Video Autoplay Safari/Mobile Safeguard
document.addEventListener('DOMContentLoaded', () => {
    const heroVideo = document.querySelector('.hero-video-bg');
    if (heroVideo) {
        heroVideo.muted = true;
        heroVideo.playsInline = true;
        
        const forcePlay = () => {
            heroVideo.play().catch(e => console.log("Autoplay strictly blocked:", e));
        };
        
        const playPromise = heroVideo.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // If initial autoplay fails, bind it to the very first user interaction
                // passive: true ensures these don't block the scroll compositor
                window.addEventListener('touchstart', forcePlay, { once: true, passive: true });
                window.addEventListener('click', forcePlay, { once: true });
                window.addEventListener('scroll', forcePlay, { once: true, passive: true });
            });
        }
    }
});

// Sticky Navbar - Throttled + passive (no bloquea el compositor de scroll en móvil)
const navbar = document.querySelector('.navbar');
let _navScrolled = false;
window.addEventListener('scroll', throttle(() => {
    if (!navbar) return;
    // Histéresis: evita el parpadeo del navbar al oscilar justo en el umbral.
    var y = window.scrollY;
    if (!_navScrolled && y > 60) { _navScrolled = true; navbar.classList.add('scrolled'); }
    else if (_navScrolled && y < 40) { _navScrolled = false; navbar.classList.remove('scrolled'); }
}, 100), { passive: true });


// Mobile Menu Toggle
(function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Inline style backup if CSS is not loaded yet or for direct control
            if (navLinks.classList.contains('active')) {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.right = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = 'rgba(0, 0, 0, 0.98)';
                navLinks.style.padding = '30px';
                navLinks.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            } else {
                navLinks.style.display = '';
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navLinks.style.display = '';
            });
        });
    }
})();



// Particle system (Moving Nodes Background)
// Disabled entirely on mobile — O(n²) per frame causes scroll jank
(function() {
    if (window.innerWidth < 768) return; // Skip entirely on mobile

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

// Conversational Scroll Logic
document.addEventListener("DOMContentLoaded", () => {
    const messages = document.querySelectorAll(".conversation-msg");
    if (messages.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                } else {
                    entry.target.classList.remove("visible");
                }
            });
        }, { rootMargin: "-15% 0px -15% 0px" });
        messages.forEach(msg => observer.observe(msg));
    }
});

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

// Endpoint de la Supabase Edge Function (cross-origin desde GitHub Pages).
// IMPORTANTE: reemplaza TU-PROYECTO por el project ref real de Supabase.
const FORM_ENDPOINT = 'https://seeaexvmdvmlbbezuosm.supabase.co/functions/v1/contact-form';
// Publishable key PUBLICA de Supabase (Project Settings -> API).
// NO es un secreto: el gateway la exige para enrutar al endpoint publico.
const SUPABASE_ANON_KEY = 'sb_publishable_zxgQiR6EV3uWV_SCdlmz4w_A8XYtS9r';

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
function handleFormSubmit(e, type) {
    e.preventDefault();
    const form = e.target;
    const formStep = form.closest('.form-step');
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Ocultar errores previos si los hay
    const errorContainer = form.querySelector('.form-error');
    if (errorContainer) errorContainer.classList.add('hidden');

    // Si el formulario tiene agendamiento, la cita es obligatoria
    if (form.querySelector('[data-scheduler]') && (!data.fecha_cita || !data.hora_cita)) {
        if (errorContainer) {
            errorContainer.textContent = (window._currentLang === 'en')
                ? 'Please pick a day and time for your call.'
                : 'Selecciona el día y la hora de tu cita en el calendario.';
            errorContainer.classList.remove('hidden');
        }
        return;
    }

    // Disable the submit button and show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + ((window._currentLang === 'en') ? 'Sending...' : 'Enviando...');
    }

    // Send the data and WAIT for the response. La Edge Function enruta por el campo "type".
    fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ type, ...data })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Mostrar la cita agendada en la pantalla de éxito
            const citaEl = document.getElementById('success-cita');
            const gcalEl = document.getElementById('success-gcal');
            if (data.fecha_cita && data.hora_cita) {
                const locale = (window._currentLang === 'en') ? 'en-US' : 'es-CO';
                const pretty = new Date(data.fecha_cita + 'T12:00:00')
                    .toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                if (citaEl) {
                    const label = (window._currentLang === 'en') ? 'Requested slot: ' : 'Cita solicitada: ';
                    citaEl.textContent = label + pretty + ' · ' + data.hora_cita;
                    citaEl.classList.add('show');
                }
                // Enlace "Añadir a Google Calendar" (evento de 1 hora, hora Colombia,
                // con el correo del formulario y el del equipo como invitados)
                if (gcalEl) {
                    const ymd = data.fecha_cita.replace(/-/g, '');
                    const hh = parseInt(data.hora_cita.slice(0, 2), 10);
                    const mm = data.hora_cita.slice(3, 5);
                    const start = ymd + 'T' + String(hh).padStart(2, '0') + mm + '00';
                    const end = ymd + 'T' + String(hh + 1).padStart(2, '0') + mm + '00';
                    const guests = [data.email, 'motoradvertisingservice@gmail.com']
                        .filter(Boolean).join(',');
                    const params = new URLSearchParams({
                        action: 'TEMPLATE',
                        text: (window._currentLang === 'en') ? 'Call with Motor Advertising' : 'Cita con Motor Advertising',
                        dates: start + '/' + end,
                        details: (window._currentLang === 'en') ? 'Meeting booked from motoradvertising.co' : 'Reunión agendada desde motoradvertising.co',
                        ctz: 'America/Bogota',
                        add: guests
                    });
                    gcalEl.href = 'https://calendar.google.com/calendar/render?' + params.toString();
                    const gcalLabel = gcalEl.querySelector('span');
                    if (gcalLabel) {
                        gcalLabel.textContent = (window._currentLang === 'en')
                            ? 'Add to my Google Calendar'
                            : 'Añadir a mi Google Calendar';
                    }
                    gcalEl.hidden = false;
                }
            } else {
                if (citaEl) { citaEl.textContent = ''; citaEl.classList.remove('show'); }
                if (gcalEl) { gcalEl.hidden = true; }
            }
            // Show success screen only when backend confirms
            formStep.classList.add('hidden');
            successStep.classList.remove('hidden');
        } else {
            // Show error from backend
            if (errorContainer) {
                errorContainer.textContent = result.message || ((window._currentLang === 'en')
                    ? 'Something went wrong. Please try again.'
                    : 'Error al enviar. Intenta de nuevo.');
                errorContainer.classList.remove('hidden');
            }
        }
    })
    .catch(error => {
        console.error('Submission Error:', error);
        // Show error to user
        if (errorContainer) {
            errorContainer.textContent = (window._currentLang === 'en')
                ? 'Connection error. Check your internet and try again.'
                : 'Error de conexión. Verifica tu internet e intenta de nuevo.';
            errorContainer.classList.remove('hidden');
        }
    })
    .finally(() => {
        // Restore button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
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
          slug: 'saas-funnel',
          title: "IZZY PLATFORM",
          category: "FUNNELS",
          year: "2025",
          description: "Plataforma de conversión optimizada para influencers con sistemas de seguimiento de métricas.",
          description_en: "Conversion-optimized platform for influencers with metric tracking systems.",
          platform: "Next.js / Tailwind",
          objective: "Conversión",
          objective_en: "Conversion",
          features: ["Analytics", "Pagos"],
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000",
          video: "https://raw.githubusercontent.com/Amadeusguitarte/motorads2/main/Izzyweb.mp4",
          tags: ["Influencer", "Performance"],
          url: "https://itsizzy.com/"
        },
        {
          id: 1,
          slug: 'luxury-real-estate',
          title: "LUXURY REAL ESTATE",
          category: "BIENES RAÍCES",
          category_en: "REAL ESTATE",
          year: "2024",
          description: "Portal inmobiliario premium diseñado para captar inversionistas de alto nivel y leads internacionales. Enfoque en visuales de gran formato.",
          description_en: "Premium real estate portal designed to capture high-level investors and international leads. Focused on large-format visuals.",
          platform: "WordPress / UI Custom",
          objective: "Leads de alto valor",
          objective_en: "High-value leads",
          features: ["CRM", "Multilingüe"],
          image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000",
          tags: ["SEO", "Leads"],
          url: "https://luxury-real-estate.example.com"
        },
        {
          id: 2,
          slug: 'gmc-granite',
          title: "GMC GRANITE INC",
          category: "CORPORATIVO",
          category_en: "CORPORATE",
          year: "2024",
          description: "Sitio web corporativo para especialistas en fabricación e instalación de superficies de granito, cuarzo y mármol.",
          description_en: "Corporate website for specialists in the fabrication and installation of granite, quartz and marble surfaces.",
          platform: "UI Custom",
          objective: "Generación de Leads",
          objective_en: "Lead Generation",
          features: ["Portafolio", "Cotizaciones"],
          image: "/assets/gmc_granite_mockup.png",
          tags: ["Corporativo", "Leads"],
          tags_en: ["Corporate", "Leads"],
          url: "https://gmcgraniteinc.com/"
        },
        {
          id: 3,
          slug: 'fintech-corporate',
          title: "NEXUS FINTECH",
          category: "CORPORATIVO",
          category_en: "CORPORATE",
          year: "2023",
          description: "Sitio corporativo para servicios financieros con altos estándares de seguridad.",
          description_en: "Corporate website for financial services with high security standards.",
          platform: "Webflow",
          objective: "Autoridad",
          objective_en: "Authority",
          features: ["Seguridad", "Blog"],
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000",
          tags: ["Marca", "Seguridad"],
          tags_en: ["Brand", "Security"],
          url: "https://nexus-fintech.example.com"
        }
    ];

    let activeFilter = 'TODOS';
    let selectedProjectId = 0;

    // Devuelve la variante _en del campo si el idioma actual es inglés
    function loc(p, field) {
        if (window._currentLang === 'en' && p[field + '_en'] !== undefined) return p[field + '_en'];
        return p[field];
    }

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
                    <p>${loc(p, 'category')}</p>
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

    function setSelectedProject(id, textOnly) {
        selectedProjectId = id;
        const p = projects.find(proj => proj.id === id);
        if (!p) return;

        // Update UI elements
        const mainImg = document.getElementById('main-project-image');
        const mainVideo = document.getElementById('main-project-video');
        const mainTitle = document.getElementById('main-project-title');
        const mainDesc = document.getElementById('main-project-desc');
        const mainCat = document.getElementById('main-project-category');
        const mainPlatform = document.getElementById('main-project-platform');
        const mainObj = document.getElementById('main-project-objective');
        const mainYear = document.getElementById('main-project-year');
        const mainTags = document.getElementById('main-project-tags');
        const mainCTA = document.querySelector('.showcase-cta');

        if (mainImg && !textOnly) {
            mainImg.style.opacity = '0';
            if (mainVideo) mainVideo.style.opacity = '0';
            setTimeout(() => {
                if (p.video && mainVideo) {
                    mainVideo.src = p.video;
                    mainVideo.style.display = 'block';
                    mainVideo.style.opacity = '1';
                    mainImg.style.display = 'none';
                } else {
                    mainImg.src = p.image;
                    mainImg.style.display = 'block';
                    mainImg.style.opacity = '1';
                    if (mainVideo) {
                        mainVideo.style.display = 'none';
                        mainVideo.src = '';
                    }
                }
            }, 300);
        }
        if (mainTitle) mainTitle.textContent = p.title;
        if (mainDesc) mainDesc.textContent = loc(p, 'description');
        if (mainCat) mainCat.textContent = loc(p, 'category');
        if (mainPlatform) mainPlatform.textContent = p.platform;
        if (mainObj) mainObj.textContent = loc(p, 'objective');
        if (mainYear) mainYear.textContent = p.year;

        if (mainTags) {
            mainTags.innerHTML = loc(p, 'tags').map(t => `<span class="tag-badge">${t}</span>`).join('');
        }

        if (mainCTA) {
            // Set href if it was an <a> tag, or add listener
            mainCTA.onclick = () => window.open(p.url, '_blank', 'noopener');
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

        // Re-render textos al cambiar idioma (después de que applyLanguage corra)
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(() => setSelectedProject(selectedProjectId, true), 0);
            });
        });
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
            const duration = speed === 'fast' ? 800 : 1200;
            const isFloat = target % 1 !== 0;
            const card = counter.closest('.pm-card');
            const stage = parseInt(card.getAttribute('data-stage'));

            // Calculate delay based on new fast stage's transition delay
            const delay = (stage * 0.2) * 1000;

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

            const strokeColorCore = isHovered ? "#fff" : "rgba(15, 57, 74, 0.2)";
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

    // Redibujar el grafo SOLO si sus dimensiones reales cambian. En móvil, la
    // barra de direcciones dispara 'resize' justo al scrollear hacia ARRIBA sin
    // que el contenedor (medido en svh) cambie de tamaño; reconstruir el SVG en
    // ese momento congelaba el hilo principal y causaba el salto de scroll.
    let _graphW = container ? container.clientWidth : 0;
    let _graphH = container ? container.clientHeight : 0;
    window.addEventListener('resize', () => {
        if (!container) return;
        const w = container.clientWidth, h = container.clientHeight;
        if (w === _graphW && h === _graphH) return;
        _graphW = w; _graphH = h;
        requestAnimationFrame(drawLines);
    });

    // --- Three.js Dynamic Hub Integration ---
    // Disabled on mobile: WebGL rAF loop blocks scroll compositor
    let sphere, scene, camera, renderer, frameId;
    function initThreeJS() {
        if (window.innerWidth < 768) return; // Skip on mobile
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
            nav_planes: 'Plans',
            nav_casos: 'Cases',
            nav_contactanos: 'Contact us',
            lgn_role_q: 'What kind of account do you need?',
            lgn_role_empresa: 'Company',
            lgn_role_empresa_d: 'I want to hire services',
            lgn_role_empleado: 'Employee',
            lgn_role_empleado_d: 'I\'m part of the team',
            idx_short_audiovisual: 'Audiovisual',
            idx_short_seo: 'SEO & SEM',
            idx_short_contenidos: 'Content',
            idx_short_videoia: 'AI Video',
            idx_short_crm: 'CRM',
            idx_short_chatbots: 'Chatbots',
            // --- Home + titulos + widget (fase 2) ---
            idx_svc_audiovisual: "Audiovisual Production",
            idx_svc_seo: "SEO & SEM Positioning",
            idx_svc_contenidos: "Content Strategy",
            idx_svc_videoia: "AI Video Production",
            idx_svc_crm: "CRM & Automations",
            idx_svc_chatbots: "Smart Chatbots",
            idx_whyus_title: "Why work with us?",
            idx_whyus_1_title: "Measurable results",
            idx_whyus_1_desc: "We don't promise vanity metrics. Every campaign is designed to generate real, quantifiable return on investment.",
            idx_whyus_2_title: "Tailored strategy",
            idx_whyus_2_desc: "We analyze your business, your audience and your competitors to build a custom plan that scales with you.",
            idx_whyus_3_title: "Dedicated team",
            idx_whyus_3_desc: "You'll work with a senior team that understands the urgency of results and the value of every dollar invested.",
            idx_diff_title: "What Makes Us Different?",
            idx_diff_1_pre: "Our team",
            idx_diff_1_desc: "Your success won't be an experiment. We only assign proven specialists with 5+ years running campaigns that scale real results.",
            idx_diff_2_pre: "Our position at the",
            idx_diff_2_strong: "forefront of the industry",
            idx_diff_2_desc: "We master the game before the rules change. We deploy next-generation tactics and formats to make sure your message stands out from the competition.",
            idx_diff_3_pre: "Our deep adoption of",
            idx_diff_3_strong: "artificial intelligence",
            idx_diff_3_desc: "We multiply your impact through advanced technology. We use artificial intelligence to predict behavior, refine targeting and continuously optimize your budget.",
            idx_webs_title: "WEB PROJECTS",
            idx_webs_subtitle: "High-performance digital solutions designed for conversion.",
            idx_filter_todos: "ALL",
            idx_filter_bienes: "REAL ESTATE",
            idx_filter_corporativo: "CORPORATE",
            idx_spec_plataforma: "PLATFORM",
            idx_spec_objetivo: "OBJECTIVE",
            idx_spec_ano: "YEAR",
            idx_webs_explorar: "Explore Case",
            idx_webs_selector: "SELECT PROJECT",
            idx_webs_cta_title: "Looking for something different?",
            idx_webs_cta_text: "Tell us your idea and we'll design a tailor-made solution.",
            idx_webs_cta_btn: "BOOK A CALL",
            idx_test_role_4: "Commercial Director, Vivir IPS",
            idx_test_text_1: "Since we started with Motor Advertising, things have improved dramatically: selecting the right ads, making the right investments and tracking the right KPIs, all with their excellent guidance.",
            idx_test_text_2: "Extremely grateful to Motor Advertising. Their solid management and strategy on Meta Ads have been an invaluable boost for our company. Their dedication and focus have made a huge difference in our journey.",
            idx_test_text_3: "The Motor team completely transformed our digital presence. We went from zero leads to receiving over 40 quote requests per month thanks to their paid media system and landing pages.",
            idx_test_text_4: "Working with Motor Advertising has been a turning point. They don't just manage campaigns — they understand our business and help us make better decisions based on real performance data.",
            idx_ph_nombre: "E.g. John Smith",
            idx_ph_desafio: "Tell us a bit about your goals...",
            idx_ph_experiencia: "Describe your best results...",
            wa_now: "Now",
            ttl_home: "Motor Advertising | Growth System",
            ttl_services: "Motor Advertising | Services",
            ttl_contacto: "Contact | Motor Advertising",
            ttl_planes: "Motor Advertising | Plans",
            ttl_login: "Motor Advertising | Sign in",
            // --- Subpáginas (services / pauta / contacto / planes / login) ---
            svc_hero_title: "Our Services",
            svc_hero_sub: "We transform businesses with digital strategy and artificial intelligence. Every service is designed to scale your brand with cutting-edge technology.",
            svc_tab_videos: "AI Videos",
            svc_tab_contenidos: "Content",
            svc_videos_title: "High-impact videos, produced with AI",
            svc_videos_desc: "We combine generative video models, automated editing and strategic storytelling to produce scalable audiovisual content without sacrificing quality. From scripts to post-production, AI powers every stage of the creative process.",
            svc_videos_cta: "Request a demo",
            svc_contenidos_title: "Every day counts. Every post has a purpose.",
            svc_contenidos_desc: "Editorial planning based on data, trends and audience behavior to maximize organic reach on every platform. Each piece of content serves a clear objective within your strategy.",
            svc_contenidos_cta: "Build my strategy",
            svc_cal_month: "March 2026",
            svc_cal_lun: "Mon",
            svc_cal_mar: "Tue",
            svc_cal_mie: "Wed",
            svc_cal_jue: "Thu",
            svc_cal_vie: "Fri",
            svc_cal_sab: "Sat",
            svc_cal_dom: "Sun",
            svc_seo_title: "The right algorithm. At the right time.",
            svc_seo_desc: "Data and platform-behavior analysis to choose the positioning strategy that best fits each digital channel. We don't apply the same formula to everyone: every algorithm has its own rules.",
            svc_seo_cta: "Rank my brand",
            svc_chatbots_title: "Your sales team. Available 24/7.",
            svc_chatbots_desc: "AI-trained chatbots that understand your business context and turn conversations into customers. Automate sales, scheduling and customer service on WhatsApp.",
            svc_chatbots_cta: "Activate my chatbot",
            svc_audiovisual_title: "Visuals that communicate. Stories that connect.",
            svc_audiovisual_desc: "High-impact audiovisual production for brands that want to stand out: from ad spots to social media content. Every frame is an opportunity to tell your story.",
            svc_audiovisual_cta: "Watch showreel",
            svc_video_placeholder: "[Insert showreel video here]",
            svc_badge_arte: "Art Direction",
            svc_crm_title: "Automate the repetitive. Humanize what matters.",
            svc_crm_desc: "We design tailor-made automation flows for any type of company, connecting CRM, communication channels and internal processes to cut operating costs and elevate the customer experience.",
            svc_crm_costos: "Cost reduction",
            svc_crm_costos_1: "Eliminates repetitive manual tasks",
            svc_crm_costos_2: "Reduces human error in key processes",
            svc_crm_costos_3: "Scales operations without hiring more staff",
            svc_crm_usuario: "Better user experience",
            svc_crm_usuario_1: "Instant answers to frequent questions",
            svc_crm_usuario_2: "Automatic personalized follow-up",
            svc_crm_usuario_3: "A consistent experience at every touchpoint",
            svc_crm_cta: "Automate my business",
            svc_footer_desc: "We scale brands profitably with highly optimized ads and growth systems.",
            svc_footer_nav: "Navigation",
            svc_footer_proyectos: "Projects",
            svc_footer_casos: "Success stories",
            svc_footer_hablemos: "Let's talk",
            svc_footer_cta: "Book a call",
            svc_footer_copyright: "&copy; 2025 Motor Advertising. All rights reserved.",
            svc_wa_online: "Online",
            svc_wa_msg: "Hi! 👋 Need help or have a question about our services?",
            svc_wa_input: "Type a message...",
            pta_loading_dash: "Loading results dashboard...",
            pta_marca_eyebrow: "We scale brands profitably with ads.",
            pta_marca_title: "YOUR BRAND. OUR ENGINE",
            pta_marca_desc: "To achieve measurable, efficient results, we work hand in hand with your company as if we were the engine that brings it to life.",
            pta_marca_cta: "I want to scale my sales",
            pta_marca_micro: "Tell us your idea and we'll assess how we can help you.",
            pta_footer_brand_desc: "We scale brands profitably with ads and highly optimized growth systems.",
            pta_footer_nav: "Navigation",
            pta_footer_proyectos: "Projects",
            pta_footer_casos: "Success cases",
            pta_footer_hablemos: "Let's talk",
            pta_footer_agendar: "Book a call",
            pta_footer_copy: "&copy; 2025 Motor Advertising. All rights reserved.",
            pta_wa_online: "Online",
            pta_wa_msg: "Hi! 👋 Need help or have a question about our services?",
            pta_wa_input: "Type a message...",
            pta_story_paused: "PAUSED FOR READING",
            cnt_inicia_cambio: "START THE CHANGE",
            cnt_selecciona_perfil: "Select your profile to start the process.",
            cnt_gcal_add: "Add to my Google Calendar",
            cnt_footer_desc: "We scale brands profitably with highly optimized ads and growth systems.",
            cnt_footer_nav: "Navigation",
            cnt_footer_proyectos: "Projects",
            cnt_footer_casos: "Success stories",
            cnt_footer_hablemos: "Let's talk",
            cnt_footer_agendar: "Book a call",
            cnt_footer_rights: "All rights reserved.",
            cnt_wa_online: "Online",
            cnt_wa_msg: "Hi! 👋 Need help or have any questions about our services?",
            cnt_wa_escribe: "Type a message...",
            pln_hero_title: "Your plans",
            pln_hero_sub: "Choose the plan that fits your business stage. All plans include professional design, support and a system built to convert.",
            pln_name_inicial: "Starter",
            pln_name_crecimiento: "Growth",
            pln_usd_mes: "USD / month",
            pln_recomendado: "Recommended",
            pln_mkt_aud_inicial: "Businesses starting with paid ads",
            pln_aud_expansion: "Growing businesses",
            pln_aud_alto: "High-performance brands",
            pln_web_aud_inicial: "Small businesses and startups",
            pln_mkt_budget_400: "Ad budget from $400/month",
            pln_mkt_budget_500: "Ad budget from $500/month",
            pln_mkt_budget_800: "Ad budget from $800/month",
            pln_web_monthly_97: "+ $97/month",
            pln_web_monthly_150: "+ $150/month",
            pln_web_monthly_555: "+ $555/month",
            pln_mkt_feat_meta: "Meta Ads campaigns",
            pln_mkt_feat_segmentacion: "Audience targeting and remarketing",
            pln_mkt_feat_creativos: "Ad creatives",
            pln_mkt_feat_optimizacion: "CPL, CTR and CPA optimization",
            pln_mkt_feat_reporte_mensual: "Monthly results report",
            pln_inherit_inicial: "Everything in Starter, PLUS:",
            pln_inherit_crecimiento: "Everything in Growth, PLUS:",
            pln_mkt_feat_google: "Google Ads (search and display)",
            pln_mkt_feat_abtesting: "A/B testing of creatives and copy",
            pln_mkt_feat_contenido: "Content strategy",
            pln_mkt_feat_leads: "Lead tracking (pixels, WhatsApp)",
            pln_mkt_feat_reporte_quincenal: "Biweekly reporting",
            pln_mkt_feat_embudos: "Conversion funnels and landing pages",
            pln_mkt_feat_automatizaciones: "Follow-up automations (email + WhatsApp)",
            pln_mkt_feat_dashboard: "Real-time results dashboard",
            pln_mkt_feat_reunion: "Monthly strategy meeting",
            pln_mkt_feat_soporte: "Priority support",
            pln_cta_inicial: "Choose Starter",
            pln_cta_crecimiento: "Choose Growth",
            pln_cta_elite: "Choose Elite",
            pln_web_feat_3pag: "3-page website",
            pln_web_feat_responsive: "Desktop and mobile",
            pln_web_feat_seo: "On-page SEO",
            pln_web_feat_form: "Contact form",
            pln_web_feat_email: "Email automations",
            pln_web_feat_1edit: "1 edit/month",
            pln_web_feat_5pag: "5-page website",
            pln_web_feat_agenda: "Appointment booking system",
            pln_web_feat_pagos: "Payment processing",
            pln_web_feat_resenas: "Google reviews (automation)",
            pln_web_feat_3edit: "3 edits/month",
            pln_web_feat_10pag: "10+ page website",
            pln_web_feat_seo_gestion: "Ongoing SEO management",
            pln_web_feat_chatbot: "AI chatbot",
            pln_web_feat_crm: "Custom CRM",
            pln_web_feat_5edit: "5 edits/month",
            pln_note_en: "For",
            pln_note_web_rest: ", the setup is a one-time build fee and the monthly fee covers hosting, support and your plan's features.",
            pln_note_mkt_rest: ", the ad budget goes directly to Meta/Google and is separate from the monthly fee.",
            pln_note_q: "Not sure which one is right for you?",
            pln_note_escribenos: "Message us",
            pln_note_juntos: "and we'll figure it out together.",
            lgn_title: "Welcome",
            lgn_sub: "Sign in or create your account to continue.",
            lgn_tab_login: "Sign in",
            lgn_tab_signup: "Create account",
            lgn_google: "Continue with Google",
            lgn_divider: "or with your email",
            lgn_email: "Email address",
            lgn_password: "Password",
            lgn_login_submit: "Log in",
            lgn_password_min: "Password (minimum 6 characters)",
            lgn_foot_terms: "By continuing, you agree to be contacted by Motor Advertising.",
            lgn_back_home: "← Back to home",
            lgn_view_plans: "View plans",
            form_agenda: 'Schedule your call',
            test_title: 'TESTIMONIALS',
            // Hero
            hero_headline: 'Your brand. <span class="highlight">Our engine.</span>',
            hero_subheadline: 'Marketing is not a series of isolated actions.<br>It\'s a system that must adapt, learn and evolve.',
            hero_support: 'We interpret data, market behavior and brand momentum to decide how to move, when to scale and when to adjust.',
            hero_cta_primary: 'Activate the engine',
            hero_cta_secondary: 'Learn the system',
            // Conversational Scroll
            conv_1: 'You don\'t need more content.',
            conv_2: 'You don\'t need more followers.',
            conv_3: 'You need a system that converts attention into money.',
            conv_4: 'That\'s exactly what we build.',
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
            pm_title: 'PAID MEDIA PERFORMANCE',
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
            contact_title: 'CONTACT US',
            contact_subtitle: 'Pick the channel you prefer — we reply the same day.',
            contact_empresa: 'I\'m a Company',
            contact_profesional: 'I\'m a Professional',
            contact_ch_wa_d: 'Direct chat with our team. Immediate response.',
            contact_ch_wa_cta: 'Open chat',
            contact_ch_mail: 'Email',
            contact_ch_mail_d: 'Tell us about your project and we\'ll write back.',
            contact_ch_mail_cta: 'Send email',
            contact_ch_emp_d: 'Form + book a call with our team.',
            contact_ch_emp_cta: 'Start now',
            contact_ch_pro_d: 'Join our talent network.',
            contact_ch_pro_cta: 'Apply',
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
            pauta_dash_title: 'DIGITAL PAID MEDIA PERFORMANCE',
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
            nav_planes: 'Planes',
            nav_casos: 'Casos',
            nav_contactanos: 'Contáctanos',
            lgn_role_q: '¿Qué tipo de cuenta necesitas?',
            lgn_role_empresa: 'Empresa',
            lgn_role_empresa_d: 'Quiero contratar servicios',
            lgn_role_empleado: 'Empleado',
            lgn_role_empleado_d: 'Hago parte del equipo',
            idx_short_audiovisual: 'Audiovisual',
            idx_short_seo: 'SEO & SEM',
            idx_short_contenidos: 'Contenidos',
            idx_short_videoia: 'Video IA',
            idx_short_crm: 'CRM',
            idx_short_chatbots: 'Chatbots',
            // --- Home + titulos + widget (fase 2) ---
            idx_svc_audiovisual: "Producción Audiovisual",
            idx_svc_seo: "Posicionamiento SEO & SEM",
            idx_svc_contenidos: "Estrategia de Contenidos",
            idx_svc_videoia: "Producción Video IA",
            idx_svc_crm: "CRM & Automatizaciones",
            idx_svc_chatbots: "Chatbots Inteligentes",
            idx_whyus_title: "¿Por qué trabajar con nosotros?",
            idx_whyus_1_title: "Resultados medibles",
            idx_whyus_1_desc: "No prometemos métricas de vanidad. Cada campaña está diseñada para generar retorno de inversión real y cuantificable.",
            idx_whyus_2_title: "Estrategia personalizada",
            idx_whyus_2_desc: "Analizamos tu negocio, tu audiencia y tu competencia para construir un plan a la medida que escale contigo.",
            idx_whyus_3_title: "Equipo dedicado",
            idx_whyus_3_desc: "Trabajarás con un equipo senior que entiende la urgencia de los resultados y la importancia de cada peso invertido.",
            idx_diff_title: "¿Qué Nos Hace Diferentes?",
            idx_diff_1_pre: "Nuestro equipo",
            idx_diff_1_desc: "Tu éxito no será un experimento. Asignamos únicamente a especialistas comprobados con más de 5 años operando campañas que escalan resultados reales.",
            idx_diff_2_pre: "Nuestra posición a la",
            idx_diff_2_strong: "vanguardia de la industria",
            idx_diff_2_desc: "Dominamos el juego antes de que cambien las reglas. Implementamos tácticas y formatos de nueva generación para asegurar que tu mensaje destaque frente a la competencia.",
            idx_diff_3_pre: "Nuestra adopción profunda de",
            idx_diff_3_strong: "inteligencia artificial",
            idx_diff_3_desc: "Multiplicamos tu impacto mediante tecnología avanzada. Usamos inteligencia artificial para predecir comportamientos, afinar perfilaciones y optimizar tu presupuesto constantemente.",
            idx_webs_title: "PROYECTOS WEB",
            idx_webs_subtitle: "Soluciones digitales de alto rendimiento diseñadas para la conversión.",
            idx_filter_todos: "TODOS",
            idx_filter_bienes: "BIENES RAÍCES",
            idx_filter_corporativo: "CORPORATIVO",
            idx_spec_plataforma: "PLATAFORMA",
            idx_spec_objetivo: "OBJETIVO",
            idx_spec_ano: "AÑO",
            idx_webs_explorar: "Explorar Caso",
            idx_webs_selector: "SELECCIONAR PROYECTO",
            idx_webs_cta_title: "¿Buscas algo diferente?",
            idx_webs_cta_text: "Cuéntanos tu idea y diseñaremos una solución a medida.",
            idx_webs_cta_btn: "AGENDAR LLAMADA",
            idx_test_role_4: "Directora Comercial, Vivir IPS",
            idx_test_text_1: "Desde que empezamos con Motor Advertising, las cosas han mejorado mucho: la selección de los anuncios adecuados, la realización de inversiones apropiadas y el seguimiento de los KPIs correctos, todo con su excelente asesoramiento.",
            idx_test_text_2: "Extremadamente agradecidos con Motor Advertising. Su sólida gestión y estrategia en Meta Ads han sido un impulso invaluable para nuestra empresa. Su dedicación y enfoque han marcado una gran diferencia en nuestra trayectoria.",
            idx_test_text_3: "El equipo de Motor transformó completamente nuestra presencia digital. Pasamos de no tener leads a recibir más de 40 solicitudes de cotización mensuales gracias a su sistema de pauta y landing pages.",
            idx_test_text_4: "Trabajar con Motor Advertising ha sido un antes y un después. No solo gestionan campañas, sino que entienden nuestro negocio y nos ayudan a tomar mejores decisiones basadas en datos reales de rendimiento.",
            idx_ph_nombre: "Ej. Juan Pérez",
            idx_ph_desafio: "Cuéntanos un poco sobre tus objetivos...",
            idx_ph_experiencia: "Describe tus mejores resultados...",
            wa_now: "Ahora",
            ttl_home: "Motor Advertising | Sistema de Crecimiento",
            ttl_services: "Motor Advertising | Servicios",
            ttl_contacto: "Contacto | Motor Advertising",
            ttl_planes: "Motor Advertising | Planes",
            ttl_login: "Motor Advertising | Iniciar sesión",
            // --- Subpáginas (services / pauta / contacto / planes / login) ---
            svc_hero_title: "Nuestros Servicios",
            svc_hero_sub: "Transformamos negocios con estrategia digital e inteligencia artificial. Cada servicio está diseñado para escalar tu marca con tecnología de vanguardia.",
            svc_tab_videos: "Videos IA",
            svc_tab_contenidos: "Contenidos",
            svc_videos_title: "Videos que generan impacto, producidos con IA",
            svc_videos_desc: "Combinamos modelos generativos de video, edición automatizada y narrativa estratégica para producir contenido audiovisual escalable sin sacrificar calidad. Desde guiones hasta postproducción, la IA potencia cada etapa del proceso creativo.",
            svc_videos_cta: "Solicitar demo",
            svc_contenidos_title: "Cada día cuenta. Cada publicación tiene un propósito.",
            svc_contenidos_desc: "Planificación editorial basada en datos, tendencias y comportamiento de audiencia para maximizar el alcance orgánico en cada plataforma. Cada pieza de contenido responde a un objetivo claro dentro de tu estrategia.",
            svc_contenidos_cta: "Crear mi estrategia",
            svc_cal_month: "Marzo 2026",
            svc_cal_lun: "Lun",
            svc_cal_mar: "Mar",
            svc_cal_mie: "Mié",
            svc_cal_jue: "Jue",
            svc_cal_vie: "Vie",
            svc_cal_sab: "Sáb",
            svc_cal_dom: "Dom",
            svc_seo_title: "El algoritmo correcto. En el momento correcto.",
            svc_seo_desc: "Análisis de datos y comportamiento de plataforma para elegir la estrategia de posicionamiento que mejor se adapta a cada canal digital. No aplicamos la misma fórmula para todos: cada algoritmo tiene sus propias reglas.",
            svc_seo_cta: "Posicionar mi marca",
            svc_chatbots_title: "Tu equipo de ventas. Disponible 24/7.",
            svc_chatbots_desc: "Chatbots entrenados con IA que entienden el contexto de tu negocio y convierten conversaciones en clientes. Automatiza ventas, agendamiento y atención al cliente por WhatsApp.",
            svc_chatbots_cta: "Activar mi chatbot",
            svc_audiovisual_title: "Imágenes que comunican. Historias que conectan.",
            svc_audiovisual_desc: "Producción audiovisual de alto impacto para marcas que quieren destacar: desde spots publicitarios hasta contenido para redes sociales. Cada marco es una oportunidad para contar tu historia.",
            svc_audiovisual_cta: "Ver showreel",
            svc_video_placeholder: "[Insertar video de showreel aquí]",
            svc_badge_arte: "Dirección de Arte",
            svc_crm_title: "Automatiza lo repetitivo. Humaniza lo importante.",
            svc_crm_desc: "Diseñamos flujos de automatización a medida para cualquier tipo de empresa, conectando CRM, canales de comunicación y procesos internos para reducir costos operativos y elevar la experiencia del cliente.",
            svc_crm_costos: "Reducción de costos",
            svc_crm_costos_1: "Elimina tareas manuales repetitivas",
            svc_crm_costos_2: "Reduce errores humanos en procesos clave",
            svc_crm_costos_3: "Escala operaciones sin contratar más personal",
            svc_crm_usuario: "Mejora del usuario",
            svc_crm_usuario_1: "Respuestas inmediatas a consultas frecuentes",
            svc_crm_usuario_2: "Seguimiento personalizado automático",
            svc_crm_usuario_3: "Experiencia consistente en cada punto de contacto",
            svc_crm_cta: "Automatizar mi negocio",
            svc_footer_desc: "Escalamos marcas de manera rentable con anuncios y sistemas de crecimiento altamente optimizados.",
            svc_footer_nav: "Navegación",
            svc_footer_proyectos: "Proyectos",
            svc_footer_casos: "Casos de éxito",
            svc_footer_hablemos: "Hablemos",
            svc_footer_cta: "Agendar llamada",
            svc_footer_copyright: "&copy; 2025 Motor Advertising. Todos los derechos reservados.",
            svc_wa_online: "En línea",
            svc_wa_msg: "¡Hola! 👋 ¿Necesitas ayuda o tienes alguna pregunta sobre nuestros servicios?",
            svc_wa_input: "Escribe un mensaje...",
            pta_loading_dash: "Cargando dashboard de resultados...",
            pta_marca_eyebrow: "Escalamos marcas de manera rentable con anuncios.",
            pta_marca_title: "TU MARCA. NUESTRO MOTOR",
            pta_marca_desc: "Para lograr resultados medibles y eficientes trabajamos de la mano de tu empresa como si fuéramos el motor que le da vida.",
            pta_marca_cta: "Quiero escalar mis ventas",
            pta_marca_micro: "Cuéntanos tu idea y evaluaremos cómo ayudarte.",
            pta_footer_brand_desc: "Escalamos marcas de manera rentable con anuncios y sistemas de crecimiento altamente optimizados.",
            pta_footer_nav: "Navegación",
            pta_footer_proyectos: "Proyectos",
            pta_footer_casos: "Casos de éxito",
            pta_footer_hablemos: "Hablemos",
            pta_footer_agendar: "Agendar llamada",
            pta_footer_copy: "&copy; 2025 Motor Advertising. Todos los derechos reservados.",
            pta_wa_online: "En línea",
            pta_wa_msg: "¡Hola! 👋 ¿Necesitas ayuda o tienes alguna pregunta sobre nuestros servicios?",
            pta_wa_input: "Escribe un mensaje...",
            pta_story_paused: "PAUSADO PARA LECTURA",
            cnt_inicia_cambio: "INICIA EL CAMBIO",
            cnt_selecciona_perfil: "Selecciona tu perfil para iniciar el proceso.",
            cnt_gcal_add: "Añadir a mi Google Calendar",
            cnt_footer_desc: "Escalamos marcas de manera rentable con anuncios y sistemas de crecimiento altamente optimizados.",
            cnt_footer_nav: "Navegación",
            cnt_footer_proyectos: "Proyectos",
            cnt_footer_casos: "Casos de éxito",
            cnt_footer_hablemos: "Hablemos",
            cnt_footer_agendar: "Agendar llamada",
            cnt_footer_rights: "Todos los derechos reservados.",
            cnt_wa_online: "En línea",
            cnt_wa_msg: "¡Hola! 👋 ¿Necesitas ayuda o tienes alguna pregunta sobre nuestros servicios?",
            cnt_wa_escribe: "Escribe un mensaje...",
            pln_hero_title: "Tus planes",
            pln_hero_sub: "Elige el plan que se ajusta a la etapa de tu negocio. Todos incluyen diseño profesional, soporte y un sistema pensado para convertir.",
            pln_name_inicial: "Inicial",
            pln_name_crecimiento: "Crecimiento",
            pln_usd_mes: "USD / mes",
            pln_recomendado: "Recomendado",
            pln_mkt_aud_inicial: "Negocios que arrancan con pauta",
            pln_aud_expansion: "Negocios en expansión",
            pln_aud_alto: "Marcas de alto rendimiento",
            pln_web_aud_inicial: "Pequeños negocios y startups",
            pln_mkt_budget_400: "Presupuesto desde $400/mes",
            pln_mkt_budget_500: "Presupuesto desde $500/mes",
            pln_mkt_budget_800: "Presupuesto desde $800/mes",
            pln_web_monthly_97: "+ $97/mes",
            pln_web_monthly_150: "+ $150/mes",
            pln_web_monthly_555: "+ $555/mes",
            pln_mkt_feat_meta: "Campañas en Meta Ads",
            pln_mkt_feat_segmentacion: "Segmentación y remarketing",
            pln_mkt_feat_creativos: "Creativos publicitarios",
            pln_mkt_feat_optimizacion: "Optimización de CPL, CTR y CPA",
            pln_mkt_feat_reporte_mensual: "Reporte mensual de resultados",
            pln_inherit_inicial: "Todo lo de Inicial, MÁS:",
            pln_inherit_crecimiento: "Todo lo de Crecimiento, MÁS:",
            pln_mkt_feat_google: "Google Ads (búsqueda y display)",
            pln_mkt_feat_abtesting: "A/B testing de creativos y copies",
            pln_mkt_feat_contenido: "Estrategia de contenido",
            pln_mkt_feat_leads: "Trazabilidad de leads (píxeles, WhatsApp)",
            pln_mkt_feat_reporte_quincenal: "Reporte quincenal",
            pln_mkt_feat_embudos: "Embudos y landing pages de conversión",
            pln_mkt_feat_automatizaciones: "Automatizaciones de seguimiento (email + WhatsApp)",
            pln_mkt_feat_dashboard: "Dashboard de resultados en tiempo real",
            pln_mkt_feat_reunion: "Reunión estratégica mensual",
            pln_mkt_feat_soporte: "Soporte prioritario",
            pln_cta_inicial: "Elegir Inicial",
            pln_cta_crecimiento: "Elegir Crecimiento",
            pln_cta_elite: "Elegir Elite",
            pln_web_feat_3pag: "Sitio de 3 páginas",
            pln_web_feat_responsive: "Escritorio y móvil",
            pln_web_feat_seo: "SEO on-page",
            pln_web_feat_form: "Formulario de contacto",
            pln_web_feat_email: "Automatizaciones de email",
            pln_web_feat_1edit: "1 edición/mes",
            pln_web_feat_5pag: "Sitio de 5 páginas",
            pln_web_feat_agenda: "Sistema de agendamiento",
            pln_web_feat_pagos: "Procesamiento de pagos",
            pln_web_feat_resenas: "Reseñas de Google (automatización)",
            pln_web_feat_3edit: "3 ediciones/mes",
            pln_web_feat_10pag: "Sitio de 10+ páginas",
            pln_web_feat_seo_gestion: "Gestión de SEO continua",
            pln_web_feat_chatbot: "Chatbot con IA",
            pln_web_feat_crm: "CRM personalizado",
            pln_web_feat_5edit: "5 ediciones/mes",
            pln_note_en: "En",
            pln_note_web_rest: ", el setup es un pago único de construcción y la mensualidad cubre hosting, soporte y las funciones del plan.",
            pln_note_mkt_rest: ", el presupuesto de pauta va directo a Meta/Google y es independiente del fee mensual.",
            pln_note_q: "¿No sabes cuál te conviene?",
            pln_note_escribenos: "Escríbenos",
            pln_note_juntos: "y lo definimos juntos.",
            lgn_title: "Bienvenido",
            lgn_sub: "Inicia sesión o crea tu cuenta para continuar.",
            lgn_tab_login: "Iniciar sesión",
            lgn_tab_signup: "Crear cuenta",
            lgn_google: "Continuar con Google",
            lgn_divider: "o con tu correo",
            lgn_email: "Correo electrónico",
            lgn_password: "Contraseña",
            lgn_login_submit: "Entrar",
            lgn_password_min: "Contraseña (mínimo 6 caracteres)",
            lgn_foot_terms: "Al continuar aceptas ser contactado por Motor Advertising.",
            lgn_back_home: "← Volver al inicio",
            lgn_view_plans: "Ver planes",
            form_agenda: 'Agenda tu cita',
            test_title: 'TESTIMONIOS',
            hero_headline: 'Tu marca. <span class="highlight">Nuestro motor.</span>',
            hero_subheadline: 'El marketing no es una serie de acciones aisladas.<br>Es un sistema que debe adaptarse, aprender y evolucionar.',
            hero_support: 'Interpretamos datos, comportamiento del mercado y momento de la marca para decidir cómo debe moverse, cuándo escalar y cuándo ajustar.',
            hero_cta_primary: 'Activar el motor',
            hero_cta_secondary: 'Conocer el sistema',
            conv_1: 'No necesitas más contenido.',
            conv_2: 'No necesitas más seguidores.',
            conv_3: 'Necesitas un sistema que convierta atención en dinero.',
            conv_4: 'Eso es exactamente lo que construimos.',
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
            pm_title: 'RENDIMIENTO DE PAUTA DIGITAL',
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
            contact_title: 'CONTÁCTANOS',
            contact_subtitle: 'Elige el canal que prefieras: respondemos el mismo día.',
            contact_empresa: 'Soy una Empresa',
            contact_profesional: 'Soy un Profesional',
            contact_ch_wa_d: 'Chat directo con el equipo. Respuesta inmediata.',
            contact_ch_wa_cta: 'Abrir chat',
            contact_ch_mail: 'Correo',
            contact_ch_mail_d: 'Cuéntanos tu proyecto y te respondemos.',
            contact_ch_mail_cta: 'Enviar correo',
            contact_ch_emp_d: 'Formulario + agenda una cita con el equipo.',
            contact_ch_emp_cta: 'Empezar ahora',
            contact_ch_pro_d: 'Únete a nuestra red de talento.',
            contact_ch_pro_cta: 'Postularme',
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
            pauta_dash_title: 'RENDIMIENTO DE PAUTA DIGITAL',
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

        // Translate placeholders (inputs/textareas marked with data-i18n-ph)
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            if (dict[key] !== undefined) {
                el.placeholder = dict[key];
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
            title_en: 'Ecoraconsciente: The Pleasure of Traveling',
            longDescription: 'San Andrés es un paraíso, pero la competencia es feroz. Para Ecoraconsciente, no vendimos "tours", vendimos la sensación de libertad. Diseñamos anuncios que capturan el ojo en 1 segundo y guían al usuario sin fricciones hasta la reserva. El resultado: un sistema de ventas automático que permite al dueño enfocarse en dar la mejor experiencia mientras los clientes llegan solos por la web.',
            longDescription_en: 'San Andrés is a paradise, but the competition is fierce. For Ecoraconsciente we didn\'t sell "tours" — we sold the feeling of freedom. We designed ads that capture the eye in 1 second and guide the user friction-free all the way to the booking. The result: an automated sales system that lets the owner focus on delivering the best experience while customers arrive on their own through the web.',
            tags: ['Turismo', 'Ventas en Automático', 'San Andrés'],
            tags_en: ['Tourism', 'Sales on Autopilot', 'San Andrés'],
            trigger: 'Deseo y Libertad',
            trigger_en: 'Desire and Freedom',
            psychDesc: 'Al evocar aspiraciones profundas de escape y libertad, reducimos la resistencia cognitiva. El cliente no percibe el anuncio como un esfuerzo de venta, sino como una inversión emocional inminente.',
            psychDesc_en: 'By evoking deep aspirations of escape and freedom, we lower cognitive resistance. The customer doesn\'t perceive the ad as a sales effort, but as an imminent emotional investment.',
            icon: 'fas fa-map-pin',
            color: '#0F394A',
            colorClass: 'case-color-cyan',
            thumbnail: 'https://images.unsplash.com/photo-1520116468816-95b69f847357?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900522/Video_amanecer_ecoraconsiente_ai77wl.mp4',
        },
        {
            title: 'Justicia con Empatía',
            title_en: 'Justice with Empathy',
            longDescription: 'Nadie busca un abogado por gusto, sino por necesidad. Para Soluciones Legales, humanizamos la marca para que el cliente sintiera alivio desde el primer anuncio. Creamos un puente directo a WhatsApp donde la asesoría se siente cercana, logrando que personas con problemas legales complejos den el primer paso con confianza y rapidez.',
            longDescription_en: 'Nobody looks for a lawyer for fun — they do it out of need. For Soluciones Legales we humanized the brand so clients felt relief from the very first ad. We built a direct bridge to WhatsApp where the advice feels close and personal, getting people with complex legal problems to take the first step quickly and with confidence.',
            tags: ['Legal', 'Confianza', 'Leads Calificados'],
            tags_en: ['Legal', 'Trust', 'Qualified Leads'],
            trigger: 'Paz Mental',
            trigger_en: 'Peace of Mind',
            psychDesc: 'Utilizamos el principio de reducción de incertidumbre. Presentar una solución clara y empática antes de que la ansiedad escale, posiciona a la marca como el "salvador" lógico ante una urgencia.',
            psychDesc_en: 'We used the principle of uncertainty reduction. Presenting a clear, empathetic solution before anxiety escalates positions the brand as the logical "savior" in an urgent situation.',
            icon: 'fas fa-comment',
            color: '#0F394A',
            colorClass: 'case-color-slate',
            thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773899658/Compa%C3%B1ia_soluciones_legales_f8volg.mp4',
        },
        {
            title: 'La Magia de los Eventos',
            title_en: 'The Magic of Events',
            longDescription: 'Un evento vacío es el mayor miedo de un organizador. Usamos el poder de la recomendación (influencers) y la velocidad de la tecnología (bots de WhatsApp) para crear un efecto de "no me lo puedo perder". Logramos que más de mil personas dijeran "presente", automatizando las dudas frecuentes para que el equipo solo se encargara de disfrutar el éxito del evento.',
            longDescription_en: 'An empty venue is an organizer\'s greatest fear. We used the power of recommendation (influencers) and the speed of technology (WhatsApp bots) to create a "can\'t miss it" effect. We got more than a thousand people to say "count me in", automating the frequent questions so the team\'s only job was to enjoy the success of the event.',
            tags: ['Eventos Masivos', 'Viralidad', 'Automatización'],
            tags_en: ['Massive Events', 'Virality', 'Automation'],
            trigger: 'Sentido de Pertenencia',
            trigger_en: 'Sense of Belonging',
            psychDesc: 'Aplicamos FOMO extremo sumado a "Social Proof". Cuando las métricas demuestran adopción masiva, asistir deja de ser una opción y se convierte en una validación social obligatoria.',
            psychDesc_en: 'We applied extreme FOMO combined with social proof. When the metrics show massive adoption, attending stops being an option and becomes mandatory social validation.',
            icon: 'fas fa-share-nodes',
            color: '#9333ea',
            colorClass: 'case-color-purple',
            thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773899990/Evento_techno_axo2o0.mp4',
        },
        {
            title: 'Macca: Dominio Geolocalizado y Autoridad Premium',
            title_en: 'Macca: Geolocated Dominance and Premium Authority',
            longDescription: 'Para posicionar el nuevo tratamiento anti-frizz de Macca, aplicamos el principio de hiper-segmentación y el efecto de "mera exposición". Diseñamos campañas de geolocalización milimétrica impactando exclusivamente a perfiles de alta intención en el perímetro del estudio. Al reducir la fricción en el embudo y dirigir el tráfico hacia un agendamiento conversacional (WhatsApp), logramos saturar la disponibilidad y consolidar la marca como la autoridad estética de la zona.',
            longDescription_en: 'To position Macca\'s new anti-frizz treatment, we applied the principle of hyper-segmentation and the "mere exposure" effect. We designed millimeter-precise geolocation campaigns reaching exclusively high-intent profiles around the studio. By reducing friction in the funnel and driving traffic to conversational booking (WhatsApp), we saturated availability and consolidated the brand as the aesthetic authority of the area.',
            tags: ['Hiper-segmentación', 'Embudo Conversacional', 'Autoridad'],
            tags_en: ['Hyper-segmentation', 'Conversational Funnel', 'Authority'],
            trigger: 'Priming',
            trigger_en: 'Priming',
            psychDesc: 'Aprovechamos el "Efecto de mera exposición" hiper-local. Al mostrar la solución repetidamente en la zona de confort del objetivo, el lead desarrolla preferencia e intención de compra de forma subconsciente.',
            psychDesc_en: 'We leveraged the hyper-local "mere exposure effect". By repeatedly showing the solution inside the target\'s comfort zone, the lead subconsciously develops preference and purchase intent.',
            icon: 'fas fa-bullseye',
            color: '#d97706',
            colorClass: 'case-color-amber',
            thumbnail: '/assets/macca_thumb.png',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900383/Macca_lc8teo.mp4',
        },
        {
            title: 'Vital Balance: Salud Sin Fronteras',
            title_en: 'Vital Balance: Health Without Borders',
            longDescription: 'Vender salud en EE.UU. requiere precisión y respeto. Para Vital Balance, personalizamos los anuncios por ciudad para que cada persona sintiera que le hablábamos directamente a ella. Con una web sencilla y el poder de una llamada por WhatsApp, facilitamos que miles de pacientes accedan a Insulife, mejorando sus vidas mientras la empresa escala con orden y control.',
            longDescription_en: 'Selling health in the U.S. requires precision and respect. For Vital Balance we personalized the ads by city so every person felt we were speaking directly to them. With a simple website and the power of a WhatsApp call, we made it easy for thousands of patients to access Insulife, improving their lives while the company scales with order and control.',
            tags: ['Salud', 'Mercado USA', 'Impacto Social'],
            tags_en: ['Health', 'US Market', 'Social Impact'],
            trigger: 'Cuidado y Familia',
            trigger_en: 'Care and Family',
            psychDesc: 'Activamos el efecto de "Identidad de Endogrupo". Al hipersegmentar por contexto cultural, el paciente percibe que el mensaje fue diseñado exclusivamente para proteger y cuidar a su círculo más íntimo.',
            psychDesc_en: 'We activated the "in-group identity" effect. By hyper-segmenting by cultural context, the patient feels the message was designed exclusively to protect and care for their closest circle.',
            icon: 'fas fa-heart-pulse',
            color: '#059669',
            colorClass: 'case-color-emerald',
            thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900190/INSULIFE_Vital_Balance_kxxewe.mp4',
        },
        {
            title: 'Cirugía Capilar: Clientes que Vuelven',
            title_en: 'Hair Surgery: Customers Who Come Back',
            longDescription: 'A veces el tesoro está en casa. En lugar de gastar fortunas en clientes nuevos, fuimos por quienes ya amaban la marca. Con un retargeting inteligente, les presentamos la nueva Cirugía Capilar. Al ser una marca conocida, la confianza ya estaba ahí, logrando que el lanzamiento fuera un éxito rotundo con una inversión mínima.',
            longDescription_en: 'Sometimes the treasure is at home. Instead of spending fortunes on new customers, we went after those who already loved the brand. With smart retargeting we introduced them to the new Hair Surgery treatment. Being a known brand, the trust was already there, making the launch a resounding success with minimal investment.',
            tags: ['Belleza', 'Fidelización', 'Lanzamiento'],
            tags_en: ['Beauty', 'Loyalty', 'Launch'],
            trigger: 'Familiaridad',
            trigger_en: 'Familiarity',
            psychDesc: 'Apalancamos el "Sesgo de Familiaridad". Vender es exponencialmente más económico hacia quienes ya confían. Con retargeting, eliminamos la fricción de consideración; el prospecto cruza directo a la decisión.',
            psychDesc_en: 'We leveraged the "familiarity bias". Selling to people who already trust you is exponentially cheaper. With retargeting we removed the consideration friction; the prospect jumps straight to the decision.',
            icon: 'fas fa-scissors',
            color: '#f472b6',
            colorClass: 'case-color-pink',
            thumbnail: '/assets/cirugia_capilar_thumb.png',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773899315/CIRUGIA_CAPIALR_YOMI_fa7ntv.mp4',
        },
        {
            title: 'Vital Balance: KetoXL - Salud Integral',
            title_en: 'Vital Balance: KetoXL - Whole-Body Health',
            longDescription: 'KetoXL de Vital Balance atacó la necesidad latente de mejorar la salud y el bienestar físico. Implementamos una estrategia de distribución omnicanal que cubrió todas las ciudades, permitiendo que miles de personas descubrieran un aliado seguro para adelgazar. No solo vendimos un producto, vendimos la posibilidad de un cambio de vida real y duradero a través de la suplementación inteligente.',
            longDescription_en: 'Vital Balance\'s KetoXL addressed the latent need to improve health and physical well-being. We implemented an omnichannel distribution strategy covering every city, allowing thousands of people to discover a safe ally for losing weight. We didn\'t just sell a product — we sold the possibility of a real, lasting life change through smart supplementation.',
            tags: ['Salud Integral', 'Pérdida de Peso', 'Alcance Nacional'],
            tags_en: ['Whole-Body Health', 'Weight Loss', 'Nationwide Reach'],
            trigger: 'Salud y Resultados',
            trigger_en: 'Health and Results',
            psychDesc: 'Implementamos el sesgo de "Aversión a la Pérdida". Al visualizar una transformación integral asimilable, el usuario percibe que el costo de no intentar este cambio es infinitamente mayor que el precio del suplemento.',
            psychDesc_en: 'We implemented the "loss aversion" bias. By visualizing an attainable full transformation, the user perceives that the cost of not attempting this change is infinitely greater than the price of the supplement.',
            icon: 'fas fa-weight-scale',
            color: '#10b981',
            colorClass: 'case-color-emerald',
            thumbnail: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900300/keto_xl_Vital_Balance_ws3wls.mp4', 
        },
        {
            title: 'YomiLove: El Poder de un Regalo',
            title_en: 'YomiLove: The Power of a Gift',
            longDescription: '¿A quién no le gusta un detalle? Creamos un video gancho para las amantes de las uñas. La promesa era simple: ven al salón, muestra este video y recibe un regalo. Esto rompió el hielo con clientas nuevas, llenó el local de energía y nos dio una forma real de decir: "Este anuncio trajo a esta persona hoy".',
            longDescription_en: 'Who doesn\'t love a little gift? We created a hook video for nail lovers. The promise was simple: come to the salon, show this video and get a gift. It broke the ice with new clients, filled the salon with energy and gave us a real way to say: "This ad brought this person in today".',
            tags: ['Uñas', 'Incentivo', 'Nuevas Clientas'],
            tags_en: ['Nails', 'Incentive', 'New Clients'],
            trigger: 'Gratitud',
            trigger_en: 'Gratitude',
            psychDesc: 'Activamos velozmente el poderoso "Principio de Reciprocidad". Ofrecer valor por adelantado sin fricción obliga e incentiva subconscientemente al consumidor a sentirse en deuda, multiplicando la conversión.',
            psychDesc_en: 'We rapidly triggered the powerful "reciprocity principle". Offering upfront value with zero friction subconsciously compels the consumer to feel indebted, multiplying conversion.',
            icon: 'fas fa-gift',
            color: '#d946ef',
            colorClass: 'case-color-fuchsia',
            thumbnail: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=1200&fit=crop',
            videoUrl: 'https://res.cloudinary.com/dhw9jix2n/video/upload/v1773900466/Regalo_Yomi_jylqri.mp4',
        },
    ];

    // Textos fijos del modal de historias {es, en}
    const STORY_UI = {
        es: {
            behind: 'La Historia Detrás',
            how: 'Cómo lo logramos',
            psych: 'Psicología de Ventas',
            effect: 'Efecto: ',
            view: 'Ver Análisis',
            cta_primary: 'Escalar mis resultados',
            cta_secondary: 'Ver Proceso',
        },
        en: {
            behind: 'The Story Behind',
            how: 'How we did it',
            psych: 'Sales Psychology',
            effect: 'Effect: ',
            view: 'View Analysis',
            cta_primary: 'Scale my results',
            cta_secondary: 'See the Process',
        }
    };

    // Devuelve la variante _en del campo si el idioma actual es inglés
    function caseField(c, field) {
        if (window._currentLang === 'en' && c[field + '_en'] !== undefined) return c[field + '_en'];
        return c[field];
    }

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
        const ui = STORY_UI[window._currentLang] || STORY_UI.es;
        casesGrid.innerHTML = CASES_DATA.map((c, i) => `
            <div class="case-card" data-case="${i}">
                <img src="${c.thumbnail}" alt="${caseField(c, 'title')}" class="case-thumb">
                ${c.videoUrl ? `<video src="${c.videoUrl}" class="case-video-hover" loop playsinline></video>` : ''}
                <div class="case-overlay"></div>
                <div class="case-card-content">
                    <div class="case-card-trigger" style="color:${c.color};">${caseField(c, 'trigger')}</div>
                    <h3 class="case-card-title">${caseField(c, 'title')}</h3>
                    <div class="case-card-footer">
                        <span data-i18n="cases_view">${ui.view}</span>
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

        // Re-render las tarjetas al cambiar idioma (después de que applyLanguage corra)
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(renderCases, 0);
            });
        });
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

        const ui = STORY_UI[window._currentLang] || STORY_UI.es;

        // Header info
        storyHeaderInfo.innerHTML = `
            <div class="story-info-icon ${c.colorClass}" style="background:${c.color};"><i class="${c.icon}"></i></div>
            <div class="story-info-text">
                <div class="story-info-title">${caseField(c, 'title')}</div>
                <div class="story-info-trigger">${caseField(c, 'trigger')}</div>
            </div>
        `;

        // Right panel content
        storyRight.innerHTML = `
            <div class="story-label-line"><div class="line"></div><span>${ui.behind}</span></div>
            <h2 class="story-detail-title">${caseField(c, 'title')}</h2>
            <div class="story-detail-tags">${caseField(c, 'tags').map(t => `<span><i class="fas fa-tag"></i>${t}</span>`).join('')}</div>
            <div class="story-how-label">${ui.how}</div>
            <p class="story-how-text">${caseField(c, 'longDescription')}</p>
            <div class="story-psych-card">
                <div class="story-psych-glow" style="background:${c.color};"></div>
                <div class="story-psych-label">${ui.psych}</div>
                <div class="story-psych-content">
                    <div class="story-psych-icon" style="background:${c.color};"><i class="${c.icon}"></i></div>
                    <div>
                        <div class="story-psych-title">${ui.effect}${caseField(c, 'trigger')}</div>
                        <p class="story-psych-desc">${caseField(c, 'psychDesc')}</p>
                    </div>
                </div>
            </div>
            <div class="story-cta-group">
                <button class="story-cta-primary">${ui.cta_primary}</button>
                <button class="story-cta-secondary">${ui.cta_secondary}</button>
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

// ==========================================
// V4.0 — TESTIMONIALS CAROUSEL
// ==========================================
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const track = document.getElementById('testimonials-track');
        const dotsContainer = document.getElementById('testimonials-dots');
        const arrowLeft = document.getElementById('test-arrow-left');
        const arrowRight = document.getElementById('test-arrow-right');
        if (!track || !dotsContainer) return;

        const cards = track.querySelectorAll('.testimonial-card');
        const isMobile = window.innerWidth < 768;
        const cardsPerView = isMobile ? 1 : 2;
        const totalPages = Math.ceil(cards.length / cardsPerView);
        let currentPage = 0;

        // Create dots
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToPage(i));
            dotsContainer.appendChild(dot);
        }

        function goToPage(index) {
            currentPage = index;
            const offset = isMobile ? currentPage * 100 : currentPage * 100;
            track.style.transform = `translateX(-${offset}%)`;
            dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
                d.classList.toggle('active', i === currentPage);
            });
        }

        if (arrowLeft) arrowLeft.addEventListener('click', () => {
            goToPage(currentPage > 0 ? currentPage - 1 : totalPages - 1);
        });
        if (arrowRight) arrowRight.addEventListener('click', () => {
            goToPage(currentPage < totalPages - 1 ? currentPage + 1 : 0);
        });

        // Touch swipe — passive listeners so browser scroll is never blocked
        let startX = 0;
        track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
        track.addEventListener('touchend', (e) => {
            const diff = startX - e.changedTouches[0].clientX;
            if (diff > 50) goToPage(Math.min(currentPage + 1, totalPages - 1));
            if (diff < -50) goToPage(Math.max(currentPage - 1, 0));
        }, { passive: true });
    });
})();

// --- WhatsApp Widget Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const waPopup = document.getElementById('wa-popup');
    const waBadge = document.getElementById('wa-badge');
    const waClose = document.getElementById('wa-popup-close');
    const waTimeNow = document.getElementById('wa-time-now');

    if(waPopup && waBadge && waClose) {
        // Set dynamic time
        if(waTimeNow) {
            const now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
            hours = hours % 12;
            hours = hours ? hours : 12; 
            minutes = minutes < 10 ? '0'+minutes : minutes;
            waTimeNow.textContent = hours + ':' + minutes + ' ' + ampm;
        }

        // Show popup after 7 seconds
        setTimeout(() => {
            waPopup.classList.add('show');
            waBadge.classList.add('show');
        }, 7000);

        // Close logic
        waClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            waPopup.classList.remove('show');
        });
        
        // Hide badge when button is clicked
        const stickyBtn = document.getElementById('wa-sticky-btn');
        if(stickyBtn) {
            stickyBtn.addEventListener('click', () => {
                waBadge.classList.remove('show');
            });
        }
    }
});
