/* Perpetual lead-gen pages — shared behaviour: tracking, UTM, sticky, reveal */

/* ==== TRACKING CONFIG — fill in when IDs are approved; leave "" to disable ==== */
window.PMP_CONFIG = window.PMP_CONFIG || {
  META_PIXEL_ID: "543241923632489",  /* Meta Pixel — base code auto-injects */
  GA4_MEASUREMENT_ID: "G-X9YCKWQQGX"    /* GA4 (2026-11-23, Telegram 18283): page_view + whatsapp_click, same id as the Kulai page */
};

window.PMP = (function(){
  var WA_BASE = "https://wa.me/60182868889";

  /* ---- ?test=1 marks this tab as a test visit (2026-11-23): no GA4, no Meta pixel, no Google Ads tag is loaded, so no
     test reaches them; page-track.js and the booking form read the same flag. Kept for the tab in sessionStorage. ---- */
  var TEST = false, TQ = false;
  try { TQ = new URLSearchParams(location.search).get("test") === "1"; } catch(e){}
  try {
    if (TQ) sessionStorage.setItem("pmp_test", "1");
    TEST = TQ || sessionStorage.getItem("pmp_test") === "1";
  } catch(e){ TEST = TQ; }
  window.PMP_TEST = TEST;

  /* a utm value that looks like an e-mail or a phone number never goes to GA4 / Meta: an "@", a Malaysian mobile number
     anywhere, or a value of only digits and phone punctuation with 9-13 digits that starts with + / 0 / 6.
     Numeric campaign or ad ids (2026112301, 120212345678901234) are kept. */
  function unsafe(v){
    v = String(v).trim();
    var n = (v.match(/\d/g) || []).length;
    return /@/.test(v)
      || /(^|[^\d])(\+?6?01\d)[\s-]?\d{3,4}[\s-]?\d{4}([^\d]|$)/.test(v)
      || (/^[+0-9\s().-]+$/.test(v) && n >= 9 && n <= 13 && /^[+(]?\s*[06]/.test(v));
  }
  function safeHref(h){
    try { var a = new URL(h, location.href); if (cleanUrl(a.href) !== a.href) return h.split("?")[0]; } catch(e){}
    return h;
  }
  function cleanUrl(href){
    if (!href) return href;
    try {
      var u = new URL(href), ks = [];
      u.searchParams.forEach(function(v, k){ if (k.toLowerCase().indexOf("utm_") === 0 && unsafe(v) && ks.indexOf(k) < 0) ks.push(k); });
      if (!ks.length) return href;
      ks.forEach(function(k){ u.searchParams.delete(k); });
      return u.href;
    } catch(e){ return href; }
  }

  /* ---- inject Meta Pixel / GA4 base code when IDs are configured ---- */
  (function initVendors(){
    var c = window.PMP_CONFIG;
    if (TEST) return;
    if (c.META_PIXEL_ID && typeof window.fbq !== "function"){
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', c.META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
    if (c.GA4_MEASUREMENT_ID && typeof window.gtag !== "function"){
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + c.GA4_MEASUREMENT_ID;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      var cfg = {}, pl = cleanUrl(location.href), pr = cleanUrl(document.referrer);
      if (pl !== location.href) cfg.page_location = pl;
      if (document.referrer && pr !== document.referrer) cfg.page_referrer = pr;
      window.gtag("config", c.GA4_MEASUREMENT_ID, cfg);
    }
  })();

  /* ---- Meta/GA campaign params: capture once, persist for the session ---- */
  var KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","utm_id","fbclid","gclid","gbraid","wbraid"];
  var utm = {};
  try{
    var q = new URLSearchParams(location.search);
    KEYS.forEach(function(k){ if (q.get(k)) utm[k] = q.get(k); });
    if (Object.keys(utm).length){ sessionStorage.setItem("pmp_utm", JSON.stringify(utm)); }
    else { utm = JSON.parse(sessionStorage.getItem("pmp_utm") || "{}"); }
  }catch(e){ utm = {}; }

  /* preserve UTMs on internal page links */
  function decorateLinks(){
    if (!Object.keys(utm).length) return;
    var su = safeUtm();
    document.querySelectorAll('a[href*=".html"], a[href="./"], a[href="/"]').forEach(function(a){
      try{
        var u = new URL(a.getAttribute("href"), location.href);
        if (u.origin !== location.origin) return;
        KEYS.forEach(function(k){ if (su[k] && !u.searchParams.get(k)) u.searchParams.set(k, su[k]); });
        a.href = u.pathname + u.search + u.hash;
      }catch(e){}
    });
  }

  /* ---- event hook: dataLayer always; Meta Pixel + GA4 when installed ---- */
  var currentPage = "";
  /* utm values that look like an e-mail or a phone number never go to GA4 / Meta (2026-11-23) */
  function safeUtm(){
    var o = {};
    for (var k in utm){
      var v = String(utm[k]);
      if (k.indexOf("utm_") === 0){ if (unsafe(v)) continue; v = v.slice(0, 100); }
      o[k] = v;
    }
    return o;
  }
  function track(ev, params){
    var su = safeUtm();
    params = Object.assign({}, su, params || {});
    if (params.page_type) currentPage = params.page_type;
    else if (currentPage) params.page_type = currentPage;
    if (su.utm_campaign && !params.campaign) params.campaign = su.utm_campaign;
    if (su.utm_content  && !params.creative) params.creative = su.utm_content;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({event:ev}, params));
    if (typeof window.fbq === "function") window.fbq("trackCustom", ev, params);
    if (typeof window.gtag === "function") window.gtag("event", ev, params);
  }

  /* ---- global click stream: every button/link/summary tap ---- */
  document.addEventListener("click", function(e){
    var el = e.target.closest("a, button, summary");
    if (!el) return;
    var cls = String(el.className || "");
    track("button_click", {
      label: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
      kind: cls.indexOf("chip") > -1 ? "chip"
          : cls.indexOf("opt")  > -1 ? "option"
          : el.tagName === "SUMMARY"  ? "faq"
          : cls.indexOf("btn")  > -1 ? "cta"
          : el.tagName.toLowerCase(),
      href: el.tagName === "A" ? safeHref(el.getAttribute("href") || "").slice(0, 60) : ""
    });
  }, true);

  /* ---- scroll_50, once ---- */
  function initScrollDepth(page){
    var sent = false;
    window.addEventListener("scroll", function(){
      if (sent) return;
      var d = document.documentElement;
      if (window.scrollY / (d.scrollHeight - d.clientHeight) >= .5){
        sent = true; track("scroll_50", {page_type:page});
      }
    }, {passive:true});
  }

  /* ---- reveal on scroll, with fail-safe sweep ---- */
  function initReveal(){
    var io = ("IntersectionObserver" in window)
      ? new IntersectionObserver(function(es){
          es.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
        }, {threshold:.05})
      : null;
    document.querySelectorAll(".reveal").forEach(function(el){
      if (io) io.observe(el); else el.classList.add("in");
    });
    function sweep(){
      document.querySelectorAll(".reveal:not(.in)").forEach(function(el){
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
      });
    }
    window.addEventListener("scroll", sweep, {passive:true});
    window.addEventListener("load", sweep);
  }

  /* ---- sticky mobile CTA: show after `afterEl`, hide while `hideAtEl` visible ---- */
  function initSticky(afterEl, hideAtEl){
    var bar = document.getElementById("sticky-cta");
    if (!bar || !("IntersectionObserver" in window)) return;
    var past = false, at = false;
    function sync(){
      var show = past && !at;
      bar.classList.toggle("show", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
    }
    if (afterEl) new IntersectionObserver(function(en){ past = !en[0].isIntersecting; sync(); }, {threshold:.05}).observe(afterEl);
    else past = true;
    if (hideAtEl) new IntersectionObserver(function(en){ at = en[0].isIntersecting; sync(); }, {threshold:.2}).observe(hideAtEl);
    sync();
  }

  /* ---- lead-source reference code appended to WhatsApp messages ----
     Format: [编号 PR-campaign-creative] — lets care consultants (and any
     CRM export of chats) attribute every conversation to page + campaign. */
  var PAGE_CODE = { price:"PR", matcher:"MT", locations:"LC", "4steps":"ST", guide:"GD" };
  function refCode(page){
    var parts = [PAGE_CODE[page] || (page || "LP").slice(0,2).toUpperCase()];
    if (utm.utm_campaign) parts.push(String(utm.utm_campaign).replace(/[^\w-]/g,"").slice(0,18));
    if (utm.utm_content)  parts.push(String(utm.utm_content).replace(/[^\w-]/g,"").slice(0,14));
    return parts.join("-");
  }
  function tagMessage(message, page){
    return message + "\n\n[编号 " + refCode(page) + "]";
  }

  /* ---- WhatsApp links: set message on all .js-wa, wire click tracking ---- */
  function setWA(message, page){
    var url = WA_BASE + "?text=" + encodeURIComponent(tagMessage(message, page));
    document.querySelectorAll(".js-wa").forEach(function(a){ a.href = url; });
    return url;
  }
  function initWAClicks(page, getContext){
    document.querySelectorAll("a[href*='wa.me'], a.js-wa").forEach(function(a){
      a.addEventListener("click", function(){
        track("whatsapp_click", Object.assign({page:page, source:a.dataset.src || "cta"},
          (typeof getContext === "function" ? getContext() : {})));
      });
    });
  }

  /* ---- single-select chip groups: data-group on wrapper, data-value on .chip ---- */
  function initChips(onChange){
    document.querySelectorAll(".chips[data-group]").forEach(function(group){
      var key = group.dataset.group;
      group.addEventListener("click", function(e){
        var chip = e.target.closest(".chip");
        if (!chip) return;
        var on = chip.getAttribute("aria-pressed") === "true";
        group.querySelectorAll(".chip").forEach(function(c){ c.setAttribute("aria-pressed","false"); });
        chip.setAttribute("aria-pressed", on ? "false" : "true");
        onChange(key, on ? null : chip.dataset.value);
      });
    });
  }

  return { WA_BASE:WA_BASE, utm:utm, test:TEST, track:track, setWA:setWA, tagMessage:tagMessage, refCode:refCode,
           initScrollDepth:initScrollDepth, initReveal:initReveal, initSticky:initSticky,
           initWAClicks:initWAClicks, initChips:initChips, decorateLinks:decorateLinks };
})();
