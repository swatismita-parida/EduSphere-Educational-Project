// ===== BACKEND URL =====
const BACKEND_URL = 'http://localhost:5000';

// ===== GSAP INIT =====
gsap.registerPlugin(ScrollTrigger);

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  let darkMode = true;
  themeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    themeToggle.innerHTML = darkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
  });
}

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
}

// ===== SCROLL PROGRESS & BACK TO TOP =====
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  const scrollProgress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');
  if (scrollProgress) scrollProgress.style.width = progress + '%';
  if (backToTop) backToTop.classList.toggle('visible', scrollTop > 300);
});

const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== CONTACT FORM (SMTP + Validation) =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('formStatus');
    const btn = form.querySelector('button[type="submit"]');
    const originalBtn = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Sending...';

    const payload = {
      name: form.name.value,
      email: form.email.value,
      subject: form.subject.value,
      message: form.message.value
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (status) {
        status.style.display = 'block';
        if (res.ok) {
          status.textContent = '✅ ' + (data.message || 'Message sent successfully!');
          status.style.color = '#2ecc71';
          form.reset();
        } else {
          let errorMsg = data.message || 'Validation failed.';
          if (data.errors && data.errors.length > 0) {
            errorMsg += ' — ' + data.errors.join(' ');
          }
          status.textContent = '❌ ' + errorMsg;
          status.style.color = '#e74c3c';
        }
      }
    } catch (err) {
      if (status) {
        status.style.display = 'block';
        status.textContent = "❌ Couldn't reach the server. Please try again.";
        status.style.color = '#e74c3c';
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtn;
      if (status) setTimeout(() => { status.style.display = 'none'; }, 6000);
    }
  });
}

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-question').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    item.classList.toggle('active');
  });
});

// ===== PRICING TOGGLE =====
const pricingToggle = document.getElementById('pricingToggle');
if (pricingToggle) {
  let yearly = false;
  pricingToggle.addEventListener('click', () => {
    yearly = !yearly;
    pricingToggle.classList.toggle('active');
    const pro = document.getElementById('proPrice');
    const ent = document.getElementById('enterprisePrice');
    if (pro && ent) {
      if (yearly) {
        pro.innerHTML = '$15 <span>/mo</span>';
        ent.innerHTML = '$39 <span>/mo</span>';
      } else {
        pro.innerHTML = '$19 <span>/mo</span>';
        ent.innerHTML = '$49 <span>/mo</span>';
      }
    }
  });
}

// ===== CTA BUTTONS =====
const ctaHero = document.getElementById('cta-hero');
if (ctaHero) {
  ctaHero.addEventListener('click', () => {
    window.location.href = 'contact.html';
  });
}
const ctaAdmission = document.getElementById('cta-admission');
if (ctaAdmission) {
  ctaAdmission.addEventListener('click', () => {
    window.location.href = 'contact.html';
  });
}

// ===== GSAP REVEALS =====
document.querySelectorAll('.reveal').forEach(el => {
  gsap.fromTo(el, { opacity: 0, y: 50 }, {
    opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
  });
});

console.log('🚀 EduSphere script loaded');