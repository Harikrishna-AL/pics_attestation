/* PICS — presentation-only enhancements. No business logic lives here. */
(function () {
	'use strict';

	var root = document.documentElement;
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Header gets a hairline + tighter padding once the page scrolls
	var header = document.querySelector('.navigation');
	if (header) {
		var onScroll = function () {
			header.classList.toggle('is-scrolled', window.scrollY > 8);
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
	}

	// Reveal sections as they enter the viewport
	var reveals = document.querySelectorAll('.reveal');
	if (reveals.length && 'IntersectionObserver' in window && !reduceMotion) {
		root.classList.add('js-reveal');
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-in');
					io.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
		reveals.forEach(function (el) { io.observe(el); });
	}

	// Service pages: close each article with a way to act on it
	var article = document.querySelector('.portfolio-single-page .project-content');
	if (article && !article.querySelector('.service-cta')) {
		var inPages = /\/pages\//.test(window.location.pathname);
		var base = inPages ? '../../' : '';
		var titleEl = article.querySelector('h1, h2');
		var topic = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : 'attestation';
		var waText = encodeURIComponent('Hi PICS, I would like to know more about: ' + topic);

		var cta = document.createElement('div');
		cta.className = 'service-cta';
		cta.innerHTML =
			'<div>' +
				'<h3>Ready to start?</h3>' +
				'<p>Send us your document details and we will confirm the process, cost and timeline.</p>' +
			'</div>' +
			'<div class="actions">' +
				'<a class="btn-main" href="https://wa.me/+918369820334?text=' + waText + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp" aria-hidden="true"></i>WhatsApp us</a>' +
				'<a class="btn-ghost" href="' + base + 'statusreport.html">Track status</a>' +
			'</div>';
		article.appendChild(cta);
	}
})();
