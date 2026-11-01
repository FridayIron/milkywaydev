/**
 * 数字时序动画。waves 里每个字符是一个时间格：
 * 1 高、0 低、z 高阻（虚线中电平）、x 不确定。
 * 各信号长度必须一致。
 */
(function () {
  function parseSpec(node) {
    var raw = node.textContent || "";
    return JSON.parse(raw);
  }

  function draw(canvas, spec, cursor) {
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 920;
    var rows = spec.waves.length;
    var cssH = 36 + rows * 46 + (spec.markers ? 22 : 8);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.height = cssH + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#0e1622";
    ctx.fillRect(0, 0, cssW, cssH);

    var left = 78;
    var right = 16;
    var n = spec.waves[0].length;
    var slot = (cssW - left - right) / n;
    var top0 = 28;

    ctx.fillStyle = "#9fb3c8";
    ctx.font = "13px Segoe UI, Microsoft YaHei, sans-serif";
    ctx.fillText(spec.title || "", 12, 18);

    spec.waves.forEach(function (wave, i) {
      var yMid = top0 + i * 46 + 16;
      var high = yMid - 12;
      var low = yMid + 12;
      ctx.fillStyle = "#c5d4e4";
      ctx.font = "13px Consolas, monospace";
      ctx.fillText(spec.labels[i], 10, yMid + 4);
      ctx.strokeStyle = "#3ecf8e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var k = 0; k < wave.length; k++) {
        var ch = wave[k];
        var x0 = left + k * slot;
        var x1 = x0 + slot;
        var y = ch === "1" ? high : ch === "0" ? low : yMid;
        if (k === 0) ctx.moveTo(x0, y);
        else {
          var prev = wave[k - 1];
          var yPrev = prev === "1" ? high : prev === "0" ? low : yMid;
          if (yPrev !== y) {
            ctx.lineTo(x0, yPrev);
            ctx.lineTo(x0, y);
          }
        }
        if (ch === "z" || ch === "x") {
          ctx.stroke();
          ctx.save();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = ch === "x" ? "#e6a23c" : "#7fdbff";
          ctx.beginPath();
          ctx.moveTo(x0, yMid);
          ctx.lineTo(x1, yMid);
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = "#3ecf8e";
          ctx.beginPath();
          ctx.moveTo(x1, y);
        } else {
          ctx.lineTo(x1, y);
        }
      }
      ctx.stroke();
    });

    if (spec.markers) {
      ctx.font = "12px Segoe UI, Microsoft YaHei, sans-serif";
      spec.markers.forEach(function (m) {
        var x = left + m.at * slot + 2;
        ctx.fillStyle = "#f0c36a";
        ctx.fillText(m.text, x, top0 + rows * 46 + 8);
      });
    }

    if (cursor >= 0) {
      var cx = left + cursor * slot;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 24);
      ctx.lineTo(cx, cssH - 8);
      ctx.stroke();
    }
  }

  function mount(canvas, spec) {
    var cursor = 0;
    var n = spec.waves[0].length;
    var timer = null;
    function frame() {
      draw(canvas, spec, cursor);
      cursor = (cursor + 1) % n;
    }
    frame();
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timer = setInterval(frame, spec.stepMs || 280);
    }
    window.addEventListener("resize", function () {
      draw(canvas, spec, cursor);
    });
    canvas.addEventListener("click", function () {
      if (timer) {
        clearInterval(timer);
        timer = null;
      } else if (!reduce) {
        timer = setInterval(frame, spec.stepMs || 280);
      }
    });
  }

  function boot() {
    var nodes = document.querySelectorAll("script.wave-spec");
    nodes.forEach(function (node) {
      var canvas = node.previousElementSibling;
      if (!canvas || canvas.tagName !== "CANVAS") return;
      try {
        mount(canvas, parseSpec(node));
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/* 内嵌高度上报（同目录 embed.js，部分页面只引了 common.js） */
(function () {
  if (document.querySelector('script[src*="embed.js"]')) return;
  var s = document.createElement("script");
  s.src = (function () {
    var cur = document.currentScript && document.currentScript.src;
    if (cur) return cur.replace(/common\.js(?:\?.*)?$/, "embed.js?v=3");
    return "assets/embed.js?v=3";
  })();
  s.defer = true;
  document.head.appendChild(s);
})();
