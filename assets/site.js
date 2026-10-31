(function(){
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* header border on scroll */
  var header = document.querySelector(".site-header");
  function onScroll(){ if(header) header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, {passive:true}); onScroll();

  /* desktop dropdowns */
  var dds = document.querySelectorAll(".dd");
  dds.forEach(function(dd){
    var btn = dd.querySelector("button");
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      var open = dd.getAttribute("data-open") === "true";
      dds.forEach(function(o){ o.setAttribute("data-open","false"); o.querySelector("button").setAttribute("aria-expanded","false"); });
      dd.setAttribute("data-open", open ? "false" : "true");
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });
  document.addEventListener("click", function(){ dds.forEach(function(o){ o.setAttribute("data-open","false"); o.querySelector("button").setAttribute("aria-expanded","false"); }); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape"){ dds.forEach(function(o){ o.setAttribute("data-open","false"); }); } });

  /* mobile menu */
  var mb = document.querySelector(".menu-btn"), mn = document.querySelector(".mobile-nav");
  if(mb && mn){ mb.addEventListener("click", function(){
    var open = mn.getAttribute("data-open") === "true";
    mn.setAttribute("data-open", open ? "false" : "true");
    mb.setAttribute("aria-expanded", open ? "false" : "true");
  }); }

  /* year */
  document.querySelectorAll("[data-year]").forEach(function(el){ el.textContent = new Date().getFullYear(); });

  /* hero lattice: hexagonal cells that light up in the logo gradient */
  var cv = document.getElementById("lattice");
  if(cv && cv.getContext){
    var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, cells = [], R = 26, mouse = {x:-9999, y:-9999}, t0 = performance.now();
    var stops = [[0,200,248],[5,96,250],[123,77,255],[212,12,245]];
    function grad(p){ p = Math.max(0, Math.min(1, p)); var s = p*3, i = Math.min(2, Math.floor(s)), f = s - i, a = stops[i], b = stops[i+1];
      return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f]; }
    function build(){
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = W*dpr; cv.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      R = W < 700 ? 20 : 26; cells = [];
      var w = Math.sqrt(3)*R, h = 1.5*R;
      for(var row = -1; row*h < H + R; row++){
        for(var col = -1; col*w < W + w; col++){
          var x = col*w + (row % 2 ? w/2 : 0), y = row*h;
          cells.push({x:x, y:y, seed: Math.random()});
        }
      }
    }
    function hex(x, y, r){ ctx.beginPath(); for(var k = 0; k < 6; k++){ var a = Math.PI/180*(60*k - 30); var px = x + r*Math.cos(a), py = y + r*Math.sin(a); if(k) ctx.lineTo(px,py); else ctx.moveTo(px,py);} ctx.closePath(); }
    function frame(now){
      var t = (now - t0)/1000; ctx.clearRect(0,0,W,H);
      var cx = W*0.72, cy = H*0.48;            // the wave's origin sits behind the right side
      for(var i = 0; i < cells.length; i++){
        var c = cells[i], dx = c.x - cx, dy = c.y - cy, d = Math.sqrt(dx*dx + dy*dy);
        var wave = reduce ? 0 : Math.max(0, Math.sin(d/90 - t*1.1));
        wave = Math.pow(wave, 6);
        var md = Math.hypot(c.x - mouse.x, c.y - mouse.y), near = Math.max(0, 1 - md/170);
        var fall = Math.max(0, 1 - d/(Math.max(W,H)*0.75));
        var a = 0.07 + fall*0.12 + wave*0.38*fall + near*0.55 + (c.seed > 0.985 ? 0.25*fall : 0);
        var col = grad(c.x / W);
        hex(c.x, c.y, R - 3);
        ctx.strokeStyle = "rgba(" + (col[0]|0) + "," + (col[1]|0) + "," + (col[2]|0) + "," + Math.min(0.9, a).toFixed(3) + ")";
        ctx.lineWidth = 1.2; ctx.stroke();
        if(near > 0.35 || wave*fall > 0.55){ ctx.fillStyle = "rgba(" + (col[0]|0) + "," + (col[1]|0) + "," + (col[2]|0) + "," + (Math.max(near-0.35, wave*fall-0.55)*0.35).toFixed(3) + ")"; ctx.fill(); }
      }
      if(!reduce) requestAnimationFrame(frame);
    }
    build(); window.addEventListener("resize", function(){ build(); if(reduce) frame(performance.now()); });
    var hero = cv.parentElement;
    hero.addEventListener("pointermove", function(e){ var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; if(reduce) frame(performance.now()); });
    hero.addEventListener("pointerleave", function(){ mouse.x = mouse.y = -9999; });
    requestAnimationFrame(frame);
  }

  /* contact form → FormSubmit (AJAX). Falls back to the visitor's mail app. */
  var form = document.querySelector("form.f");
  if(form){
    var status = form.querySelector(".f-status"), msgs = JSON.parse(form.getAttribute("data-msgs"));
    form.addEventListener("submit", function(e){
      e.preventDefault();
      if(form.querySelector(".hp input").value) return;
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true; status.className = "f-status"; status.textContent = msgs.sending;
      var data = {}; new FormData(form).forEach(function(v, k){ data[k] = v; });
      fetch(form.action, {method:"POST", headers:{"Content-Type":"application/json","Accept":"application/json"}, body: JSON.stringify(data)})
        .then(function(r){ return r.json().then(function(j){ return {ok: r.ok && String(j.success) === "true", j: j}; }); })
        .then(function(res){
          if(res.ok){ status.className = "f-status ok"; status.textContent = msgs.sent; form.reset(); }
          else throw new Error("send");
        })
        .catch(function(){
          status.className = "f-status err"; status.innerHTML = msgs.failed;
          var a = status.querySelector("a");
          if(a){ a.href = "mailto:" + form.getAttribute("data-mail") + "?subject=" + encodeURIComponent((data.konu || "Web") + " — " + (data.ad || "")) + "&body=" + encodeURIComponent((data.mesaj || "") + "\n\n" + (data.ad || "") + " · " + (data.email || "") + " · " + (data.telefon || "")); }
        })
        .finally(function(){ btn.disabled = false; });
    });
  }
})();
