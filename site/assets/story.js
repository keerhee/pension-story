/* pension-story 스크롤 연출 — GSAP 3.13.0 + ScrollTrigger
 * 원칙: 초기 숨김은 CSS가 아니라 여기서만 한다. JS가 꺼지거나 reduced-motion이면 정적 페이지 그대로.
 */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── 1. 상단 진행선 + 챕터 표시 (움직임 설정과 무관하게 항상) ── */
  var bar = $('#progress');
  var now = $('#chapterNow');
  var links = $$('.chapters a');
  var chapters = links.map(function (a) { return document.getElementById(a.dataset.ch); });
  var ticking = false;

  function update() {
    var el = document.documentElement;
    var max = el.scrollHeight - el.clientHeight;
    if (bar) bar.style.width = (max > 0 ? (el.scrollTop / max) * 100 : 0) + '%';

    var mid = window.innerHeight * 0.45, idx = -1;
    chapters.forEach(function (sec, i) {
      if (sec && sec.getBoundingClientRect().top <= mid) idx = i;
    });
    var closing = $('#closing');
    if (closing && closing.getBoundingClientRect().top <= mid) idx = -1;
    links.forEach(function (a, i) {
      a.classList.toggle('on', i === idx);
      if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (now) {
      now.textContent = idx >= 0 ? String(idx + 1).padStart(2, '0') + ' / ' + String(links.length).padStart(2, '0') : '';
      now.classList.toggle('on', idx >= 0);
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* 챕터 링크: 고정(pin) 섹션은 앵커 위치가 어긋나므로 직접 계산해 이동한다 */
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var sec = document.getElementById(a.dataset.ch);
      if (!sec) return;
      e.preventDefault();
      var y = null;
      if (window.ScrollTrigger) {
        ScrollTrigger.getAll().forEach(function (t) {
          if (t.pin === sec) y = t.end;          /* 연출이 끝난 완성 화면 */
        });
      }
      if (y === null) {
        var header = document.querySelector('header');
        y = sec.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0);
      }
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + sec.id);
    });
  });

  /* ── 2. 스크롤 연출 ── */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var PILE_WORDS = ['속보', '금리 발표', '환율', '실적 회의', '보고서', '시장 소문', '이메일', '주가 급락', '회의 또 회의'];

  function pathLen(p) { try { return p.getTotalLength(); } catch (e) { return 600; } }

  /* 공통: 섹션별 장면 — isDesktop이면 pin 사용 */
  function scenes(isDesktop) {
    var made = [];

    /* 히어로 — 도로가 다가오고 제목은 위로 빠진다 */
    gsap.timeline({
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    })
      .to('#hero .road svg', { scale: 1.6, transformOrigin: '50% 8%', ease: 'none' }, 0)
      .to('#hero .road', { opacity: 0.25, ease: 'none' }, 0)
      .to('#hero h1, #hero .lead', { yPercent: -40, opacity: 0, ease: 'none', stagger: 0.05 }, 0)
      .to('#hero .cue', { opacity: 0, ease: 'none' }, 0);

    /* 수동 운전 — 카드가 쌓이고 운전자가 흐려진다 */
    var driver = $('#manual .driver');
    var pile = document.createElement('div');
    pile.className = 'pile';
    pile.setAttribute('aria-hidden', 'true');
    PILE_WORDS.forEach(function (w, i) {
      var s = document.createElement('span');
      s.textContent = w;
      s.style.left = (6 + (i * 37) % 62) + '%';
      s.style.top = (8 + (i * 23) % 70) + '%';
      pile.appendChild(s);
    });
    driver.appendChild(pile);
    made.push(pile);
    var cards = $$('#manual .info-card');
    var tlManual = gsap.timeline({
      scrollTrigger: isDesktop
        ? { trigger: '#manual', start: 'center center+=28', end: '+=160%', pin: true, scrub: 0.5, anticipatePin: 1 }
        : { trigger: '#manual .panel', start: 'top 85%', end: 'bottom 30%', scrub: 0.5 }
    });
    tlManual
      .from(cards, { x: 60, opacity: 0.2, stagger: 0.25, duration: 0.6, ease: 'power2.out' })
      .from(pile.children, {
        y: function () { return gsap.utils.random(-80, 80); },
        x: function () { return gsap.utils.random(-120, 120); },
        rotation: function () { return gsap.utils.random(-14, 14); },
        opacity: 0, stagger: 0.12, duration: 0.5, ease: 'power2.out'
      }, '+=0.1')
      .to('#manual .avatar, #manual .driver', { opacity: 0.35, duration: 0.8 }, '-=0.6');

    /* 자율주행 팀 — 숫자 카운트업, 센서 링이 퍼진다 */
    $$('#team [data-count]').forEach(function (el) {
      var target = +el.dataset.count, o = { v: 0 };
      el.textContent = '0';
      /* scrub이 아니라 한 번 재생 — 스크롤을 멈춰도 중간 숫자(틀린 값)가 남지 않게 */
      gsap.to(o, {
        v: target, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none none' },
        onUpdate: function () { el.textContent = Math.round(o.v); },
        onComplete: function () { el.textContent = target; }
      });
    });
    gsap.from('#team .ring', {
      scale: 0.2, opacity: 0, stagger: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: '#team .radar', start: 'top 85%', end: 'center 50%', scrub: 0.5 }
    });

    /* 검사와 투표 — 흩어진 안이 모이고 B가 선택된다 */
    var votes = $$('#vote .vote');
    var pick = $('#vote .vote.pick');
    var badge = $('#vote .badge');
    var tlVote = gsap.timeline({
      scrollTrigger: isDesktop
        ? { trigger: '#vote', start: 'center center+=28', end: '+=100%', pin: true, scrub: 0.5, anticipatePin: 1 }
        : { trigger: '#vote .panel', start: 'top 85%', end: 'bottom 35%', scrub: 0.5 }
    });
    tlVote
      .from(votes, {
        x: function (i) { return (i - 1) * (isDesktop ? 90 : 40); },
        y: function (i) { return [50, -40, 30][i]; },
        rotation: function (i) { return [-6, 4, 7][i]; },
        opacity: 0.2, duration: 1, ease: 'power2.out'
      })
      .fromTo(pick, { borderColor: 'rgba(62,72,79,.3)', boxShadow: '0 0 0 rgba(245,158,11,0)' },
        { borderColor: '#ffb95f', boxShadow: '0 0 28px rgba(245,158,11,.3)', duration: 0.4 }, '+=0.2')
      .to(votes.filter(function (v) { return v !== pick; }), { opacity: 0.45, duration: 0.4 }, '<')
      .from(badge, { scale: 0, opacity: 0, duration: 0.3, ease: 'back.out(2.5)' }, '<0.1');

    /* 스스로 고치기 — 예측 → 실제 → 고친 예측 */
    var svg = $('#learn .paths svg');
    var ns = 'http://www.w3.org/2000/svg';
    var clip = document.createElementNS(ns, 'clipPath');
    clip.setAttribute('id', 'predClip');
    var clipRect = document.createElementNS(ns, 'rect');
    clipRect.setAttribute('x', '0'); clipRect.setAttribute('y', '-40');
    clipRect.setAttribute('width', '0'); clipRect.setAttribute('height', '260');
    clip.appendChild(clipRect);
    svg.insertBefore(clip, svg.firstChild);
    made.push(clip);
    var pred = $('#learn .path-pred'), fix = $('#learn .path-fix'), act = $('#learn .path-actual');
    var dots = $$('#learn circle');
    pred.setAttribute('clip-path', 'url(#predClip)');
    fix.setAttribute('clip-path', 'url(#predClip)');
    var aLen = pathLen(act);
    gsap.set(act, { strokeDasharray: aLen, strokeDashoffset: aLen });
    gsap.set(fix, { opacity: 0 });
    gsap.timeline({
      scrollTrigger: { trigger: '#learn .panel', start: 'top 80%', end: 'center 40%', scrub: 0.6 }
    })
      .to(clipRect, { attr: { width: 500 }, duration: 1, ease: 'none' })
      .to(act, { strokeDashoffset: 0, duration: 1, ease: 'none' }, '+=0.1')
      .from(dots, { scale: 0, transformOrigin: '50% 50%', duration: 0.2 }, '<0.6')
      .to(pred, { opacity: 0.3, duration: 0.4 })
      .to(fix, { opacity: 1, duration: 0.5 }, '<');

    /* 감독석 — 표지판이 차례로 지나가고 브레이크가 켜진다 */
    gsap.from('#supervise .rule', {
      x: isDesktop ? 120 : 60, opacity: 0.2, stagger: 0.2, ease: 'power2.out',
      scrollTrigger: { trigger: '#supervise .rules', start: 'top 85%', end: 'top 45%', scrub: 0.5 }
    });
    var brake = $('#supervise .brake');
    ScrollTrigger.create({
      trigger: brake, start: 'top 70%',
      onEnter: function () { brake.classList.add('lit'); },
      onLeaveBack: function () { brake.classList.remove('lit'); }
    });
    gsap.from('#supervise .brake-btn', {
      scale: 0.85, ease: 'back.out(2)',
      scrollTrigger: { trigger: brake, start: 'top 80%', end: 'top 55%', scrub: 0.4 }
    });

    /* 마무리 — 새벽빛 */
    gsap.timeline({
      scrollTrigger: { trigger: '#closing', start: 'top 85%', end: 'top 25%', scrub: 0.6 }
    })
      .to('#closing .dawn', { opacity: 1, ease: 'none' }, 0)
      .from('#closing .closing-lines span', { y: 30, opacity: 0, stagger: 0.15 }, 0)
      .from('#closing .display', { y: 40, opacity: 0 }, 0.2)
      .from('#closing .cta', { y: 20, opacity: 0 }, 0.35);

    /* 정리: matchMedia가 되돌릴 때 만든 요소와 속성을 지운다 */
    return function () {
      made.forEach(function (n) { n.remove(); });
      pred.removeAttribute('clip-path');
      fix.removeAttribute('clip-path');
      brake.classList.remove('lit');
      $$('#team [data-count]').forEach(function (el) { el.textContent = el.dataset.count; });
    };
  }

  var mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 769px)', function () { return scenes(true); });
  mm.add('(prefers-reduced-motion: no-preference) and (max-width: 768px)', function () { return scenes(false); });

  /* 글꼴이 늦게 들어오면 높이가 바뀌므로 다시 계산 */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
