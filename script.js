/* =========================================================
   lillian pulaski — site scripts
   Loaded on every page. Each section exits early if its
   elements aren't on the page.
   1. Art page: masonry grid, captions, lightbox
   2. Technical page: project accordion
   3. About page: photo slide-in (GSAP)
   ========================================================= */

/* ── 1. Art page ── */
(function () {
    const thumbs = Array.from(document.querySelectorAll('.thumb'));
    if (!thumbs.length) return;

    /* masonry: lay out with CSS columns once to find each tile's column,
       then move tiles into real column divs so opening a caption only
       pushes down its own column. Re-runs when the column count changes
       or an image loads. */
    const masonry = document.querySelector('.masonry');

    function columnCount() {
        return parseInt(getComputedStyle(masonry).getPropertyValue('--cols'), 10) || 1;
    }

    function layout() {
        const n = columnCount();

        // reset to original order in plain CSS columns
        thumbs.forEach(thumb => masonry.appendChild(thumb));
        masonry.querySelectorAll('.masonry-col').forEach(c => c.remove());
        masonry.classList.remove('is-built');
        masonry.classList.add('is-measuring');   // captions hidden while measuring

        // record which column each tile lands in
        const lefts = thumbs.map(thumb => thumb.offsetLeft);
        const colLefts = [...new Set(lefts)].sort((a, b) => a - b);
        masonry.classList.remove('is-measuring');

        // build the columns
        const cols = Array.from({ length: n }, () => {
            const col = document.createElement('div');
            col.className = 'masonry-col';
            masonry.appendChild(col);
            return col;
        });
        thumbs.forEach((thumb, i) => {
            const col = Math.min(colLefts.indexOf(lefts[i]), n - 1);
            cols[col].appendChild(thumb);
        });
        masonry.classList.add('is-built');
    }

    if (masonry) {
        layout();

        let queued = false;
        const relayout = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; layout(); });
        };

        thumbs.forEach(thumb => {
            const img = thumb.querySelector('img');
            if (img && !img.complete) img.addEventListener('load', relayout);
            // don't replay the fade-in when a tile is moved
            thumb.addEventListener('animationend', () => thumb.classList.add('is-shown'), { once: true });
        });

        let lastCount = columnCount();
        window.addEventListener('resize', () => {
            const n = columnCount();
            if (n !== lastCount) { lastCount = n; relayout(); }
        });
    }

    // captions: one open at a time
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const isActive = thumb.classList.contains('active');
            thumbs.forEach(t => t.classList.remove('active'));
            if (!isActive) thumb.classList.add('active');
        });
    });

    // lightbox (shared by all tiles)
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Enlarged image');
    lightbox.innerHTML =
        '<button class="lightbox-close" type="button" aria-label="Close">' +
            '<span class="icon-plus" aria-hidden="true"></span>' +
        '</button>' +
        '<img class="lightbox-img" alt="">';
    document.body.appendChild(lightbox);

    const bigImg   = lightbox.querySelector('.lightbox-img');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    let returnFocus = null;

    // fit to 92% x 88% of the viewport, capped at 2x natural size
    function sizeImage() {
        const w = bigImg.naturalWidth, h = bigImg.naturalHeight;
        if (!w || !h) return;
        const scale = Math.min(
            (window.innerWidth  * 0.92) / w,
            (window.innerHeight * 0.88) / h,
            2
        );
        bigImg.style.width  = Math.round(w * scale) + 'px';
        bigImg.style.height = Math.round(h * scale) + 'px';
    }

    bigImg.addEventListener('load', sizeImage);
    window.addEventListener('resize', () => {
        if (lightbox.classList.contains('open')) sizeImage();
    });

    function openLightbox(thumb, trigger) {
        const img = thumb.querySelector('img');
        bigImg.style.width = bigImg.style.height = '';
        bigImg.src = img.currentSrc || img.src;
        bigImg.alt = img.alt;
        if (bigImg.complete) sizeImage();
        returnFocus = trigger;
        lightbox.classList.add('open');
        document.body.classList.add('lightbox-lock');
        closeBtn.focus();
    }

    function closeLightbox() {
        if (!lightbox.classList.contains('open')) return;
        lightbox.classList.remove('open');
        document.body.classList.remove('lightbox-lock');
        if (returnFocus) returnFocus.focus();
    }

    // "view larger" button added to each caption
    thumbs.forEach(thumb => {
        const caption = thumb.querySelector('.thumb-caption');
        if (!caption) return;

        const zoom = document.createElement('button');
        zoom.type = 'button';
        zoom.className = 'thumb-zoom';
        zoom.setAttribute('aria-label', 'View larger');
        zoom.innerHTML =
            '<span class="icon-plus" aria-hidden="true"></span>' +
            '<span class="thumb-zoom-label" aria-hidden="true">View larger</span>';
        caption.appendChild(zoom);

        zoom.addEventListener('click', e => {
            e.stopPropagation();   // keep the caption open
            openLightbox(thumb, zoom);
        });
    });

    // close on X, backdrop click, or Esc
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', e => {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }   // focus trap
    });
})();

/* ── 2. Technical page: project accordion ── */
(function () {
    const projects = Array.from(document.querySelectorAll('.proj'));
    if (!projects.length) return;

    function closeProject(proj) {
        proj.classList.remove('open');
        proj.querySelector('.proj-head').setAttribute('aria-expanded', 'false');
        proj.querySelector('.proj-body').style.maxHeight = null;
    }

    function openProject(proj) {
        const body = proj.querySelector('.proj-body');
        proj.classList.add('open');
        proj.querySelector('.proj-head').setAttribute('aria-expanded', 'true');
        body.style.maxHeight = body.scrollHeight + 'px';
    }

    projects.forEach(proj => {
        proj.querySelector('.proj-head').addEventListener('click', () => {
            const isOpen = proj.classList.contains('open');
            projects.forEach(closeProject);
            if (!isOpen) openProject(proj);
        });
    });

    // resize the open panel on window resize
    window.addEventListener('resize', () => {
        projects.forEach(proj => {
            if (proj.classList.contains('open')) {
                const body = proj.querySelector('.proj-body');
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    });
})();

/* ── 3. About page: photo slide-in ──
   Skipped if GSAP doesn't load or reduced motion is on. */
(function () {
    if (!document.querySelector('.about-photo')) return;
    if (!window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion) {
        gsap.from('.about-photo', {
            x: 160,
            autoAlpha: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.about',
                start: 'top 80%',
                once: true
            }
        });
    }

    // recalculate trigger positions once the photo loads
    window.addEventListener('load', () => ScrollTrigger.refresh());
})();
