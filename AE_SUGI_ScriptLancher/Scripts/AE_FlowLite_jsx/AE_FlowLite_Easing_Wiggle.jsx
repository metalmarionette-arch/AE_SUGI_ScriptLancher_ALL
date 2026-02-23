﻿// ========= Wiggle (W, D) 用：式の生成 =========
// ・奇数番目のキー(1, 3, 5...)から始まる区間 (1->2, 3->4) では Wiggle
// ・偶数番目のキー(2, 4, 6...)から始まる区間 (2->3, 4->5) では通常のリニア補間
// ・「2,4,6…のキーのちょうどそのフレームだけ」ひとつ前のキーの値を返す
function buildWiggleExpression(){
  var lines = [];

  lines.push("function C(v,a,b){ return Math.max(a, Math.min(b, v)); }");
  lines.push("");
  lines.push("function dampedSin(u, W, D){");
  lines.push("  u = C(u, 0, 1);");
  lines.push("  if (u === 0.0 || u === 1.0) return 0.0;");
  lines.push("  var w_map = Math.max(0.1, W) * 2 * Math.PI;");
  lines.push("  var d_map = C(D, 0, 100) * 0.05;");
  lines.push("  return Math.exp(-d_map * u) * Math.sin(w_map * u);");
  lines.push("}");
  lines.push("");
  lines.push("var kNum = numKeys;");
  lines.push("if (kNum < 2){");
  lines.push("  value;");
  lines.push("}else{");
  lines.push("  var t = time;");
  lines.push("  var i = nearestKey(t).index;");
  lines.push("  if (t < key(i).time) i--;");
  lines.push("");
  lines.push("  // 1フレームの誤差を吸収するための許容範囲");
  lines.push("  var eps = thisComp.frameDuration * 0.25;");
  lines.push("");
  lines.push("  // 偶数キーのタイミングではひとつ前のキーの値を使う");
  lines.push("  if (i >= 2 && (i % 2) === 0 && Math.abs(t - key(i).time) <= eps){");
  lines.push("    // key(i) は 2,4,6... なので、常にひとつ前は奇数キー");
  lines.push("    key(i-1).value;");
  lines.push("  }else if (i < 1 || i >= kNum){");
  lines.push("    // 範囲外は通常どおり");
  lines.push("    value;");
  lines.push("  }else if (i % 2 == 1){");
  lines.push("    // 奇数キー区間: Wiggle (1->2, 3->4, ...)");
  lines.push("    var k1 = key(i), k2 = key(i+1);");
  lines.push("    var t1 = k1.time, t2 = k2.time;");
  lines.push("    var u  = (t - t1) / Math.max(1e-6, (t2 - t1));");
  lines.push("    u = C(u, 0, 1);");
  lines.push("    var v1 = k1.value, v2 = k2.value;");
  lines.push("    var W  = effect(\"Wiggle W\")(\"スライダー\");");
  lines.push("    var D  = effect(\"Wiggle Damping\")(\"スライダー\");");
  lines.push("    var f  = dampedSin(u, W, D);");
  lines.push("");
  lines.push("    if (v1 instanceof Array || v2 instanceof Array){");
  lines.push("      var a = (v1 instanceof Array) ? v1 : [v1];");
  lines.push("      var b = (v2 instanceof Array) ? v2 : [v2];");
  lines.push("      var n = Math.max(a.length, b.length);");
  lines.push("      var out = [];");
  lines.push("      for (var j = 0; j < n; j++){");
  lines.push("        var A = (a[j] !== undefined) ? a[j] : a[a.length-1];");
  lines.push("        var B = (b[j] !== undefined) ? b[j] : b[b.length-1];");
  lines.push("        out.push( A + (B - A) * f );");
  lines.push("      }");
  lines.push("      out;");
  lines.push("    }else{");
  lines.push("      v1 + (v2 - v1) * f;");
  lines.push("    }");
  lines.push("  }else{");
  lines.push("    // 偶数キー区間: 通常のリニア補間 (2->3, 4->5, ...)");
  lines.push("    var k1 = key(i), k2 = key(i+1);");
  lines.push("    var t1 = k1.time, t2 = k2.time;");
  lines.push("    var u  = (t - t1) / Math.max(1e-6, (t2 - t1));");
  lines.push("    u = C(u, 0, 1);");
  lines.push("    var v1 = k1.value, v2 = k2.value;");
  lines.push("");
  lines.push("    if (v1 instanceof Array || v2 instanceof Array){");
  lines.push("      var a = (v1 instanceof Array) ? v1 : [v1];");
  lines.push("      var b = (v2 instanceof Array) ? v2 : [v2];");
  lines.push("      var n = Math.max(a.length, b.length);");
  lines.push("      var out = [];");
  lines.push("      for (var j = 0; j < n; j++){");
  lines.push("        var A = (a[j] !== undefined) ? a[j] : a[a.length-1];");
  lines.push("        var B = (b[j] !== undefined) ? b[j] : b[b.length-1];");
  lines.push("        out.push( A + (B - A) * u );");
  lines.push("      }");
  lines.push("      out;");
  lines.push("    }else{");
  lines.push("      v1 + (v2 - v1) * u;");
  lines.push("    }");
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
}

 
 
// ========= Wiggle (W, D) 用：式を適用 =========
function applyWiggleEasing(preset, props){
  if(!props || props.length === 0){
    alert("キーを2つ以上持つプロパティを選択してください。");
    return;
  }

  if (preset && preset.applyMode === "keyframe"){
    var W = (preset.W != null) ? preset.W : 3.0;
    var D = (preset.D != null) ? preset.D : 25.0;
    for (var i=0; i<props.length; i++){
      var pr = props[i];
      if (!pr || pr.numKeys < 2) continue;
      var pairs = getKeyPairs(pr);
      for (var p=0; p<pairs.length; p++){
        var tL = pr.keyTime(pairs[p][0]);
        var tR = pr.keyTime(pairs[p][1]);
        var steps = getCurveStepsForPair(tL, tR);
        var points = sampleWigglePointsForPreview(W, D, steps);
        applyCurveKeyframesForPair(pr, pairs[p][0], pairs[p][1], points);
      }
    }
    return;
  }

  var expr = buildWiggleExpression();

  for (var i = 0; i < props.length; i++){
    var pr  = props[i];
    var lyr = pr.propertyGroup(pr.propertyDepth);

    // スライダーの用意（なければ作る／あれば更新）
    var fx = lyr.property("ADBE Effect Parade");
    if (!fx) fx = lyr.addProperty("ADBE Effect Parade");

    function ensureSlider(name, val){
      var p = fx.property(name);
      if(!p){
        p = fx.addProperty("ADBE Slider Control");
        p.name = name;
      }
      p.property(1).setValue(val);
      return p.property(1);
    }

    // プリセットの W / D をデフォルト値として反映
    var W = (preset.W != null) ? preset.W : 3.0;
    var D = (preset.D != null) ? preset.D : 25.0;

    ensureSlider("Wiggle W",       W);
    ensureSlider("Wiggle Damping", D);

    // 式の適用（既存式は上書き）
    pr.expression = expr;
  }
}
