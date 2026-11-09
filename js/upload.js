/* PICS — Upload Documents form: interface + validation.
   Files go to a Google Apps Script web app, which saves them to Drive and adds a Sheet row.
   To connect: paste the web-app link (ends in /exec) into UPLOAD_ENDPOINT below. */
(function () {
	'use strict';

	var UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBMzpLCxwVzfVSfT7CXa8QZ4P2sT3449fQsNwAMNdi0lvZj9ZpXDER_OJbqoHXluuq/exec';              // <-- PASTE the Apps Script web-app URL between the quotes (https://script.google.com/macros/s/.../exec)
	var MAX_FILES = 3;
	var MAX_FILE_BYTES = 5 * 1024 * 1024;  // 5 MB each
	var MAX_TOTAL_BYTES = 15 * 1024 * 1024;

	var form = document.getElementById('uploadForm');
	if (!form) return;

	var $ = function (id) { return document.getElementById(id); };
	var nameEl = $('upName'), emailEl = $('upEmail'), phoneEl = $('upPhone'),
		consentEl = $('upConsent'), trapEl = $('upWebsite'),
		drop = $('upDrop'), picker = $('upFiles'), list = $('upList'),
		submitBtn = $('upSubmit'), statusEl = $('upStatus');

	var files = [];       // accepted File objects
	var busy = false;

	/* ---------- helpers ---------- */
	function setError(input, errId, msg) {
		var p = $(errId);
		p.textContent = msg || '';
		if (input) {
			if (msg) input.setAttribute('aria-invalid', 'true');
			else input.removeAttribute('aria-invalid');
			input.classList.toggle('has-error', !!msg);
		}
		return !msg;
	}
	function fmtSize(b) {
		if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1).replace('.0', '') + ' MB';
		return Math.max(1, Math.round(b / 1024)) + ' KB';
	}
	function ext(name) {
		var m = /\.([a-z0-9]+)$/i.exec(name || '');
		return m ? m[1].toLowerCase() : '';
	}
	function escapeHtml(s) {
		return String(s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	/* ---------- field validators ---------- */
	function checkName() {
		var v = nameEl.value.replace(/\s+/g, ' ').trim();
		var msg = '';
		if (!v) msg = 'Please enter your full name.';
		else if (v.length < 2) msg = 'Name is too short.';
		else if (v.length > 80) msg = 'Name must be 80 characters or fewer.';
		else if (!/^[\p{L}][\p{L}\p{M} .'\-]*$/u.test(v)) msg = 'Use letters only (spaces, . \' - allowed).';
		return setError(nameEl, 'upNameErr', msg);
	}
	function checkEmail() {
		var v = emailEl.value.trim();
		var msg = '';
		if (!v) msg = 'Please enter your email address.';
		else if (v.length > 120) msg = 'Email is too long.';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Enter a valid email, like name@example.com.';
		return setError(emailEl, 'upEmailErr', msg);
	}
	function checkPhone() {
		var v = phoneEl.value.trim();
		var msg = '';
		if (!v) msg = 'Please enter your phone number.';
		else if (!/^[0-9]{10}$/.test(v)) msg = 'Phone number must be exactly 10 digits.';
		return setError(phoneEl, 'upPhoneErr', msg);
	}
	function checkConsent() {
		return setError(consentEl, 'upConsentErr', consentEl.checked ? '' : 'Please tick the box to continue.');
	}
	function checkFilesPresent() {
		var msg = '';
		if (!files.length) msg = 'Please add at least one PDF or ZIP file.';
		return setError(null, 'upFilesErr', msg);
	}

	/* Phone: digits only, as the visitor types or pastes */
	phoneEl.addEventListener('input', function () {
		var clean = phoneEl.value.replace(/\D/g, '').slice(0, 10);
		if (clean !== phoneEl.value) phoneEl.value = clean;
		if ($('upPhoneErr').textContent) checkPhone();
	});
	nameEl.addEventListener('blur', checkName);
	emailEl.addEventListener('blur', checkEmail);
	phoneEl.addEventListener('blur', checkPhone);
	consentEl.addEventListener('change', checkConsent);
	nameEl.addEventListener('input', function () { if ($('upNameErr').textContent) checkName(); });
	emailEl.addEventListener('input', function () { if ($('upEmailErr').textContent) checkEmail(); });

	/* ---------- file handling ---------- */
	// Confirms the file really is a PDF / ZIP, not just renamed
	function looksRight(file) {
		return file.slice(0, 5).arrayBuffer().then(function (buf) {
			var b = new Uint8Array(buf);
			var e = ext(file.name);
			if (e === 'pdf') return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;       // %PDF
			if (e === 'zip') return b[0] === 0x50 && b[1] === 0x4B && (b[2] === 3 || b[2] === 5);            // PK..
			return false;
		}).catch(function () { return false; });
	}

	function addFiles(fileList) {
		var incoming = Array.prototype.slice.call(fileList || []);
		if (!incoming.length) return;
		var problems = [];
		var chain = Promise.resolve();

		incoming.forEach(function (f) {
			chain = chain.then(function () {
				var e = ext(f.name);
				if (files.length >= MAX_FILES) { problems.push('Only ' + MAX_FILES + ' files are allowed. Put more into one ZIP.'); return; }
				if (e !== 'pdf' && e !== 'zip') { problems.push('"' + f.name + '" is not a PDF or ZIP file.'); return; }
				if (f.size === 0) { problems.push('"' + f.name + '" is empty.'); return; }
				if (f.size > MAX_FILE_BYTES) { problems.push('"' + f.name + '" is ' + fmtSize(f.size) + ' — the limit is 5 MB per file.'); return; }
				if (files.some(function (x) { return x.name === f.name && x.size === f.size; })) { problems.push('"' + f.name + '" is already added.'); return; }
				var total = files.reduce(function (s, x) { return s + x.size; }, 0) + f.size;
				if (total > MAX_TOTAL_BYTES) { problems.push('Total size is over 15 MB.'); return; }
				return looksRight(f).then(function (ok) {
					if (!ok) { problems.push('"' + f.name + '" does not look like a real ' + e.toUpperCase() + ' file.'); return; }
					files.push(f);
				});
			});
		});

		chain.then(function () {
			render();
			setError(null, 'upFilesErr', problems.length ? Array.from(new Set(problems)).join(' ') : '');
		});
	}

	function render() {
		list.innerHTML = '';
		files.forEach(function (f, i) {
			var li = document.createElement('li');
			li.className = 'upload-item';
			li.innerHTML =
				'<i class="bi ' + (ext(f.name) === 'zip' ? 'bi-file-earmark-zip' : 'bi-file-earmark-pdf') + '" aria-hidden="true"></i>' +
				'<span class="upload-item-name">' + escapeHtml(f.name) + '</span>' +
				'<span class="upload-item-size">' + fmtSize(f.size) + '</span>' +
				'<button type="button" class="upload-item-remove" data-i="' + i + '" aria-label="Remove ' + escapeHtml(f.name) + '"><i class="bi bi-x-lg" aria-hidden="true"></i></button>';
			list.appendChild(li);
		});
		drop.classList.toggle('is-full', files.length >= MAX_FILES);
	}

	list.addEventListener('click', function (e) {
		var btn = e.target.closest('.upload-item-remove');
		if (!btn) return;
		files.splice(Number(btn.getAttribute('data-i')), 1);
		render();
		setError(null, 'upFilesErr', '');
	});

	drop.addEventListener('click', function () { if (!busy) picker.click(); });
	drop.addEventListener('keydown', function (e) {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!busy) picker.click(); }
	});
	picker.addEventListener('change', function () { addFiles(picker.files); picker.value = ''; });
	['dragenter', 'dragover'].forEach(function (ev) {
		drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
	});
	['dragleave', 'drop'].forEach(function (ev) {
		drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
	});
	drop.addEventListener('drop', function (e) { if (!busy) addFiles(e.dataTransfer && e.dataTransfer.files); });
	// Stop the browser opening a file that is dropped outside the box
	['dragover', 'drop'].forEach(function (ev) { window.addEventListener(ev, function (e) { e.preventDefault(); }); });

	/* ---------- submit ---------- */
	function setStatus(msg, kind) {
		statusEl.textContent = msg || '';
		statusEl.className = 'upload-status' + (kind ? ' is-' + kind : '');
	}
	function setBusy(on) {
		busy = on;
		submitBtn.disabled = on;
		submitBtn.classList.toggle('is-busy', on);
		submitBtn.querySelector('.upload-submit-label').textContent = on ? 'Sending…' : 'Submit documents';
	}

	// Reads a File as plain base64 text (no "data:" prefix)
	function toBase64(file) {
		return new Promise(function (resolve, reject) {
			var r = new FileReader();
			r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
			r.onerror = function () { reject(new Error('read')); };
			r.readAsDataURL(file);
		});
	}

	// Sends the details + files to the Google Apps Script web app.
	// Resolves with { ok: true, ref } or rejects with an Error (err.userMessage = text safe to show).
	function sendToServer(payload) {
		if (!UPLOAD_ENDPOINT) {  // not connected yet: preview only
			return new Promise(function (resolve) {
				setTimeout(function () { resolve({ ok: true, demo: true }); }, 900);
			});
		}
		return Promise.all(payload.files.map(function (f) {
			return toBase64(f).then(function (b64) { return { name: f.name, data: b64 }; });
		})).then(function (encoded) {
			var ctrl = window.AbortController ? new AbortController() : null;
			var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 120000) : null;
			return fetch(UPLOAD_ENDPOINT, {
				method: 'POST',
				// text/plain keeps this a "simple" request, so the browser needs no CORS pre-check
				headers: { 'Content-Type': 'text/plain;charset=utf-8' },
				body: JSON.stringify({
					name: payload.name, email: payload.email, phone: payload.phone,
					website: '', files: encoded
				}),
				signal: ctrl ? ctrl.signal : undefined
			}).then(function (resp) {
				if (timer) clearTimeout(timer);
				return resp.json();
			}, function (err) {
				if (timer) clearTimeout(timer);
				throw err;
			});
		}).then(function (res) {
			if (res && res.ok) return res;
			var e = new Error('server');
			e.userMessage = res && res.error ? String(res.error) : '';
			throw e;
		});
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		if (busy) return;
		setStatus('');

		var checks = [
			[nameEl, checkName()],
			[emailEl, checkEmail()],
			[phoneEl, checkPhone()],
			[drop, checkFilesPresent()],
			[consentEl, checkConsent()]
		];
		var bad = checks.filter(function (c) { return !c[1]; })[0];
		if (bad) {
			setStatus('Please fix the highlighted fields.', 'error');
			bad[0].focus();
			return;
		}

		if (trapEl.value) { // a bot filled the hidden field: pretend it worked, send nothing
			setStatus('Thank you. Your documents were received.', 'ok');
			form.reset(); files = []; render();
			return;
		}

		setBusy(true);
		setStatus('Uploading your documents. Please keep this page open…', 'info');
		sendToServer({
			name: nameEl.value.replace(/\s+/g, ' ').trim(),
			email: emailEl.value.trim(),
			phone: phoneEl.value.trim(),
			files: files
		}).then(function (res) {
			if (res && res.demo) {
				setStatus('Form checked: everything is valid. (Preview only — sending to the server is not connected yet.)', 'info');
			} else {
				setStatus('Thank you! Your documents were received.' + (res && res.ref ? ' Your reference: ' + res.ref : ''), 'ok');
				form.reset(); files = []; render();
			}
		}).catch(function (err) {
			var msg = err && err.userMessage ? err.userMessage : 'Sorry, we could not send your documents. Please try again.';
			setStatus(msg + ' If it keeps happening, WhatsApp us on +91 83698 20334.', 'error');
		}).then(function () { setBusy(false); });
	});
})();
