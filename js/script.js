/* ---------- Announcement bar (shown on every page with the main menu) ---------- */
(function () {
	'use strict';
	var scriptSrc = document.currentScript && document.currentScript.src;
	var header = document.querySelector('header.navigation');
	if (!header || document.querySelector('.announce-bar')) return;

	// Icons used in the banner/popup (some pages don't load this font)
	if (!document.querySelector('link[href*="bootstrap-icons"]')) {
		var icons = document.createElement('link');
		icons.rel = 'stylesheet';
		icons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
		document.head.appendChild(icons);
	}

	var waText = [
		'PICS',
		'',
		'Hi, I want to apply for UAE Equivalency Certificate',
		'',
		'------------------------',
		'PICS Attestation Services',
		'Email : picscochin@gmail.com',
		'Phone : +91 8369820334',
		'Website : https://picsattestation.in',
		'------------------------'
	].join('\n');

	var bar = document.createElement('div');
	bar.className = 'announce-bar';
	bar.setAttribute('role', 'region');
	bar.setAttribute('aria-label', 'Latest update');
	bar.innerHTML =
		'<div class="container announce-inner">' +
			'<span class="announce-tag"><span class="announce-dot" aria-hidden="true"></span>New</span>' +
			'<p class="announce-text">' +
				'<strong>UAE Equivalency Certificate for Indian Degrees</strong> ' +
				'<span class="announce-sub">- now processed end-to-end by our experts.</span>' +
			'</p>' +
			'<a class="announce-cta" target="_blank" rel="noopener" href="https://wa.me/918369820334?text=' +
				encodeURIComponent(waText) + '">Apply now <i class="bi bi-arrow-right" aria-hidden="true"></i></a>' +
		'</div>';
	header.parentNode.insertBefore(bar, header);

	// ---------- Popup: shown once each time someone opens the website ----------
	var waLink = 'https://wa.me/918369820334?text=' + encodeURIComponent(waText);
	var learnMore = scriptSrc ? new URL('../pages/attestation/certificate_equivalency.html', scriptSrc).href
		: '/pages/attestation/certificate_equivalency.html';
	var POP_KEY = 'picsEquivPopupSeen';

	// Remembered only for this visit (until the browser tab is closed),
	// so it shows when the site is opened but not again on every page click.
	function popSeenThisVisit() {
		try { return sessionStorage.getItem(POP_KEY) === '1'; }
		catch (e) { return false; }
	}
	function markPopSeen() {
		try { sessionStorage.setItem(POP_KEY, '1'); } catch (e) {}
	}

	var pop = document.createElement('div');
	pop.className = 'announce-pop';
	pop.setAttribute('role', 'dialog');
	pop.setAttribute('aria-modal', 'true');
	pop.setAttribute('aria-labelledby', 'announcePopTitle');
	pop.innerHTML =
		'<div class="announce-pop-card">' +
			'<span class="announce-pop-timer" aria-hidden="true"></span>' +
			'<button type="button" class="announce-pop-close" aria-label="Close">&times;</button>' +
			'<div class="announce-pop-head">' +
				'<span class="announce-tag"><span class="announce-dot" aria-hidden="true"></span>New service</span>' +
				'<h2 class="announce-pop-title" id="announcePopTitle">UAE Equivalency Certificate for Indian Degrees</h2>' +
			'</div>' +
			'<div class="announce-pop-body">' +
				'<p>Planning to work or study in the UAE? Get your Indian degree officially recognised. We handle the whole process for you.</p>' +
				'<ul class="announce-pop-list">' +
					'<li><i class="bi bi-check-circle-fill" aria-hidden="true"></i>Attestation of your degree certificates</li>' +
					'<li><i class="bi bi-check-circle-fill" aria-hidden="true"></i>Equivalency application filed for you</li>' +
					'<li><i class="bi bi-check-circle-fill" aria-hidden="true"></i>Updates at every step on WhatsApp</li>' +
				'</ul>' +
				'<div class="announce-pop-actions">' +
					'<a class="announce-pop-btn is-wa" target="_blank" rel="noopener" href="' + waLink + '"><i class="bi bi-whatsapp" aria-hidden="true"></i>Apply on WhatsApp</a>' +
					'<a class="announce-pop-btn is-call" href="tel:+918369820334"><i class="bi bi-telephone" aria-hidden="true"></i>Call +91 83698 20334</a>' +
				'</div>' +
				'<a class="announce-pop-more" href="' + learnMore + '">Learn more about equivalency &rarr;</a>' +
			'</div>' +
		'</div>';
	document.body.appendChild(pop);

	var lastFocus = null;
	var POP_AUTO_CLOSE = 10 * 1000; // first-visit popup closes itself after 10 seconds
	var autoTimer = null;
	function stopAutoClose() {
		clearTimeout(autoTimer);
		autoTimer = null;
		pop.classList.remove('is-timing');
	}
	function openPop(auto) {
		lastFocus = document.activeElement;
		pop.style.setProperty('--pop-auto', POP_AUTO_CLOSE + 'ms');
		pop.classList.add('is-open');
		if (auto === true) {
			pop.classList.add('is-timing');
			autoTimer = setTimeout(closePop, POP_AUTO_CLOSE);
		}
		document.body.classList.add('announce-pop-lock');
		markPopSeen();
		try { pop.querySelector('.announce-pop-close').focus({ preventScroll: true }); } catch (e) {}
	}
	function closePop() {
		stopAutoClose();
		pop.classList.remove('is-open');
		document.body.classList.remove('announce-pop-lock');
		if (lastFocus && lastFocus.focus) lastFocus.focus();
	}
	pop.addEventListener('click', function (e) {
		if (e.target === pop || e.target.closest('.announce-pop-close')) closePop();
	});
	pop.querySelectorAll('.announce-pop-btn, .announce-pop-more').forEach(function (a) {
		a.addEventListener('click', closePop);
	});
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && pop.classList.contains('is-open')) closePop();
	});
	// Clicking the banner text opens the popup again any time
	var barText = bar.querySelector('.announce-text');
	barText.style.cursor = 'pointer';
	barText.addEventListener('click', function () { openPop(false); });

	if (!popSeenThisVisit()) setTimeout(function () { openPop(true); }, 2500);

	// Keep the menu stuck directly under the banner while scrolling
	function syncHeight() {
		document.documentElement.style.setProperty('--announce-h', bar.offsetHeight + 'px');
	}
	syncHeight();
	window.addEventListener('resize', syncHeight);
	window.addEventListener('load', syncHeight);
})();

