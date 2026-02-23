﻿// ========= 設定 =========
var THUMB = 48;
var LABEL_H = 16;
var CELL_GAP = 8;
var STEPS_MAIN  = 200;
var STEPS_THUMB = 60;

var SLOPE_EPS = 0.001, SLOPE_MAX = 100.0;
var SPEED_MIN = 0.001, SPEED_MAX = 200000;

// ========= プリセット配列 =========
var ALL_PRESETS = [];
var CUSTOM_PRESET_FILE_NAME = "FlowLite_CustomPresets.json";
var CUSTOM_PRESET_FOLDER = new File($.fileName).parent.fullName + "/";
var CUSTOM_FILE_PATH = CUSTOM_PRESET_FOLDER + CUSTOM_PRESET_FILE_NAME;

// ========= JSONフォールバック =========
if (typeof JSON === "undefined") {
  var JSON = {};
}
if (!JSON.parse) {
  JSON.parse = function(str){ return eval("(" + str + ")"); };
}
if (!JSON.stringify) {
  JSON.stringify = function(obj){
    try { return obj.toSource(); }
    catch(e) { return String(obj); }
  };
}

// ========= 共通ユーティリティ =========
function bez(t,P0,C1,C2,P3){
  var u=1-t,tt=t*t,uu=u*u;
  return[
    uu*u*P0[0]+3*uu*t*C1[0]+3*u*tt*C2[0]+tt*t*P3[0],
    uu*u*P0[1]+3*uu*t*C1[1]+3*u*tt*C2[1]+tt*t*P3[1]
  ];
}

function mapXY(x,y,W,H,yMin,yMax){
  var px=x*W,ny=(y-yMin)/(yMax-yMin),py=(1-ny)*H;
  return[px,py];
}

function smartYRange(points){
  var yMin=0, yMax=1;
  
  if(points && points.length > 0){
    for(var i=0; i<points.length; i++){
      yMin = Math.min(yMin, points[i].value);
      yMax = Math.max(yMax, points[i].value);
    }
  }
  
  var m=(yMax-yMin)*0.12+0.05;
  yMin-=m; yMax+=m;
  if(Math.abs(yMax-yMin)<1e-6){yMin-=0.5;yMax+=0.5;}
  return{min:yMin,max:yMax};
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function toArr(v){return (v instanceof Array)?v.slice():[v];}
function sgn(v){return (v>=0)?1:-1;}

// ========= 現在のタブを保持するグローバル変数 =========
var currentCatKey = "Bezier"; // 既定のタブ
