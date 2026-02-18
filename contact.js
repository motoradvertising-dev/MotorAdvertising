document.addEventListener('DOMContentLoaded', () => {
    const profileSelection = document.getElementById('profile-selection');
    const formContainer = document.getElementById('form-container');
    const backBtn = document.getElementById('back-to-selection');
    const contactForm = document.getElementById('contact-form');
    const successMessage = document.getElementById('success-message');
    const profileInput = document.getElementById('profile-input');

    const empresaFields = document.getElementById('empresa-fields');
    const trabajadorFields = document.getElementById('trabajador-fields');

    // Profile Selection Logic
    document.querySelectorAll('.profile-card').forEach(card => {
        card.addEventListener('click', () => {
            const profile = card.dataset.profile;
            showForm(profile);
        });
    });

    function showForm(profile) {
        profileInput.value = profile;
        profileSelection.classList.add('hidden');
        formContainer.classList.remove('hidden');

        if (profile === 'empresa') {
            empresaFields.classList.remove('hidden');
            trabajadorFields.classList.add('hidden');
            // Update requirements
            document.getElementById('company').required = true;
            document.getElementById('role').required = false;
        } else {
            empresaFields.classList.add('hidden');
            trabajadorFields.classList.remove('hidden');
            // Update requirements
            document.getElementById('company').required = false;
            document.getElementById('role').required = true;
        }

        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    backBtn.addEventListener('click', () => {
        formContainer.classList.add('hidden');
        profileSelection.classList.remove('hidden');
        contactForm.classList.remove('hidden');
        successMessage.classList.add('hidden');
    });

    // Form submission
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Visual feedback
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        // Simulate API call
        setTimeout(() => {
            contactForm.classList.add('hidden');
            successMessage.classList.remove('hidden');
            backBtn.classList.add('hidden');

            // Console log the data for debugging/demo
            const formData = new FormData(contactForm);
            console.log('Form Submitted:', Object.fromEntries(formData));
        }, 1500);
    });
});