/**
 * WEBSITE: https://themefisher.com
 * TWITTER: https://twitter.com/themefisher
 * FACEBOOK: https://www.facebook.com/themefisher
 * GITHUB: https://github.com/themefisher/
 */

$(document).ready(function () {
	'use strict';

	// navbarDropdown
	if ($(window).width() < 992) {
		$('.navigation .dropdown-toggle').on('click', function () {
			$(this).siblings('.dropdown-menu').animate({
				height: 'toggle'
			}, 300);
		});
	}

	$(window).on('scroll', function () {
		//.Scroll to top show/hide
		if ($('#scroll-to-top').length) {
			var scrollToTop = $('#scroll-to-top'),
				scroll = $(window).scrollTop();
			if (scroll >= 200) {
				scrollToTop.fadeIn(200);
			} else {
				scrollToTop.fadeOut(100);
			}
		}
	});
	// scroll-to-top
	if ($('#scroll-to-top').length) {
		$('#scroll-to-top').on('click', function () {
			$('body,html').animate({
				scrollTop: 0
			}, 600);
			return false;
		});
	}

	// Shuffle js filter and masonry
	// var containerEl = document.querySelector('.shuffle-wrapper');
	// if (containerEl) {
	// 	var Shuffle = window.Shuffle;
	// 	var myShuffle = new Shuffle(document.querySelector('.shuffle-wrapper'), {
	// 		itemSelector: '.shuffle-item',
	// 		buffer: 1
	// 	});

	// 	jQuery('input[name="shuffle-filter"]').on('change', function (evt) {
	// 		var input = evt.currentTarget;
	// 		if (input.checked) {
	// 			myShuffle.filter(input.value);
	// 		}
	// 	});
	// }

	$('.portfolio-single-slider').slick({
		infinite: true,
		arrows: false,
		autoplay: true,
		autoplaySpeed: 2000
	});

	$('.clients-logo').slick({
		infinite: true,
		arrows: false,
		autoplay: true,
		autoplaySpeed: 2000
	});

	$('.testimonial-slider').slick({
		slidesToShow: 1,
		infinite: true,
		arrows: false,
		autoplay: true,
		autoplaySpeed: 2000
	});


	// CountDown JS
	var countDownEl = $('.count-down');
	if (countDownEl.length && $.fn.syotimer) {
		$('.count-down').syotimer({
			year: 2021,
			month: 5,
			day: 9,
			hour: 20,
			minute: 30
		});
	}

	// Magnific Popup Image
	$('.portfolio-popup').magnificPopup({
		type: 'image',
		removalDelay: 160, //delay removal by X to allow out-animation
		callbacks: {
			beforeOpen: function () {
				// just a hack that adds mfp-anim class to markup
				this.st.image.markup = this.st.image.markup.replace('mfp-figure', 'mfp-figure mfp-with-anim');
				this.st.mainClass = this.st.el.attr('data-effect');
			}
		},
		closeOnContentClick: true,
		midClick: true,
		fixedContentPos: true,
		fixedBgPos: true
	});

	//  Count Up
	function counter() {
		var oTop;
		if ($('.count').length !== 0) {
			oTop = $('.count').offset().top - window.innerHeight;
		}
		if ($(window).scrollTop() > oTop) {
			$('.count').each(function () {
				var $this = $(this),
					countTo = $this.attr('data-count');
				$({
					countNum: $this.text()
				}).animate({
					countNum: countTo
				}, {
					duration: 1000,
					easing: 'swing',
					step: function () {
						$this.text(Math.floor(this.countNum));
					},
					complete: function () {
						$this.text(this.countNum);
					}
				});
			});
		}
	}
	$(window).on('scroll', function () {
		counter();
	});

});