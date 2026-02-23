﻿﻿// ========= プリセット読み込み =========
if (typeof ALL_PRESETS === "undefined") {
  var ALL_PRESETS = [];
}
function loadPresets(subFolderPath){ // ★引数 (subFolderPath) を受け取る
  
  // ★渡されたパスを使って json のフルパスを生成
  var presetsFile = new File(subFolderPath + "curve_presets.json");
  
  if(!presetsFile.exists){
    alert("プリセットファイルが見つかりません:\n" + presetsFile.fullName + "\n\nAE_FlowLite_jsx フォルダ内に curve_presets.json を配置してください。");
    return false;
  }
  
  try{
    presetsFile.open("r");
    var jsonStr = presetsFile.read();
    presetsFile.close();
    
    var data = eval("(" + jsonStr + ")");

    // --- Spring 読み込み ---
    if (data.spring){
      for (var i=0; i<data.spring.length; i++){
        var p = data.spring[i];
        if (p.linear){ 
          ALL_PRESETS.push({
            id: p.id, name: p.name, category: "Spring", dir: p.dir,
            type: "linear", linear: p.linear
          });
        } else if (p.m!=null || p.k!=null || p.c!=null || p.mass!=null || p.stiffness!=null || p.damping!=null){
          ALL_PRESETS.push({
            id: p.id, name: p.name, category: "Spring", dir: p.dir,
            type: "spring",
            m: (p.m!=null)? p.m : (p.mass!=null? p.mass : 1.0),
            k: (p.k!=null)? p.k : (p.stiffness!=null? p.stiffness : 30),
            c: (p.c!=null)? p.c : (p.damping!=null? p.damping : 50)
          });
        }
      }
    }
    // Bezierプリセット
    if(data.bezier){
      for(var i=0; i<data.bezier.length; i++){
        var p = data.bezier[i];
        ALL_PRESETS.push({
          id: p.id,
          name: p.name,
          category: "Bezier",
          dir: p.dir,
          type: "bezier",
          x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2
        });
      }
    }
    // その他のカテゴリ
    var categories = [
      {key:"bounce", name:"Bounce"},
      {key:"wiggle", name:"Wiggle"},
      {key:"overshoot", name:"Overshoot"}
    ];
    for(var c=0; c<categories.length; c++){
      var cat = categories[c];
      if(data[cat.key]){
        for(var i=0; i<data[cat.key].length; i++){
          var p = data[cat.key][i];
          // ★ Bounce専用：B / c
          if (cat.key === "bounce" &&
              (p.B!=null || p.c!=null || p.bounces!=null || p.damping!=null)){
            ALL_PRESETS.push({
              id: p.id,
              name: p.name,
              category: cat.name,
              dir: p.dir,
              type: "bounce",
              B: (p.B!=null) ? p.B :
                 (p.bounces!=null ? p.bounces : 3.0),
              c: (p.c!=null) ? p.c :
                 (p.damping!=null ? p.damping : 25.0)
            });
          }
          // ★ Wiggle専用：W / D
          // ここで JSON の w / c も受け付けるように拡張
          else if (cat.key === "wiggle" &&
                   (p.W!=null || p.D!=null || p.wiggles!=null || p.damping!=null || p.w!=null || p.c!=null)){
            ALL_PRESETS.push({
              id: p.id, name: p.name, category: cat.name, dir: p.dir,
              type: "wiggle", // ★ 新しいタイプ
              // 優先順位: W -> w -> wiggles
              W: (p.W!=null) ? p.W :
                 (p.w!=null) ? p.w :
                 (p.wiggles!=null ? p.wiggles : 3.0),
              // 優先順位: D -> c -> damping
              D: (p.D!=null) ? p.D :
                 (p.c!=null) ? p.c :
                 (p.damping!=null ? p.damping : 25.0)
            });
          }
          // ★ Overshoot専用：M / c (C, Damping でも可)
          else if (cat.key === "overshoot" &&
              (p.M!=null || p.c!=null || p.Mass!=null || p.C!=null || p.Damping!=null)){
            ALL_PRESETS.push({
              id: p.id, name: p.name, category: cat.name, dir: p.dir,
              type: "overshoot", // ★ 新タイプ
              M: (p.M!=null) ? p.M :
                (p.Mass!=null ? p.Mass :
                (p.m!=null ? p.m : 1.0)),
              c: (p.c!=null) ? p.c : (p.C!=null ? p.C : (p.Damping!=null ? p.Damping : 50.0))
            });
          }
          // linearフィールド
          else if(p.linear){
            ALL_PRESETS.push({
              id: p.id,
              name: p.name,
              category: cat.name,
              dir: p.dir,
              type: "linear",
              linear: p.linear
            });
          }
          else{
            ALL_PRESETS.push({
              id: p.id,
              name: p.name,
              category: cat.name,
              dir: p.dir,
              type: "bezier",
              x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2
            });
          }
        }
      }
    }

    // Flicker プリセット
    if (data.flicker_anm){
      for (var i=0; i<data.flicker_anm.length; i++){
        var p = data.flicker_anm[i];
        ALL_PRESETS.push({
          id: p.id,
          name: p.name,
          category: "Flicker",
          dir: p.dir,
          type: "flicker",
          step: p.step
        });
      }
    }
    
    // デバッグ情報 (サイレント)
    var counts = {Bezier:0, Spring:0, Bounce:0, Wiggle:0, Overshoot:0, Flicker:0};
    for(var i=0; i<ALL_PRESETS.length; i++){
      var cat = ALL_PRESETS[i].category;
      if(counts[cat] !== undefined) counts[cat]++;
    }

    return true;
  }catch(e){
    alert("プリセット読み込みエラー:\n" + e.toString());
    return false;
  }
}


