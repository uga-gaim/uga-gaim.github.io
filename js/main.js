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
            hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) mobileMenu.classList.remove('open');
            });
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
        news: 'https://docs.google.com/spreadsheets/d/1dXi4Xsls_baLten9Shn2kwF-SZ7QOpb6/gviz/tq?tqx=out:csv',
        publications: 'https://docs.google.com/spreadsheets/d/1C3FFrE_CRWiliexxafu7ci_78_XDcN_z/gviz/tq?tqx=out:csv',
        people: 'https://docs.google.com/spreadsheets/d/1VODQFrsWPv_qFuYQryK44ix0a-89mtBe/gviz/tq?tqx=out:csv',
        hero: 'https://docs.google.com/spreadsheets/d/1nH3YDu0MfmaBATuiQdBVOZGSbgOmPM9c57kSFn8Pj9U/gviz/tq?tqx=out:csv'
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

    const HERO_SLIDE_MS = 9000;

    const heroMedia = document.getElementById('hero-media');
    if (heroMedia) {
        fetchSheet(SHEETS.hero)
            .then(rows => {
                const slides = rows
                    .map(r => ({ path: (r.Path || '').trim(), text: (r.Text || '').trim() }))
                    .filter(s => s.path);
                if (slides.length) renderHeroSlides(slides, heroMedia);
            })
            .catch(error => console.error('Error loading hero images:', error));
    }

    function renderHeroSlides(slides, container) {
        const n = slides.length;
        const slideHtml = s => `
            <div class="hero-slide">
                <img src="${escapeHtml(s.path)}" alt="${escapeHtml(s.text)}">
                ${s.text ? `<span class="hero-media-caption">${escapeHtml(s.text)}</span>` : ''}
            </div>`;

        if (n === 1) {
            container.innerHTML = `<div class="hero-slides">${slideHtml(slides[0])}</div>`;
            return;
        }

        const seq = [slides[n - 1], ...slides, slides[0]];
        container.innerHTML = `<div class="hero-slides">${seq.map(slideHtml).join('')}</div>`;

        const track = container.querySelector('.hero-slides');
        let pos = 1;
        let animating = false;
        let safety;

        const setTransform = () => { track.style.transform = `translateX(-${pos * 100}%)`; };

        const jumpTo = (p) => {
            pos = p;
            track.style.transition = 'none';
            setTransform();
            void track.offsetWidth;
            track.style.transition = '';
        };

        jumpTo(1);

        function unlock() {
            animating = false;
            if (pos === seq.length - 1) jumpTo(1);
            else if (pos === 0) jumpTo(n);
        }

        const go = (dir) => {
            if (animating || document.hidden) return;
            animating = true;
            pos += dir;
            setTransform();
            clearTimeout(safety);
            safety = setTimeout(unlock, 1600);
        };

        track.addEventListener('transitionend', (event) => {
            if (event.target !== track || event.propertyName !== 'transform') return;
            clearTimeout(safety);
            unlock();
        });

        let timer;
        const autoplay = () => {
            clearInterval(timer);
            timer = setInterval(() => go(1), HERO_SLIDE_MS);
        };
        autoplay();

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) autoplay();
        });

        const arrow = (dir, label, points) => `
            <button class="hero-nav hero-nav-${dir}" type="button" aria-label="${label}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="${points}"></polyline>
                </svg>
            </button>`;
        container.insertAdjacentHTML('beforeend',
            arrow('prev', 'Previous slide', '15 18 9 12 15 6') +
            arrow('next', 'Next slide', '9 18 15 12 9 6'));

        container.querySelectorAll('.hero-nav').forEach(btn => {
            btn.addEventListener('click', () => {
                go(btn.classList.contains('hero-nav-next') ? 1 : -1);
                autoplay();
            });
        });
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
        const grouped = {};
        items.forEach(item => {
            const year = item.Year || 'Other';
            if (!grouped[year]) grouped[year] = [];
            grouped[year].push(item);
        });
        const sortedYears = Object.keys(grouped).sort((a, b) => b - a);
        container.innerHTML = sortedYears.map(year => {
            const pubs = grouped[year].map(item => {
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
            return `<div class="pub-year-group">
                <div class="pub-year-divider"><span>${escapeHtml(year)}</span></div>
                ${pubs}
            </div>`;
        }).join('');
    }

    const PERSON_PHOTOS = {
        'Harshith Kethavath': 'assets/people/Kethavath.jpeg',
    };

    function personPhotoHtml(person, name, initials) {
        const photo = (person.Photo || '').trim();
        const src = (photo && !/[:/]/.test(photo)) ? `assets/people/${photo}` : (PERSON_PHOTOS[name] || '');
        if (!src) {
            return `<div class="person-photo"><span class="avatar-initials">${escapeHtml(initials)}</span></div>`;
        }
        return `<div class="person-photo"><img src="${escapeHtml(src)}" alt="${escapeHtml(name)}" data-initials="${escapeHtml(initials)}"></div>`;
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
        const words = name.split(/\s+/).filter(Boolean);
        if (words.length <= 2) return words.map(w => w[0]).join('').toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
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

    function attachPhotoFallback(container) {
        container.querySelectorAll('img[data-initials]').forEach(img => {
            img.addEventListener('error', () => {
                const span = document.createElement('span');
                span.className = 'avatar-initials';
                span.textContent = img.dataset.initials;
                img.replaceWith(span);
            }, { once: true });
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
