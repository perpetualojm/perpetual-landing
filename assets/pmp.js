/* Perpetual lead-gen pages — shared behaviour: tracking, UTM, sticky, reveal */
window.PMP = (function(){
  var WA_BASE = "https://wa.me/60182868889";

  /* ---- Meta/GA campaign params: capture once, persist for the session ---- */
  var KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","gclid"];
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
    document.querySelectorAll('a[href$=".html"], a[href="./"], a[href="/"]').forEach(function(a){
      try{
        var u = new URL(a.getAttribute("href"), location.href);
        if (u.origin !== location.origin) return;
        KEYS.forEach(function(k){ if (utm[k] && !u.searchParams.get(k)) u.searchParams.set(k, utm[k]); });
        a.href = u.pathname + u.search + u.hash;
      }catch(e){}
    });
  }

  /* ---- event hook: dataLayer always; Meta Pixel + GA4 when installed ---- */
  function track(ev, params){
    params = Object.assign({}, utm, params || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({event:ev}, params));
    if (typeof window.fbq === "function") window.fbq("trackCustom", ev, params);
    if (typeof window.gtag === "function") window.gtag("event", ev, params);
  }

  /* ---- scroll_50, once ---- */
  function initScrollDepth(page){
    var sent = false;
    window.addEventListener("scroll", function(){
      if (sent) return;
      var d = document.documentElement;
      if (window.scrollY / (d.scrollHeight - d.clientHeight) >= .5){
        sent = true; track("scroll_50", {page:page});
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

  /* ---- WhatsApp links: set message on all .js-wa, wire click tracking ---- */
  function setWA(message, page){
    var url = WA_BASE + "?text=" + encodeURIComponent(message);
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

  return { WA_BASE:WA_BASE, utm:utm, track:track, setWA:setWA,
           initScrollDepth:initScrollDepth, initReveal:initReveal, initSticky:initSticky,
           initWAClicks:initWAClicks, initChips:initChips, decorateLinks:decorateLinks };
})();
