/**
 * Purwokerto Kanopi — Interactive Consultation, Yard Photo AI Preview, Lead Collector & Video Gallery
 */
(function () {
  'use strict';

  const cfg = window.PK_CONFIG;
  const videos = window.PK_VIDEOS || [];

  const state = {
    selectedModelId: cfg.canopyModels[0].id,
    yardPhotoUrl: null,
    yardPhotoFile: null,
    yardPhotoName: '',
    yardAngle: 'Tampak Depan',
    yardLength: 5,
    yardWidth: 4,
    yardNotes: '',
    aiNotes: '',
    currentStep: 0,
    answers: {},
    selectedLocationId: cfg.locations[0].id,
    addressText: '',
    gpsCoords: '',
    videoFilter: 'Semua'
  };

  // --- Utilities ---
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const borderClass = type === 'success' ? 'border-emerald-500/50' : 'border-amber-500/50';
    toast.className = `pointer-events-auto bespoke-card px-4 py-3 text-sm font-semibold text-ink-primary border ${borderClass} flex items-center gap-2.5 step-animate max-w-sm`;
    const icon = type === 'success' ? 'fa-circle-check text-emerald-600 dark:text-emerald-400' : 'fa-circle-info text-gold';
    toast.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3400);
  }

  function getSelectedModel() {
    return cfg.canopyModels.find((m) => m.id === state.selectedModelId) || cfg.canopyModels[0];
  }

  function getSelectedLocation() {
    return cfg.locations.find((l) => l.id === state.selectedLocationId) || cfg.locations[0];
  }

  function syncAddressInputs(value, sourceEl) {
    state.addressText = value.trim();
    const locAddr = document.getElementById('location-address-input');
    const leadAddr = document.getElementById('lead-address');
    if (locAddr && sourceEl !== locAddr) locAddr.value = value;
    if (leadAddr && sourceEl !== leadAddr) leadAddr.value = value;
    renderSummary();
  }

  // --- Theme Toggle ---
  function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');

    function syncLabel() {
      const isDark = document.documentElement.classList.contains('dark');
      icon.className = isDark ? 'fa-solid fa-sun text-amber-400' : 'fa-solid fa-moon';
      label.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
    }

    syncLabel();
    btn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      try {
        localStorage.setItem('pk_theme', isDark ? 'dark' : 'light');
      } catch (_) {}
      syncLabel();
    });
  }

  // --- Mobile Menu ---
  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    btn.addEventListener('click', () => {
      const isOpen = !menu.classList.contains('hidden');
      menu.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- Yard Photo Uploader, AI Simulation & Dimensions ---
  function initYardUploader() {
    const dropzone = document.getElementById('yard-dropzone');
    const fileInput = document.getElementById('yard-file-input');
    const emptyState = document.getElementById('yard-empty-state');
    const previewState = document.getElementById('yard-preview-state');
    const previewImg = document.getElementById('yard-preview-img');
    const fileMeta = document.getElementById('yard-file-meta');
    const angleBadge = document.getElementById('yard-angle-badge');
    const removeBtn = document.getElementById('yard-remove-btn');
    const changeBtn = document.getElementById('yard-change-btn');
    const sampleBtn = document.getElementById('use-sample-photo-btn');
    const aiBtn = document.getElementById('ai-preview-btn');
    const aiBox = document.getElementById('ai-preview-result');
    const lengthInput = document.getElementById('yard-length');
    const widthInput = document.getElementById('yard-width');
    const areaOutput = document.getElementById('yard-area-output');
    const notesInput = document.getElementById('yard-notes');

    function setPreview(url, name, fileObj) {
      state.yardPhotoUrl = url;
      state.yardPhotoName = name;
      state.yardPhotoFile = fileObj || null;
      state.aiNotes = '';
      aiBox.classList.add('hidden');
      aiBox.innerHTML = '';
      previewImg.src = url;
      fileMeta.textContent = name;
      emptyState.classList.add('hidden');
      previewState.classList.remove('hidden');
      renderSummary();
    }

    function clearPreview() {
      if (state.yardPhotoUrl && state.yardPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.yardPhotoUrl);
      }
      state.yardPhotoUrl = null;
      state.yardPhotoFile = null;
      state.yardPhotoName = '';
      state.aiNotes = '';
      fileInput.value = '';
      previewImg.src = '';
      aiBox.classList.add('hidden');
      aiBox.innerHTML = '';
      emptyState.classList.remove('hidden');
      previewState.classList.add('hidden');
      renderSummary();
    }

    function handleFiles(files) {
      const file = files && files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Mohon unggah file gambar (JPG, PNG, WEBP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('Ukuran foto maksimal 10 MB.');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const sizeKb = Math.round(file.size / 1024);
      setPreview(objectUrl, `${file.name} (${sizeKb} KB)`, file);
      showToast('Foto halaman rumah berhasil dimuat.', 'success');
    }

    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#yard-remove-btn') || e.target.closest('#yard-change-btn') || e.target.closest('#ai-preview-btn')) return;
      if (!state.yardPhotoUrl) fileInput.click();
    });

    dropzone.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !state.yardPhotoUrl) {
        e.preventDefault();
        fileInput.click();
      }
    });

    changeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearPreview();
      showToast('Foto halaman dihapus.');
    });

    sampleBtn.addEventListener('click', async () => {
      try {
        const resp = await fetch('assets/img/halaman-rumah-pergola.jpg');
        const blob = await resp.blob();
        const file = new File([blob], 'contoh-halaman-rumah.jpg', { type: 'image/jpeg' });
        setPreview('assets/img/halaman-rumah-pergola.jpg', 'Contoh Halaman Rumah (Purwokerto)', file);
      } catch (_) {
        setPreview('assets/img/halaman-rumah-pergola.jpg', 'Contoh Halaman Rumah (Purwokerto)', null);
      }
      showToast('Foto contoh halaman rumah dimuat.', 'success');
    });

    aiBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!state.yardPhotoFile) {
        showToast('Silakan unggah foto halaman rumah Anda terlebih dahulu.');
        return;
      }
      const model = getSelectedModel();
      const loc = getSelectedLocation();

      aiBtn.disabled = true;
      const originalHtml = aiBtn.innerHTML;
      aiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden="true"></i> Memproses AI...';
      aiBox.classList.remove('hidden');
      aiBox.innerHTML = `
        <div class="animate-pulse space-y-2">
          <div class="h-3 bg-amber-500/25 rounded w-1/3"></div>
          <div class="h-3 bg-amber-500/15 rounded w-full"></div>
          <div class="h-3 bg-amber-500/15 rounded w-5/6"></div>
        </div>
      `;

      try {
        const fd = new FormData();
        fd.append('yard_photo', state.yardPhotoFile);
        fd.append('canopy_model', model.name);
        fd.append('roof_material', model.roofMaterial);
        fd.append('frame_material', model.frameMaterial);
        fd.append('yard_angle', state.yardAngle);
        fd.append('district', loc.name);
        fd.append('yard_length', String(state.yardLength));
        fd.append('yard_width', String(state.yardWidth));

        const res = await fetch('api/ai-visualize.php', { method: 'POST', body: fd });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Gagal menjalankan simulasi AI.');
        }

        state.aiNotes = data.analysis || '';
        const imgHtml = data.mode === 'image' && data.imageBase64
          ? `<div class="rounded-xl overflow-hidden bg-slate-900 aspect-[4/3]">
               <img src="data:${escapeHtml(data.imageMime || 'image/png')};base64,${data.imageBase64}" alt="Simulasi AI kanopi di halaman rumah" class="w-full h-full object-cover" />
             </div>`
          : '';

        aiBox.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-extrabold uppercase tracking-wider text-gold">
              <i class="fa-solid fa-wand-magic-sparkles mr-1" aria-hidden="true"></i>
              ${data.mode === 'image' ? 'Hasil Simulasi Visual AI' : 'Analisa Arsitektur Foto AI'}
            </span>
            <span class="text-[11px] font-bold text-ink-muted">${escapeHtml(model.name)}</span>
          </div>
          ${imgHtml}
          <div class="text-xs sm:text-sm text-ink-primary whitespace-pre-line leading-relaxed">${escapeHtml(data.analysis || '')}</div>
        `;
        showToast('Analisa AI untuk foto halaman rumah selesai.', 'success');
      } catch (err) {
        aiBox.innerHTML = `<p class="text-xs font-semibold text-ink-secondary">${escapeHtml(err.message)}</p>`;
        showToast(err.message);
      } finally {
        aiBtn.disabled = false;
        aiBtn.innerHTML = originalHtml;
      }
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    ['dragenter', 'dragover'].forEach((ev) => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((ev) => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

    // Angle selector
    document.querySelectorAll('#angle-selector button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#angle-selector button').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        state.yardAngle = btn.dataset.angle;
        angleBadge.textContent = state.yardAngle;
        renderSummary();
      });
    });

    // Dimensions
    function updateArea() {
      const l = parseFloat(lengthInput.value) || 0;
      const w = parseFloat(widthInput.value) || 0;
      state.yardLength = l;
      state.yardWidth = w;
      const area = (l * w).toFixed((l * w) % 1 === 0 ? 0 : 1);
      areaOutput.textContent = `${area} m²`;
      renderSummary();
    }

    lengthInput.addEventListener('input', updateArea);
    widthInput.addEventListener('input', updateArea);
    notesInput.addEventListener('input', () => {
      state.yardNotes = notesInput.value.trim();
      renderSummary();
    });
  }

  // --- Canopy Model Picker ---
  function renderCanopyModels() {
    const grid = document.getElementById('canopy-models-grid');
    const detail = document.getElementById('selected-model-detail');
    const pill = document.getElementById('selected-model-pill');
    const overlayBadge = document.getElementById('yard-overlay-badge');
    const activeModel = getSelectedModel();

    pill.textContent = `Terpilih: ${activeModel.name}`;
    if (overlayBadge) overlayBadge.textContent = `Model: ${activeModel.name}`;

    grid.innerHTML = cfg.canopyModels.map((model) => {
      const isSelected = model.id === state.selectedModelId;
      return `
        <button type="button" data-model-id="${escapeHtml(model.id)}"
          class="choice-card ${isSelected ? 'is-selected' : ''} text-left p-3.5 flex items-center gap-3.5 w-full"
          aria-pressed="${isSelected}">
          <div class="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-900">
            <img src="${escapeHtml(model.image)}" alt="${escapeHtml(model.name)}" class="w-full h-full object-cover" />
            <div class="absolute inset-0 media-vignette pointer-events-none"></div>
            <span class="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-amber-300 truncate">${escapeHtml(model.accentTag)}</span>
          </div>
          <div class="min-w-0 flex-1">
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-gold block">${escapeHtml(model.badge)}</span>
            <span class="text-sm font-bold text-ink-primary block leading-snug mt-0.5">${escapeHtml(model.name)}</span>
            <span class="text-xs text-ink-muted block truncate mt-1">${escapeHtml(model.roofMaterial)}</span>
          </div>
          <span class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 text-slate-950' : 'border border-amber-600/30 text-transparent'}">
            <i class="fa-solid fa-check text-xs" aria-hidden="true"></i>
          </span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('button[data-model-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedModelId = btn.dataset.modelId;
        renderCanopyModels();
        renderSummary();
      });
    });

    detail.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div class="space-y-2">
          <span class="text-[11px] font-extrabold uppercase tracking-widest text-gold">Spesifikasi Model Terpilih</span>
          <h4 class="text-lg font-extrabold text-ink-primary">${escapeHtml(activeModel.name)}</h4>
          <p class="text-sm text-ink-secondary">${escapeHtml(activeModel.highlight)}</p>
        </div>
        <span class="px-3 py-1.5 rounded-xl bg-amber-500/15 text-gold text-xs font-bold shrink-0">${escapeHtml(activeModel.badge)}</span>
      </div>
      <div class="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-emerald-900/10 dark:border-amber-400/15 text-xs">
        <div>
          <span class="font-bold text-ink-muted uppercase block">Material Atap</span>
          <span class="font-semibold text-ink-primary mt-0.5 block">${escapeHtml(activeModel.roofMaterial)}</span>
        </div>
        <div>
          <span class="font-bold text-ink-muted uppercase block">Struktur Rangka</span>
          <span class="font-semibold text-ink-primary mt-0.5 block">${escapeHtml(activeModel.frameMaterial)}</span>
        </div>
      </div>
      <p class="mt-3 text-xs font-medium text-ink-muted flex items-start gap-2">
        <i class="fa-solid fa-cloud-sun-rain text-gold mt-0.5" aria-hidden="true"></i>
        <span>${escapeHtml(activeModel.weatherNote)}</span>
      </p>
    `;
  }

  // --- Interactive Questionnaire Wizard ---
  function renderWizard() {
    const questions = cfg.interactiveQuestions;
    const total = questions.length;
    const current = questions[state.currentStep];
    const dots = document.getElementById('wizard-step-dots');
    const progressText = document.getElementById('wizard-progress-text');
    const progressBar = document.getElementById('wizard-progress-bar');
    const container = document.getElementById('wizard-question-container');
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');

    dots.innerHTML = questions.map((q, idx) => {
      const answered = Boolean(state.answers[q.id]);
      const active = idx === state.currentStep;
      const cls = active
        ? 'bg-amber-500 text-slate-950 font-extrabold'
        : answered
          ? 'bg-emerald-700 text-white font-bold'
          : 'bg-emerald-950/10 dark:bg-white/10 text-ink-muted font-bold';
      return `<button type="button" data-step="${idx}" aria-label="Pertanyaan ${idx + 1}" class="w-8 h-8 rounded-lg text-xs transition ${cls}">${idx + 1}</button>`;
    }).join('');

    dots.querySelectorAll('button[data-step]').forEach((b) => {
      b.addEventListener('click', () => {
        state.currentStep = Number(b.dataset.step);
        renderWizard();
      });
    });

    progressText.textContent = `Pertanyaan ${state.currentStep + 1} dari ${total}`;
    progressBar.style.width = `${((state.currentStep + 1) / total) * 100}%`;

    const selectedVal = state.answers[current.id] || '';
    container.innerHTML = `
      <div class="space-y-4">
        <div>
          <span class="text-xs font-extrabold uppercase tracking-wider text-gold">${escapeHtml(current.stepLabel)}</span>
          <h3 class="text-xl sm:text-2xl font-extrabold text-ink-primary mt-1">${escapeHtml(current.question)}</h3>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          ${current.options.map((opt) => {
            const isSel = selectedVal === opt.value;
            return `
              <button type="button" data-answer="${escapeHtml(opt.value)}"
                class="choice-card ${isSel ? 'is-selected' : ''} p-4 text-left flex flex-col justify-between gap-1.5"
                aria-pressed="${isSel}">
                <span class="text-sm font-bold text-ink-primary flex items-center justify-between gap-2">
                  <span>${escapeHtml(opt.value)}</span>
                  <i class="fa-solid fa-circle-check ${isSel ? 'text-gold' : 'opacity-20'}" aria-hidden="true"></i>
                </span>
                <span class="text-xs text-ink-muted leading-relaxed">${escapeHtml(opt.desc)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('button[data-answer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.answers[current.id] = btn.dataset.answer;
        renderSummary();
        if (state.currentStep < total - 1) {
          state.currentStep += 1;
        }
        renderWizard();
      });
    });

    prevBtn.disabled = state.currentStep === 0;
    nextBtn.innerHTML = state.currentStep === total - 1
      ? '<span>Isi Nomor HP &amp; Alamat</span> <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>'
      : '<span>Lanjut</span> <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>';
  }

  function initWizardControls() {
    document.getElementById('wizard-prev-btn').addEventListener('click', () => {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
        renderWizard();
      }
    });

    document.getElementById('wizard-next-btn').addEventListener('click', () => {
      if (state.currentStep < cfg.interactiveQuestions.length - 1) {
        state.currentStep += 1;
        renderWizard();
      } else {
        const nameEl = document.getElementById('lead-name');
        if (nameEl) {
          nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          nameEl.focus();
        }
      }
    });

    document.getElementById('reset-wizard-btn').addEventListener('click', () => {
      state.answers = {};
      state.currentStep = 0;
      renderWizard();
      renderSummary();
      showToast('Pilihan pertanyaan direset.');
    });
  }

  // --- FAQ Accordion ---
  function renderFaqs() {
    const container = document.getElementById('faq-container');
    container.innerHTML = cfg.faqs.map((item, idx) => `
      <div class="bespoke-card p-5">
        <button type="button" class="faq-trigger w-full text-left flex items-center justify-between gap-4 font-bold text-ink-primary text-sm sm:text-base min-h-[44px]" aria-expanded="false" data-faq="${idx}">
          <span>${escapeHtml(item.q)}</span>
          <i class="fa-solid fa-chevron-down text-gold transition-transform duration-200 shrink-0" aria-hidden="true"></i>
        </button>
        <div class="faq-panel hidden pt-3 mt-3 border-t border-emerald-900/10 dark:border-amber-400/15 text-sm text-ink-secondary leading-relaxed">
          ${escapeHtml(item.a)}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.faq-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        const icon = btn.querySelector('i');
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        panel.classList.toggle('hidden');
        icon.style.transform = expanded ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    });
  }

  // --- Locations & Yard References ---
  function renderLocations() {
    const grid = document.getElementById('location-cards-grid');
    grid.innerHTML = cfg.locations.map((loc) => {
      const isSelected = loc.id === state.selectedLocationId;
      return `
        <button type="button" data-loc-id="${escapeHtml(loc.id)}"
          class="choice-card ${isSelected ? 'is-selected' : ''} p-4 text-left space-y-2 w-full"
          aria-pressed="${isSelected}">
          <div class="flex items-center justify-between gap-2">
            <span class="text-base font-extrabold text-ink-primary">${escapeHtml(loc.name)}</span>
            <i class="fa-solid fa-location-dot ${isSelected ? 'text-gold' : 'text-ink-muted'}" aria-hidden="true"></i>
          </div>
          <p class="text-xs font-semibold text-gold">${escapeHtml(loc.areas)}</p>
          <p class="text-xs text-ink-secondary leading-relaxed">${escapeHtml(loc.windNote)}</p>
          <p class="text-[11px] font-medium text-ink-muted pt-1">${escapeHtml(loc.surveyWindow)}</p>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('button[data-loc-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedLocationId = btn.dataset.locId;
        renderLocations();
        renderSummary();
      });
    });
  }

  function initLocationInputs() {
    const locAddr = document.getElementById('location-address-input');
    const leadAddr = document.getElementById('lead-address');
    const gpsBtn = document.getElementById('detect-gps-btn');
    const gpsStatus = document.getElementById('gps-status-text');

    locAddr.addEventListener('input', () => syncAddressInputs(locAddr.value, locAddr));
    if (leadAddr) {
      leadAddr.addEventListener('input', () => syncAddressInputs(leadAddr.value, leadAddr));
    }

    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Perangkat/browser Anda tidak mendukung GPS.');
        return;
      }
      gpsStatus.classList.remove('hidden');
      gpsStatus.textContent = 'Mengambil titik koordinat lokasi...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(5);
          const lng = pos.coords.longitude.toFixed(5);
          state.gpsCoords = `${lat}, ${lng}`;
          gpsStatus.textContent = `Koordinat tersimpan: ${state.gpsCoords}`;
          if (!state.addressText) {
            syncAddressInputs(`https://maps.google.com/?q=${lat},${lng}`, null);
          } else {
            renderSummary();
          }
          showToast('Titik koordinat lokasi berhasil disimpan.', 'success');
        },
        () => {
          gpsStatus.textContent = 'Izin lokasi ditolak. Anda tetap dapat mengetik alamat secara manual.';
          showToast('Izin lokasi tidak aktif.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  function renderYardReferences() {
    const grid = document.getElementById('yard-references-grid');
    grid.innerHTML = cfg.yardReferences.map((ref) => `
      <article class="bespoke-card overflow-hidden flex flex-col">
        <div class="relative aspect-square overflow-hidden bg-slate-900">
          <img src="${escapeHtml(ref.image)}" alt="${escapeHtml(ref.title)}" class="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105" />
          <div class="absolute inset-0 media-vignette pointer-events-none"></div>
          <div class="absolute bottom-3 left-3 right-3 text-white">
            <span class="inline-block px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider mb-1">${escapeHtml(ref.model)}</span>
            <h4 class="text-base font-bold leading-snug">${escapeHtml(ref.title)}</h4>
          </div>
        </div>
        <div class="p-4 space-y-1.5 flex-1">
          <p class="text-xs font-bold text-gold">${escapeHtml(ref.area)}</p>
          <p class="text-sm text-ink-secondary">${escapeHtml(ref.note)}</p>
        </div>
      </article>
    `).join('');
  }

  // --- Summary & Lead Submission ---
  function renderSummary() {
    const list = document.getElementById('live-summary-list');
    const model = getSelectedModel();
    const loc = getSelectedLocation();
    const area = (state.yardLength * state.yardWidth).toFixed((state.yardLength * state.yardWidth) % 1 === 0 ? 0 : 1);

    const rows = [
      { label: 'Model Kanopi', value: model.name },
      { label: 'Foto Halaman', value: state.yardPhotoName ? `${state.yardAngle} (${state.yardPhotoName})` : 'Belum diunggah' },
      { label: 'Perkiraan Ukuran', value: `${state.yardLength} m × ${state.yardWidth} m (${area} m²)` },
      { label: 'Kecamatan', value: loc.name }
    ];

    cfg.interactiveQuestions.forEach((q) => {
      if (state.answers[q.id]) {
        rows.push({ label: q.stepLabel, value: state.answers[q.id] });
      }
    });

    list.innerHTML = rows.map((r) => `
      <div class="flex items-start justify-between gap-4 py-1.5 border-b border-emerald-900/5 dark:border-white/5">
        <dt class="text-ink-muted font-semibold shrink-0">${escapeHtml(r.label)}</dt>
        <dd class="text-ink-primary font-bold text-right break-words">${escapeHtml(r.value)}</dd>
      </div>
    `).join('');
  }

  function initLeadSubmission() {
    const form = document.getElementById('lead-submit-form');
    const submitBtn = document.getElementById('submit-lead-btn');
    const successBox = document.getElementById('lead-success-box');
    const ticketBadge = document.getElementById('lead-ticket-badge');
    const successMsg = document.getElementById('lead-success-msg');
    const sendAnotherBtn = document.getElementById('send-another-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('lead-name').value.trim();
      const phoneVal = document.getElementById('lead-phone').value.trim();
      const addrVal = document.getElementById('lead-address').value.trim();
      const honeypotVal = document.getElementById('website_url').value;

      if (nameVal.length < 2) {
        showToast('Mohon isi nama lengkap Anda.');
        return;
      }
      if (phoneVal.replace(/\D/g, '').length < 9) {
        showToast('Mohon isi nomor HP yang valid (minimal 9 digit).');
        return;
      }
      if (addrVal.length < 5) {
        showToast('Mohon isi alamat rumah Anda.');
        return;
      }

      const model = getSelectedModel();
      const loc = getSelectedLocation();

      const fd = new FormData();
      fd.append('customer_name', nameVal);
      fd.append('phone', phoneVal);
      fd.append('address', addrVal);
      fd.append('district', loc.name);
      fd.append('gps_coords', state.gpsCoords);
      fd.append('canopy_model', model.name);
      fd.append('yard_angle', state.yardAngle);
      fd.append('yard_length', String(state.yardLength));
      fd.append('yard_width', String(state.yardWidth));
      fd.append('yard_notes', state.yardNotes);
      fd.append('ai_notes', state.aiNotes);
      fd.append('answers_json', JSON.stringify(state.answers));
      fd.append('website_url', honeypotVal);
      if (state.yardPhotoFile) {
        fd.append('yard_photo', state.yardPhotoFile);
      }

      submitBtn.disabled = true;
      const origHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Mengirim Data...</span>';

      try {
        const res = await fetch('api/submit-lead.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Gagal menyimpan data. Coba beberapa saat lagi.');
        }

        ticketBadge.textContent = data.ticketCode || 'PK-TERSIMPAN';
        successMsg.textContent = data.message || 'Data Anda sudah diterima. Admin kami akan segera menghubungi Anda.';
        form.classList.add('hidden');
        successBox.classList.remove('hidden');
        showToast('Data berhasil disimpan untuk dihubungi admin!', 'success');
      } catch (err) {
        showToast(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    });

    sendAnotherBtn.addEventListener('click', () => {
      form.reset();
      syncAddressInputs('', null);
      successBox.classList.add('hidden');
      form.classList.remove('hidden');
    });
  }

  // --- Video Showcase Gallery ---
  function renderVideos() {
    const grid = document.getElementById('video-grid');
    const filtered = state.videoFilter === 'Semua'
      ? videos
      : videos.filter((v) => v.category === state.videoFilter);

    grid.innerHTML = filtered.map((vid) => {
      const hasSrc = Boolean(vid.src && vid.src.trim());
      return `
        <article class="bespoke-card overflow-hidden flex flex-col group">
          <div class="relative aspect-square overflow-hidden bg-slate-900">
            <img src="${escapeHtml(vid.poster)}" alt="${escapeHtml(vid.title)}" class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 media-vignette pointer-events-none"></div>

            <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <span class="px-2.5 py-1 rounded-lg bg-slate-950/75 text-white text-[11px] font-bold backdrop-blur-sm">${escapeHtml(vid.category)}</span>
              <span class="px-2.5 py-1 rounded-lg ${hasSrc ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'} text-[11px] font-extrabold">
                ${hasSrc ? escapeHtml(vid.duration) : 'Segera Hadir'}
              </span>
            </div>

            <button type="button" data-video-id="${escapeHtml(vid.id)}" aria-label="Putar atau lihat detail ${escapeHtml(vid.title)}"
              class="absolute inset-0 flex items-center justify-center focus:outline-none">
              <span class="w-14 h-14 rounded-full bg-white/20 border border-white/50 backdrop-blur-md text-white flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-400 transition-all">
                <i class="fa-solid fa-play ml-0.5" aria-hidden="true"></i>
              </span>
            </button>

            <div class="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
              <span class="text-[11px] font-semibold text-amber-300 block">${escapeHtml(vid.location)}</span>
              <h3 class="text-sm sm:text-base font-bold leading-snug line-clamp-2">${escapeHtml(vid.title)}</h3>
            </div>
          </div>
          <div class="p-4 text-xs sm:text-sm text-ink-secondary flex-1">
            ${escapeHtml(vid.description)}
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('button[data-video-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vid = videos.find((v) => v.id === btn.dataset.videoId);
        if (!vid) return;
        if (vid.src && vid.src.trim()) {
          openModal(
            vid.title,
            `${vid.category} • ${vid.location}`,
            `
              <div class="rounded-xl overflow-hidden bg-black aspect-video">
                <video src="${escapeHtml(vid.src)}" poster="${escapeHtml(vid.poster)}" controls autoplay playsinline class="w-full h-full object-contain"></video>
              </div>
              <p class="text-sm text-ink-secondary">${escapeHtml(vid.description)}</p>
            `
          );
        } else {
          openModal(
            vid.title,
            `${vid.category} • Slot Video Siap Generate`,
            `
              <div class="relative rounded-xl overflow-hidden aspect-video bg-slate-900">
                <img src="${escapeHtml(vid.poster)}" alt="${escapeHtml(vid.title)}" class="w-full h-full object-cover opacity-75" />
                <div class="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-center p-6 text-white space-y-2">
                  <span class="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-lg">
                    <i class="fa-solid fa-film" aria-hidden="true"></i>
                  </span>
                  <p class="text-base font-bold">Video Sedang Disiapkan</p>
                  <p class="text-xs text-white/85 max-w-md">Slot ini siap menampung file video hasil generate Anda. Simpan file ke <code class="font-mono text-amber-300">assets/videos/</code> lalu isi <code class="font-mono text-amber-300">src</code> di <code class="font-mono text-amber-300">data/videos.js</code>.</p>
                </div>
              </div>
              <p class="text-sm text-ink-secondary">${escapeHtml(vid.description)}</p>
            `
          );
        }
      });
    });
  }

  function initVideoFilters() {
    document.querySelectorAll('#video-filter-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#video-filter-tabs button').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        state.videoFilter = btn.dataset.filter;
        renderVideos();
      });
    });
  }

  // --- Modal Helpers ---
  function openModal(title, badge, bodyHtml) {
    const modal = document.getElementById('pk-modal');
    document.getElementById('pk-modal-title').textContent = title;
    document.getElementById('pk-modal-badge').textContent = badge;
    document.getElementById('pk-modal-body').innerHTML = bodyHtml;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeModal() {
    const modal = document.getElementById('pk-modal');
    const body = document.getElementById('pk-modal-body');
    const videoEl = body.querySelector('video');
    if (videoEl) videoEl.pause();
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    body.innerHTML = '';
  }

  function initModal() {
    const modal = document.getElementById('pk-modal');
    document.getElementById('pk-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    initYardUploader();
    renderCanopyModels();
    renderWizard();
    initWizardControls();
    renderFaqs();
    renderLocations();
    initLocationInputs();
    renderYardReferences();
    renderSummary();
    initLeadSubmission();
    renderVideos();
    initVideoFilters();
    initModal();
  });
})();
