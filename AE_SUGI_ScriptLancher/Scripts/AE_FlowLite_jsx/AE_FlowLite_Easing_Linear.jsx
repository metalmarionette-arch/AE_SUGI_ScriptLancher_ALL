﻿// ========= Linear() を「エクスプレッション適用」に変更 =========

// linear() 文字列 → [x0,y0, x1,y1, ...] のフラット配列にして文字列化
function buildCurveArrayStringFromLinear(linearStr){
  var pts = parseLinear(linearStr); // 0-1 正規化済みの {percent, value}[]
  if (!pts || pts.length < 2) return "[0,0, 1,1]";
  var out = [];
  for (var i=0; i<pts.length; i++){
    out.push( +(pts[i].percent.toFixed(6)) );
    out.push( +(pts[i].value  .toFixed(6)) );
  }
  return "[" + out.join(", ") + "]";
}

// 上の配列文字列を埋め込んだ汎用エクスプレッションを生成
function buildLookupExpression(curveArrayStr){
  // ベクトル/スカラー両対応。キー2個未満なら元の値。
  // キー区間を特定し、0-1 に正規化した t を curve lookup で f に変換して補間。
  var expr =
    "var curve = " + curveArrayStr + ";\n" +
    "function lookupCurve(t){\n" +
    "  function clamp(v,a,b){return Math.max(a, Math.min(b, v));}\n" +
    "  t = clamp(t, 0, 1);\n" +
    "  if (curve.length < 4) return t;\n" +
    "  if (t <= curve[0]) return curve[1];\n" +
    "  var last = curve.length - 2;\n" +
    "  if (t >= curve[last]) return curve[last+1];\n" +
    "  for (var i=0; i<curve.length-3; i+=2){\n" +
    "    var x1 = curve[i],   y1 = curve[i+1];\n" +
    "    var x2 = curve[i+2], y2 = curve[i+3];\n" +
    "    if (t <= x2){\n" +
    "      var r = (t - x1) / Math.max(1e-6, (x2 - x1));\n" +
    "      return y1 + (y2 - y1) * r;\n" +
    "    }\n" +
    "  }\n" +
    "  return curve[last+1];\n" +
    "}\n" +
    "\n" +
    "if (numKeys < 2){\n" +
    "  value;\n" +
    "}else{\n" +
    "  var k = nearestKey(time).index;\n" +
    "  if (time < key(k).time) k--;\n" +
    "  if (k < 1 || k >= numKeys){ value; }\n" +
    "  else{\n" +
    "    var t1 = key(k).time,   t2 = key(k+1).time;\n" +
    "    var tt = (time - t1) / Math.max(1e-6, (t2 - t1));\n" +
    "    var f  = lookupCurve(tt); // 0-1 をカーブで描き換え（>1や<0も許容）\n" +
    "    var v1 = key(k).value;\n" +
    "    var v2 = key(k+1).value;\n" +
    "    if (v1 instanceof Array || v2 instanceof Array){\n" +
    "      var a = (v1 instanceof Array)? v1 : [v1];\n" +
    "      var b = (v2 instanceof Array)? v2 : [v2];\n" +
    "      var n = Math.max(a.length, b.length);\n" +
    "      var out = [];\n" +
    "      for (var i=0;i<n;i++){\n" +
    "        var A = (a[i]!==undefined)? a[i] : a[a.length-1];\n" +
    "        var B = (b[i]!==undefined)? b[i] : b[b.length-1];\n" +
    "        out.push( A + (B - A) * f );\n" +
    "      }\n" +
    "      out;\n" +
    "    }else{\n" +
    "      v1 + (v2 - v1) * f;\n" +
    "    }\n" +
    "  }\n" +
    "}\n";
  return expr;
}

// 旧：多段キー生成 → 新：エクスプレッション適用
function applyLinearEasing(preset, props){
  if (preset && preset.applyMode === "keyframe"){
    var points = parseLinear(preset.linear);
    for (var i=0; i<props.length; i++){
      var prop = props[i];
      if (!prop || prop.numKeys < 2) continue;
      var pairs = getKeyPairs(prop);
      for (var p=0; p<pairs.length; p++){
        applyCurveKeyframesForPair(prop, pairs[p][0], pairs[p][1], points);
      }
    }
  } else {
    // linear 文字列をカーブ配列化して、式に埋め込む
    var curveStr = buildCurveArrayStringFromLinear(preset.linear);
    var expr = buildLookupExpression(curveStr);

    for (var i=0; i<props.length; i++){
      applyLinearExpressionToProperty(props[i], expr);
    }
  }
}

// 対象プロパティに式を適用（選択区間の中間キーは削除・端はLINEAR推奨）
function applyLinearExpressionToProperty(prop, expr){
  // 1) 2キー未満は対象外
  if (!prop || prop.numKeys < 2) return;

  // 2) 選択キー間の“中間キー”は削除
  //    何も選択していない場合は全区間を対象
  var pairs = [];
  var sel = [];
  for (var k=1; k<=prop.numKeys; k++) if (prop.keySelected(k)) sel.push(k);
  if (sel.length >= 2){
    sel.sort(function(a,b){ return prop.keyTime(a)-prop.keyTime(b); });
    for (var i=0; i<sel.length-1; i++) pairs.push([sel[i], sel[i+1]]);
  }else{
    for (var i=1; i<=prop.numKeys-1; i++) pairs.push([i, i+1]);
  }

  try{
    for (var p=0; p<pairs.length; p++){
      var kL = pairs[p][0], kR = pairs[p][1];
      var tL = prop.keyTime(kL), tR = prop.keyTime(kR);

      // 内側の既存キーを掃除（降順で削除）
      var toDelete = [];
      for (var kk=1; kk<=prop.numKeys; kk++){
        var t = prop.keyTime(kk);
        if (t > tL && t < tR) toDelete.push(kk);
      }
      for (var d=toDelete.length-1; d>=0; d--) try{ prop.removeKey(toDelete[d]); }catch(_){}

      // 端キーはリニアに（見た目の基準が安定）
      try{
        prop.setInterpolationTypeAtKey(kL, KeyframeInterpolationType.LINEAR);
        prop.setInterpolationTypeAtKey(kR, KeyframeInterpolationType.LINEAR);
      }catch(_){}
    }

    // 3) エクスプレッションをセット（既存式は上書き）
    prop.expression = expr;

  }catch(e){
    alert("Expression apply error: " + e);
  }
}
