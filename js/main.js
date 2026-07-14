document.addEventListener('DOMContentLoaded', () => {
    
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        fetch('navbar.html')
            .then(res => res.text())
            .then(html => {
                navbarPlaceholder.innerHTML = html;
                initNavbarScroll();
                setActiveNavLink();
            })
            .catch(err => console.error('Error loading navbar:', err));
    } else {
        initNavbarScroll();
    }

    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch('footer.html')
            .then(res => res.text())
            .then(html => {
                footerPlaceholder.innerHTML = html;
            })
            .catch(err => console.error('Error loading footer:', err));
    }

    function setActiveNavLink() {
        const path = window.location.pathname;
        document.querySelectorAll('.nav-center a, .nav-mobile-menu a').forEach(link => {
            const href = link.getAttribute('href');
            const isActive = href === '/'
                ? (path === '/' || path === '/index.html')
                : path.startsWith(href);
            if (isActive) {
                link.classList.add('nav-active');
            }
        });
    }

    function initNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 10) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
        }

        const hamburger = document.querySelector('.nav-hamburger');
        const mobileMenu = document.querySelector('.nav-mobile-menu');
        if (hamburger && mobileMenu) {
            const mobileLabels = [
                'Extreme Weather Event Forecasting',
                'AI for Energy Market',
                'Accessibility to Arctic'
            ];
            const cards = document.querySelectorAll('.hero-research-content p');
            const originalLabels = Array.from(cards).map(el => el.textContent);
            const heroIntro = document.querySelector('.hero-content p');

            function syncText() {
                const isMobile = window.innerWidth <= 768;
                cards.forEach((el, i) => {
                    el.textContent = isMobile ? mobileLabels[i] : originalLabels[i];
                });
                if (heroIntro) heroIntro.style.display = isMobile ? 'none' : '';
                if (!isMobile) mobileMenu.classList.remove('open');
            }

            hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
            window.addEventListener('resize', syncText);
            syncText();
        }
    }

    const carousel = document.querySelector('.carousel');
    if (carousel) {
        carousel.addEventListener('wheel', (evt) => {
            if (Math.abs(evt.deltaY) > Math.abs(evt.deltaX)) {
                const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
                if ((evt.deltaY > 0 && carousel.scrollLeft < maxScrollLeft - 1) || 
                    (evt.deltaY < 0 && carousel.scrollLeft > 0)) {
                    evt.preventDefault();
                    carousel.scrollLeft += evt.deltaY;
                }
            }
        }, { passive: false });
    }

    const SHEETS = {
        news: 'https://docs.google.com/spreadsheets/d/12GVUUhUJlwA-tBf-BCF5Z3E5arNk3GDi2NEbbZPhl-Y/gviz/tq?tqx=out:csv',
        publications: 'https://docs.google.com/spreadsheets/d/1ZAakjwIZFbH49mTcjOnjTUxF3zfSPqobH99VUCksO1s/gviz/tq?tqx=out:csv',
        people: 'https://docs.google.com/spreadsheets/d/18qyd5031XPflj8yAxMd0R3CJAkj8tQMtb8-9AS-1tzs/gviz/tq?tqx=out:csv'
    };

    function parseCSV(text) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else { inQuotes = false; }
                } else {
                    field += char;
                }
            } else if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field); field = '';
            } else if (char === '\n') {
                row.push(field); rows.push(row); row = []; field = '';
            } else if (char !== '\r') {
                field += char;
            }
        }
        if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
        return rows;
    }

    function fetchSheet(url) {
        return fetch(url)
            .then(res => res.text())
            .then(text => {
                const rows = parseCSV(text);
                if (rows.length < 2) return [];
                const headers = rows[0].map(h => h.trim());
                return rows.slice(1)
                    .filter(cells => cells.some(cell => cell.trim() !== ''))
                    .map(cells => {
                        const obj = {};
                        headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
                        return obj;
                    });
            });
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function safeUrl(url) {
        const trimmed = (url || '').trim();
        return /^https?:\/\//i.test(trimmed) ? escapeHtml(trimmed) : '';
    }

    const newsList = document.getElementById('news-list');
    if (newsList) {
        newsList.innerHTML = '<p class="loading-text">Loading news…</p>';
        fetchSheet(SHEETS.news)
            .then(items => renderNews(items.slice().reverse(), newsList))
            .catch(error => {
                console.error('Error loading news:', error);
                newsList.innerHTML = '<p class="loading-text">Unable to load news right now.</p>';
            });
    }

    function renderNews(items, container) {
        if (!items.length) {
            container.innerHTML = '<p class="loading-text">No news yet.</p>';
            return;
        }
        container.innerHTML = items.map(item => {
            const url = safeUrl(item.URL);
            const readMore = url
                ? `<a href="${url}" class="news-read-more" target="_blank" rel="noopener">Read more <span class="news-arrow">→</span></a>`
                : '';
            return `
                <div class="news-item">
                    <span class="news-date">${escapeHtml(item.Date)}</span>
                    <span class="news-tag">${escapeHtml(item.Tag)}</span>
                    <div class="news-body">
                        <p class="news-text">${escapeHtml(item.News)}</p>
                        ${readMore}
                    </div>
                </div>`;
        }).join('');
    }

    const pubList = document.getElementById('publications-list');
    if (pubList) {
        pubList.innerHTML = '<p class="loading-text">Loading publications…</p>';
        fetchSheet(SHEETS.publications)
            .then(items => renderPublications(items.slice().reverse(), pubList))
            .catch(error => {
                console.error('Error loading publications:', error);
                pubList.innerHTML = '<p class="loading-text">Unable to load publications right now.</p>';
            });
    }

    function renderPublications(items, container) {
        if (!items.length) {
            container.innerHTML = '<p class="loading-text">No publications yet.</p>';
            return;
        }
        container.innerHTML = items.map(item => {
            const links = [
                { url: safeUrl(item.Paper), label: 'View Paper' },
                { url: safeUrl(item.Code), label: 'Code' },
                { url: safeUrl(item.Blog), label: 'Blog' }
            ]
                .filter(link => link.url)
                .map(link => `<a href="${link.url}" class="btn btn-outline btn-small" target="_blank" rel="noopener">${link.label}</a>`)
                .join('');
            const authors = item.Authors
                ? `<p class="pub-authors"><strong>Authors:</strong> ${escapeHtml(item.Authors)}</p>`
                : '';
            const venue = item.Venue
                ? `<p class="pub-venue"><em>${escapeHtml(item.Venue)}</em></p>`
                : '';
            return `
                <div class="pub-item">
                    <h3 class="pub-title">${escapeHtml(item.Title)}</h3>
                    ${authors}
                    ${venue}
                    ${links ? `<div class="pub-links">${links}</div>` : ''}
                </div>`;
        }).join('');
    }

    // Photos come from the sheet's "Photo" column. Google Drive throttles hotlinked
    // images (they load unreliably), so we serve a locally cached copy
    // (assets/people/cache/<id>.jpg, produced by scripts/sync_people_photos.sh) and only
    // fall back to the live Drive URL — then an initials avatar — if the cache is missing.
    function driveFileId(url) {
        const m = url.match(/\/file\/d\/([^/]+)/)
            || url.match(/[?&]id=([^&]+)/)
            || url.match(/thumbnail\?id=([^&]+)/);
        return m ? m[1] : '';
    }

    function personPhotoHtml(person, name, initials) {
        const raw = (person.Photo || '').trim();
        if (!raw) {
            return `<div class="person-photo"><span class="avatar-initials">${escapeHtml(initials)}</span></div>`;
        }
        const id = /drive\.google\.com|docs\.google\.com/.test(raw) ? driveFileId(raw) : '';
        const primary = id ? `assets/people/cache/${id}.jpg` : raw;
        const fallback = id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : '';
        const fbAttr = fallback ? ` data-fallback="${escapeHtml(fallback)}"` : '';
        return `<div class="person-photo"><img src="${escapeHtml(primary)}" alt="${escapeHtml(name)}" data-initials="${escapeHtml(initials)}"${fbAttr}></div>`;
    }

    const currentGrid = document.getElementById('current-members');
    const pastGrid = document.getElementById('past-members');
    if (currentGrid || pastGrid) {
        if (currentGrid) currentGrid.innerHTML = '<p class="loading-text">Loading team…</p>';
        fetchSheet(SHEETS.people)
            .then(renderPeople)
            .catch(error => {
                console.error('Error loading people:', error);
                if (currentGrid) currentGrid.innerHTML = '<p class="loading-text">Unable to load team right now.</p>';
            });
    }

    function personInitials(name) {
        return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    }

    function personCard(person) {
        const name = person.Name || '';
        const initials = personInitials(name);
        const photoHtml = personPhotoHtml(person, name, initials);

        const website = safeUrl(person.Website);
        const linkedin = safeUrl(person.LinkedIn);
        const email = (person.Email || '').trim();
        let links = '';
        if (website) {
            links += `<a href="${website}" rel="noopener" target="_blank" title="Website"><i data-feather="globe"></i></a>`;
        }
        if (email) {
            links += `<a href="mailto:${escapeHtml(email)}" title="Email"><i data-feather="mail"></i></a>`;
        }
        if (linkedin) {
            links += `<a href="${linkedin}" rel="noopener" target="_blank" title="LinkedIn" class="icon-linkedin"><svg><use href="#icon-linkedin"></use></svg></a>`;
        }

        const role = person.Degree ? `<span class="person-role">${escapeHtml(person.Degree)}</span>` : '';
        const bio = person['Research Interests']
            ? `<p class="person-bio">${escapeHtml(person['Research Interests'])}</p>`
            : '';

        return `
            <div class="person-card">
                ${photoHtml}
                <div class="person-info">
                    <h3>${escapeHtml(name)}</h3>
                    ${role}
                    ${bio}
                    <div class="person-links">${links}</div>
                </div>
            </div>`;
    }

    function pastMemberRow(person) {
        const name = person.Name || '';
        const link = safeUrl(person.Website) || safeUrl(person.LinkedIn);
        const nameHtml = link
            ? `<a href="${link}" class="past-member-name" target="_blank" rel="noopener">${escapeHtml(name)}</a>`
            : `<span class="past-member-name">${escapeHtml(name)}</span>`;
        const position = person['Current Position']
            ? `<span class="past-member-position">${escapeHtml(person['Current Position'])}</span>`
            : '';
        return `
            <div class="past-member">
                ${nameHtml}
                ${position}
            </div>`;
    }

    // If the cached photo is missing, try the live Drive URL once, then fall back to
    // an initials avatar.
    function attachPhotoFallback(container) {
        container.querySelectorAll('img[data-initials]').forEach(img => {
            img.addEventListener('error', () => {
                const fb = img.getAttribute('data-fallback');
                if (fb) {
                    img.removeAttribute('data-fallback');
                    img.src = fb;
                } else {
                    const span = document.createElement('span');
                    span.className = 'avatar-initials';
                    span.textContent = img.dataset.initials;
                    img.replaceWith(span);
                }
            });
        });
    }

    function renderPeople(people) {
        const byStatus = status => people.filter(p => (p.Status || '').trim().toLowerCase() === status);
        const current = byStatus('current');
        const past = byStatus('past');

        if (currentGrid) {
            currentGrid.innerHTML = current.length
                ? current.map(personCard).join('')
                : '<p class="loading-text">No current members listed.</p>';
            attachPhotoFallback(currentGrid);
        }

        const pastDivider = document.getElementById('past-divider');
        if (pastGrid) {
            pastGrid.innerHTML = past.map(pastMemberRow).join('');
        }
        if (pastDivider) {
            pastDivider.style.display = past.length ? '' : 'none';
        }

        if (window.feather) window.feather.replace();
    }
});
