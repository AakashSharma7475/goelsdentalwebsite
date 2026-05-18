/**
 * Goel's Dental Clinic - Component Loader
 * Loads reusable navbar component into all pages
 */

(function() {
    'use strict';

    const CONFIG = {
        // Use relative path so it works on local + hosted
        navbarPath: 'components/navbar.html',
        navbarPlaceholder: '#navbar',
        scrollThreshold: 50,
        revealSelector: [
            // Page headers/blocks
            '.services-header',
            '.about-header',
            '.locations-header',
            '.appointment-header',
            '.why-choose-us-header',
            '.faq-header',
            '.page-hero-container',
            '.section-header',
            // Cards
            '.service-card',
            '.feature-card',
            '.location-card',
            '.faq-item',
            '.mv-card',
            '.why-card',
            '.stat-item',
            '.service-card-premium',
            '.trust-card',
            '.contact-info-card',
            '.contact-location-card',
            '.why-visit-card',
            '.appointment-info-card',
            '.working-hours-card',
            '.why-book-card'
        ].join(','),
        revealThreshold: 0.18,
        revealRootMargin: '0px 0px -10% 0px'
    };

    async function loadNavbar() {
        const placeholder = document.querySelector(CONFIG.navbarPlaceholder);
        
        if (!placeholder) {
            console.error('[Goel Dental] Navbar placeholder not found. Add <div id="navbar"></div> to your page.');
            return;
        }

        try {
            const response = await fetch(CONFIG.navbarPath);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            placeholder.innerHTML = html;
            
            initializeNavbar();
            
        } catch (error) {
            console.error('[Goel Dental] Failed to load navbar:', error.message);
            placeholder.innerHTML = '<!-- Navbar failed to load -->';
        }
    }

    function initializeNavbar() {
        const navbar = document.querySelector('.navbar');
        
        if (!navbar) {
            console.error('[Goel Dental] Navbar element not found after injection');
            return;
        }

        highlightActiveLink();
        initScrollEffect(navbar);
        initMobileMenu(navbar);
        initGlobalEnhancements();
    }

    function initGlobalEnhancements() {
        // Safe to run on every page
        try {
            initImageLoadingDefaults();
            initRevealOnScroll();
        } catch (e) {
            console.warn('[Goel Dental] Enhancements init failed:', e?.message || e);
        }
    }

    function highlightActiveLink() {
        const currentPage = window.location.pathname;
        const currentFile = currentPage.split('/').pop() || 'index.html';
        
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            const isActive = href === currentFile || 
                           (currentFile === '' && href === 'index.html') ||
                           (currentFile === '/' && href === 'index.html');
            
            if (isActive) {
                link.classList.add('active');
            }
        });
    }

    function initScrollEffect(navbar) {
        let ticking = false;
        
        function updateScrollState() {
            const scrollY = window.scrollY || window.pageYOffset;
            navbar.classList.toggle('scrolled', scrollY > CONFIG.scrollThreshold);
            ticking = false;
        }
        
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(updateScrollState);
                ticking = true;
            }
        }, { passive: true });
        
        updateScrollState();
    }

    function initMobileMenu(navbar) {
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navLinks');
        
        if (!hamburger || !navLinks) return;
        
        hamburger.addEventListener('click', function() {
            const isActive = this.classList.toggle('active');
            navLinks.classList.toggle('active');
            this.setAttribute('aria-expanded', isActive);
            document.body.classList.toggle('menu-open', isActive);
        });
        
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('menu-open');
            });
        });
        
        document.addEventListener('click', function(event) {
            if (!navbar.contains(event.target) && navLinks.classList.contains('active')) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('menu-open');
            }
        });
    }

    function initImageLoadingDefaults() {
        const images = Array.from(document.images || []);
        if (!images.length) return;

        // Prefer explicit eager on hero/first important image if not already set
        const heroImg =
            document.querySelector('.hero img') ||
            document.querySelector('.page-hero img') ||
            document.querySelector('.appointment-hero img');

        images.forEach(img => {
            // Don't touch if author already set these
            if (!img.hasAttribute('decoding')) img.decoding = 'async';
            if (!img.hasAttribute('loading')) img.loading = 'lazy';
        });

        if (heroImg) {
            heroImg.loading = 'eager';
            heroImg.fetchPriority = heroImg.getAttribute('fetchpriority') || 'high';
        }
    }

    function initRevealOnScroll() {
        // Respect user preference
        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (prefersReducedMotion) {
            document.documentElement.classList.add('reduced-motion');
            return;
        }

        const candidates = Array.from(document.querySelectorAll(CONFIG.revealSelector));
        if (!candidates.length) return;

        // Mark up elements so CSS can override existing auto-animations
        candidates.forEach((el, idx) => {
            el.classList.add('reveal');
            // Stagger a little for nicer flow (CSS uses --reveal-delay)
            const current = parseFloat(getComputedStyle(el).getPropertyValue('--reveal-delay'));
            if (Number.isNaN(current)) {
                el.style.setProperty('--reveal-delay', `${Math.min(idx * 0.03, 0.45)}s`);
            }
        });

        if (!('IntersectionObserver' in window)) {
            candidates.forEach(el => el.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: CONFIG.revealThreshold,
                rootMargin: CONFIG.revealRootMargin
            }
        );

        const viewportH = window.innerHeight || 0;
        candidates.forEach(el => {
            // Avoid "flash of hidden" for above-the-fold content
            const r = el.getBoundingClientRect?.();
            if (r && viewportH && r.top < viewportH * 0.92) {
                el.classList.add('is-visible');
                return;
            }
            observer.observe(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNavbar);
    } else {
        loadNavbar();
    }
})();