// ========= Linear()パース =========
// (中身は省略 ... 元のコードと同じ)
function parseLinear(linearStr){
  var points = [];
  var parts = linearStr.split(",");
  for(var i=0; i<parts.length; i++){
    var part = parts[i].replace(/^\s+|\s+$/g, ""); // trim
    if(part === "") continue;
    var tokens = part.split(/\s+/);
    var value = parseFloat(tokens[0]);
    var percent = 0;
    if(tokens.length > 1){
      percent = parseFloat(tokens[1].replace("%", ""));
    }else{
      percent = (i === 0) ? 0 : 100;
    }
    points.push({
      value: value,
      percent: percent / 100.0
    });
  }
  points.sort(function(a,b){ return a.percent - b.percent; });
  return points;
}


// (中身は省略 ... 元のSpring用関数群と同じ)
// ===== Spring プレビュー用サンプラ（m,k,c → 点列） =====
function _springFitScale(m,k,z,segDur){
  m = Math.max(0.05, m); k = Math.max(0, k);
  var w0 = Math.sqrt(k/m); if (w0 < 1e-6) return 1.0;
  var tol = 0.002; // 0.2%
  var s = (z < 1) ? (Math.log(1/tol)/(Math.max(1e-6,z)*w0*segDur))
                  : (Math.log(1/tol)/(w0*segDur));
  return Math.max(1.0, s);
}
// ===== Spring プレビュー用（Mass/Stiffness/Damping → 2次遅れ系） =====
function _springEval01(u, m, k, c, segDur){
  function _C(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function _springParams(mass, stiff, damp){
    mass = Math.max(0.01, mass);
    var wn = 6.0 + stiff * 0.62 + mass * 0.18;
    var zeta = 0.92 - stiff * 0.0038 - mass * 0.115 + damp * 0.011;
    wn   = _C(wn,   1,   200);
    zeta = _C(zeta, 0.02, 3.0);
    return { wn: wn, zeta: zeta };
  }
  function _springStep(u, wn, zeta){
    u = _C(u, 0, 1);
    var t = u;
    if (zeta < 1.0){
      zeta = Math.max(0.02, zeta);
      var wd      = wn * Math.sqrt(1 - zeta*zeta);
      var expTerm = Math.exp(-zeta * wn * t);
      var cosTerm = Math.cos(wd * t);
      var sinTerm = Math.sin(wd * t);
      var A       = zeta / Math.sqrt(1 - zeta*zeta);
      var y = 1 - expTerm * (cosTerm + A * sinTerm);
      var tailStart = 0.94 + 0.05 * _C(zeta - 0.45, 0, 1);
      if (u > tailStart){
        var tu = (u - tailStart) / Math.max(1e-6, 1.0 - tailStart);
        var s = tu * tu * (3 - 2 * tu);
        var settlePow = 0.75;
        y = 1.0 - (1.0 - y) * Math.pow(1.0 - s, settlePow);
      }

      return _C(y, -1, 2);
    }else{
      var zz      = Math.min(zeta, 3.0);
      var expTerm = Math.exp(-wn * zz * t);
      var y       = 1 - expTerm * (1 + wn * t);
      var tailStart2 = 0.94 + 0.05 * _C(zeta - 0.45, 0, 1);
      if (u > tailStart2){
        var tu2 = (u - tailStart2) / Math.max(1e-6, 1.0 - tailStart2);
        var s2 = tu2 * tu2 * (3 - 2 * tu2);
        y = 1.0 - (1.0 - y) * Math.pow(1.0 - s2, 0.75);
      }
      return _C(y, -1, 2);
    }
  }
  var p = _springParams(m, k, c);
  return _springStep(u, p.wn, p.zeta);
}
function sampleSpringPointsForPreview(m,k,c, steps){
  steps = steps || 100;
  var segDur = 1.0;
  var pts = [];
  for (var i=0; i<=steps; i++){
    var u = i/steps;
    pts.push({ percent: u, value: _springEval01(u, m, k, c, segDur) });
  }
  return pts;
}

// ===== Bounce A プレビュー用（B / D → 点列） =====
function sampleBouncePointsForPreview(B, D, steps){
  steps = steps || 100;

  function C(v,a,b){ return Math.max(a, Math.min(b, v)); }

  B = Math.max(1, B);
  D = C(D, 0, 100);
  var d = D / 100.0;

  var pts = [];
  for (var i=0; i<=steps; i++){
    var u = i/steps;
    u = C(u, 0, 1);

    var base = 1 - Math.pow(1 - u, 2);
    var freq = Math.PI * (B + 0.5);
    var osc  = Math.abs(Math.sin(freq * u));

    var envPow = 0.5 + 2.5 * d;
    var env    = Math.pow(1 - u, envPow);

    var amp = 0.3 + 0.9 * (1 - d);
    var y   = base - amp * env * osc;

    y = C(y, -0.5, 1.05);
    pts.push({ percent:u, value:y });
  }
  return pts;
}

// ===== ★ Bounce B プレビュー用（B / D → 点列） を追加 =====
function sampleBounceBPointsForPreview(B, D, steps){
  steps = steps || 100;

  function C(v,a,b){ return Math.max(a, Math.min(b, v)); }

  B = Math.max(1, Math.round(B));
  D = C(D, 0, 100);
  var d = D / 100.0;
  var R = Math.max(0.1, 0.95 - d * 0.4);

  var sumT = 1.0;
  for (var n = 1; n <= B; n++){
    sumT += 2 * Math.pow(R, n);
  }

  var pts = [];
  for (var i=0; i<=steps; i++){
    var u = C(i/steps, 0, 1);

    if (u === 0.0) { pts.push({ percent:u, value:0.0 }); continue; }
    if (u === 1.0) { pts.push({ percent:u, value:1.0 }); continue; }

    var t_abs = u * sumT;
    var y = 1.0;

    if (t_abs <= 1.0){
      y = t_abs * t_abs;
    }else{
      var current_t = 1.0;
      for (var bIdx = 1; bIdx <= B; bIdx++){
        var T_i = 2 * Math.pow(R, bIdx);
        if (t_abs <= current_t + T_i || bIdx === B){
          var tau = (t_abs - current_t) / T_i;
          var H_i = Math.pow(R, bIdx * 2);
          var h = 4 * H_i * tau * (1 - tau);
          y = 1.0 - h;
          if (bIdx === B){
            var s = tau * tau * (3 - 2 * tau);
            var settlePow = 1.4 + 2.0 * d;
            y = 1.0 - (1.0 - y) * Math.pow(1.0 - s, settlePow);
          }
          break;
        }
        current_t += T_i;
      }
    }

    pts.push({ percent:u, value:C(y, 0.0, 1.05) });
  }
  return pts;
}

// ===== Wiggle プレビュー用（W / D → 点列） =====
function sampleWigglePointsForPreview(W, D, steps){
  steps = steps || 100;

  function C(v,a,b){ return Math.max(a, Math.min(b, v)); }

  var wiggles = Math.max(0.1, (W != null) ? W : 3.0);
  var damp    = C((D != null) ? D : 25.0, 0, 100) * 0.05;
  var freq    = wiggles * 2 * Math.PI;

  var pts = [];
  for (var i=0; i<=steps; i++){
    var u = C(i/steps, 0, 1);
    var env = Math.exp(-damp * u);
    var val = (u === 0.0 || u === 1.0) ? 0.0 : env * Math.sin(freq * u);
    pts.push({ percent:u, value:val });
  }
  return pts;
}
