/* UK On Wheels - pickup photo reference guides (classic script). Exposes window.PickupPhotoGuides.
   Reference illustrations only: monochrome SVG, no evidence metadata, no events, no nested spans. */
(function(root){
"use strict";
var L="#c9ccd0",M="#8d9298",D="#3d4248",BG="#eef0f2";
var DAMAGE_RE=/^Damage photo [1-9][0-9]*$/;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function svg(body){return '<svg class="pickupPhotoGuide" viewBox="0 0 320 160" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="320" height="160" rx="10" fill="'+BG+'"/>'+body+'</svg>'}
function txt(x,y,s,a){return '<text x="'+x+'" y="'+y+'" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="'+D+'" text-anchor="'+(a||"middle")+'">'+esc(s)+'</text>'}
function wheel(cx,cy,hi){return '<circle cx="'+cx+'" cy="'+cy+'" r="17" fill="'+(hi?D:M)+'"/><circle cx="'+cx+'" cy="'+cy+'" r="8" fill="'+(hi?L:BG)+'"/>'+(hi?'<circle cx="'+cx+'" cy="'+cy+'" r="25" fill="none" stroke="'+D+'" stroke-width="3" stroke-dasharray="6 4"/>':'')}
/* Side profile. faceLeft: car front points left. hiBody / hiWheel: "front"|"rear" */
function side(faceLeft,hiBody,hiWheel){
 var g='<g'+(faceLeft?'':' transform="translate(320 0) scale(-1 1)"')+'>';
 g+='<path d="M48 112 L50 88 Q54 78 72 76 L104 72 L134 48 Q140 44 150 44 L212 44 Q222 44 230 52 L254 74 L270 78 Q276 80 276 90 L276 112 Z" fill="'+(hiBody?M:L)+'" stroke="'+D+'" stroke-width="'+(hiBody?3:1.5)+'"/>';
 g+='<path d="M112 72 L138 52 L170 52 L170 72 Z M178 52 L210 52 L232 72 L178 72 Z" fill="'+BG+'" stroke="'+D+'" stroke-width="1.2"/>';
 g+='<rect x="50" y="86" width="10" height="6" fill="'+D+'"/><rect x="266" y="86" width="9" height="8" fill="'+M+'" stroke="'+D+'"/>';
 g+=wheel(92,112,hiWheel==="front")+wheel(236,112,hiWheel==="rear")+'</g>';
 var fx=faceLeft?22:298;
 g+='<path d="'+(faceLeft?'M34 30 L14 30 M22 23 L14 30 L22 37':'M286 30 L306 30 M298 23 L306 30 L298 37')+'" stroke="'+D+'" stroke-width="2.5" fill="none"/>'+txt(fx+(faceLeft?20:-20),25,"FRONT",faceLeft?"start":"end");
 return g;
}
function front(){return '<path d="M90 120 L94 86 Q100 70 118 66 L132 40 Q136 34 146 34 L174 34 Q184 34 188 40 L202 66 Q220 70 226 86 L230 120 Z" fill="'+M+'" stroke="'+D+'" stroke-width="3"/><path d="M136 44 L184 44 L196 66 L124 66 Z" fill="'+BG+'" stroke="'+D+'"/><ellipse cx="112" cy="88" rx="12" ry="7" fill="'+BG+'" stroke="'+D+'" stroke-width="2"/><ellipse cx="208" cy="88" rx="12" ry="7" fill="'+BG+'" stroke="'+D+'" stroke-width="2"/><rect x="138" y="82" width="44" height="14" rx="3" fill="'+D+'"/><path d="M142 86h36M142 90h36" stroke="'+L+'"/><rect x="140" y="104" width="40" height="10" fill="'+BG+'" stroke="'+D+'"/><rect x="96" y="120" width="20" height="14" fill="'+D+'"/><rect x="204" y="120" width="20" height="14" fill="'+D+'"/>'+txt(272,40,"FRONT")+txt(272,54,"grille + plate")}
function back(){return '<path d="M90 120 L92 84 Q96 72 116 68 L130 40 Q134 34 144 34 L176 34 Q186 34 190 40 L204 68 Q224 72 228 84 L230 120 Z" fill="'+M+'" stroke="'+D+'" stroke-width="3"/><path d="M138 42 L182 42 L192 64 L128 64 Z" fill="'+BG+'" stroke="'+D+'"/><rect x="98" y="78" width="26" height="14" rx="2" fill="'+D+'"/><rect x="196" y="78" width="26" height="14" rx="2" fill="'+D+'"/><path d="M124 85 L196 85" stroke="'+D+'" stroke-width="2"/><rect x="138" y="96" width="44" height="11" fill="'+BG+'" stroke="'+D+'"/><rect x="96" y="120" width="20" height="14" fill="'+D+'"/><rect x="204" y="120" width="20" height="14" fill="'+D+'"/><circle cx="214" cy="116" r="3" fill="'+D+'"/>'+txt(272,40,"REAR")+txt(272,54,"lights + boot")}
function doc(title,lines){var s='<rect x="104" y="18" width="112" height="128" rx="5" fill="'+L+'" stroke="'+D+'" stroke-width="2.5"/><rect x="104" y="18" width="112" height="24" rx="5" fill="'+D+'"/>'+'<text x="160" y="35" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="'+BG+'" text-anchor="middle">'+esc(title)+'</text>';return s+lines}
var A={
 front:function(){return front()},
 back:function(){return back()},
 driver:function(){return side(false,true)+txt(160,148,"RIGHT-HAND SIDE")},
 passenger:function(){return side(true,true)+txt(160,148,"LEFT-HAND SIDE")},
 dfw:function(){return side(false,false,"front")+txt(160,148,"RIGHT SIDE - FRONT WHEEL")},
 drw:function(){return side(false,false,"rear")+txt(160,148,"RIGHT SIDE - REAR WHEEL")},
 pfw:function(){return side(true,false,"front")+txt(160,148,"LEFT SIDE - FRONT WHEEL")},
 prw:function(){return side(true,false,"rear")+txt(160,148,"LEFT SIDE - REAR WHEEL")},
 mileage:function(){return '<path d="M30 140 Q30 40 160 34 Q290 40 290 140 Z" fill="'+L+'" stroke="'+M+'" stroke-width="2"/><circle cx="160" cy="92" r="46" fill="'+BG+'" stroke="'+D+'" stroke-width="3"/><path d="M128 120 A40 40 0 1 1 192 120" fill="none" stroke="'+M+'" stroke-width="4"/><path d="M160 92 L186 70" stroke="'+D+'" stroke-width="3"/><circle cx="160" cy="92" r="4" fill="'+D+'"/><rect x="126" y="104" width="68" height="18" rx="2" fill="'+D+'"/><text x="160" y="117" font-family="ui-monospace,monospace" font-size="12" font-weight="700" fill="'+BG+'" text-anchor="middle">048 273</text><circle cx="72" cy="100" r="22" fill="'+BG+'" stroke="'+M+'" stroke-width="2"/><circle cx="248" cy="100" r="22" fill="'+BG+'" stroke="'+M+'" stroke-width="2"/>'+txt(160,152,"ODOMETER READING")},
 exterior:function(){return '<path d="M60 118 L64 92 L120 84 L150 56 L224 56 L256 82 L282 90 L280 116 Z" fill="'+M+'" stroke="'+D+'" stroke-width="2.5"/><path d="M60 118 L40 108 L42 88 L64 92 Z" fill="'+L+'" stroke="'+D+'" stroke-width="2"/><path d="M42 88 L120 84 L150 56 L118 60 Z" fill="'+L+'" stroke="'+D+'" stroke-width="1.5"/><path d="M156 62 L218 62 L240 82 L132 84 Z" fill="'+BG+'" stroke="'+D+'"/>'+wheel(100,118)+wheel(240,118)+'<path d="M24 30 h16 M24 30 v16 M296 30 h-16 M296 30 v16 M24 146 h16 M24 146 v-16 M296 146 h-16 M296 146 v-16" stroke="'+D+'" stroke-width="2.5"/>'+txt(160,30,"WHOLE CAR IN FRAME")},
 seats:function(){return '<rect x="40" y="30" width="240" height="78" rx="18" fill="'+L+'" stroke="'+D+'" stroke-width="2.5"/><path d="M120 34 V104 M200 34 V104" stroke="'+M+'" stroke-width="2"/><rect x="50" y="18" width="40" height="18" rx="6" fill="'+M+'"/><rect x="140" y="18" width="40" height="18" rx="6" fill="'+M+'"/><rect x="230" y="18" width="40" height="18" rx="6" fill="'+M+'"/><rect x="30" y="100" width="260" height="30" rx="12" fill="'+M+'" stroke="'+D+'" stroke-width="2.5"/><path d="M84 108 v14 M236 108 v14" stroke="'+D+'" stroke-width="3"/>'+txt(160,150,"REAR BENCH + FOOTWELLS")},
 keys:function(){return '<rect x="70" y="50" width="70" height="80" rx="20" fill="'+M+'" stroke="'+D+'" stroke-width="3"/><circle cx="105" cy="75" r="9" fill="'+BG+'" stroke="'+D+'" stroke-width="2"/><circle cx="105" cy="105" r="9" fill="'+BG+'" stroke="'+D+'" stroke-width="2"/><rect x="140" y="82" width="110" height="16" fill="'+L+'" stroke="'+D+'" stroke-width="2"/><path d="M200 98 v12 h10 v-6 h10 v8 h10 v-14" fill="none" stroke="'+D+'" stroke-width="2"/><circle cx="105" cy="40" r="14" fill="none" stroke="'+D+'" stroke-width="3"/>'+txt(160,150,"ALL KEYS + FOBS")},
 cable:function(){return '<path d="M60 40 Q20 80 70 110 Q130 140 170 100 Q210 60 250 90" fill="none" stroke="'+D+'" stroke-width="7"/><rect x="40" y="22" width="40" height="28" rx="6" fill="'+M+'" stroke="'+D+'" stroke-width="2"/><circle cx="268" cy="96" r="24" fill="'+L+'" stroke="'+D+'" stroke-width="3"/><circle cx="260" cy="90" r="4" fill="'+D+'"/><circle cx="276" cy="90" r="4" fill="'+D+'"/><circle cx="268" cy="104" r="4" fill="'+D+'"/>'+txt(160,150,"CABLE + CONNECTOR")},
 spare:function(){return '<rect x="40" y="30" width="240" height="104" rx="10" fill="'+L+'" stroke="'+M+'" stroke-width="2"/><circle cx="160" cy="82" r="44" fill="'+D+'"/><circle cx="160" cy="82" r="24" fill="'+L+'"/><circle cx="160" cy="82" r="6" fill="'+D+'"/>'+txt(160,150,"BOOT FLOOR - SPARE TYRE")},
 logbook:function(){return doc("V5C",'<path d="M116 56h88M116 68h70M116 80h88M116 92h60" stroke="'+M+'" stroke-width="3"/><rect x="116" y="104" width="88" height="30" fill="'+BG+'" stroke="'+D+'" stroke-width="1.5"/><path d="M122 122h50" stroke="'+D+'" stroke-width="2"/>')+'<rect x="230" y="40" width="64" height="16" fill="'+D+'"/><text x="262" y="52" font-family="ui-monospace,monospace" font-size="10" font-weight="700" fill="'+BG+'" text-anchor="middle">AB12 CDE</text>'},
 service:function(){return '<rect x="96" y="26" width="112" height="124" rx="5" fill="'+M+'" stroke="'+D+'"/>'+doc("SERVICE",'<path d="M116 58l6 6 10-12M116 82l6 6 10-12M116 106l6 6 10-12" fill="none" stroke="'+D+'" stroke-width="3"/><path d="M142 58h60M142 82h60M142 106h60" stroke="'+M+'" stroke-width="3"/><circle cx="190" cy="128" r="12" fill="none" stroke="'+D+'" stroke-width="2.5"/>')},
 damage:function(){return '<rect x="30" y="24" width="260" height="110" rx="14" fill="'+L+'" stroke="'+M+'" stroke-width="2"/><ellipse cx="120" cy="80" rx="40" ry="24" fill="'+M+'"/><ellipse cx="114" cy="76" rx="20" ry="11" fill="'+D+'" opacity=".7"/><path d="M180 50 L262 104 M188 46 L268 98 M184 58 L240 96" stroke="'+D+'" stroke-width="3" stroke-linecap="round"/><path d="M70 40 h-14 v14 M170 40 h14 v14 M70 120 h-14 v-14 M170 120 h14 v-14" stroke="'+D+'" stroke-width="2.5" fill="none"/>'+txt(160,150,"CLOSE-UP: DENT / SCRATCH")}
};
var MAP={
 "Front of car":["front","Straight on from the front: bumper, grille, lights and number plate."],
 "Driver side":["driver","Driver side is the RIGHT-hand side in UK cars. Whole side, front to back."],
 "Driver side front wheel":["dfw","Right-hand side, FRONT wheel: tyre, alloy and arch."],
 "Driver side rear wheel":["drw","Right-hand side, REAR wheel: tyre, alloy and arch."],
 "Back side":["back","Straight on from the rear: bumper, lights, boot and plate."],
 "Passenger side":["passenger","Passenger side is the LEFT-hand side in UK cars. Whole side, front to back."],
 "Passenger side front wheel":["pfw","Left-hand side, FRONT wheel: tyre, alloy and arch."],
 "Passenger side rear wheel":["prw","Left-hand side, REAR wheel: tyre, alloy and arch."],
 "Mileage":["mileage","Ignition on; odometer digits sharp and readable."],
 "Exterior":["exterior","Step back for a corner angle showing the whole car."],
 "Back seats":["seats","Rear bench, seat backs and footwells, doors open."],
 "Keys":["keys","All keys and fobs together on a flat surface."],
 "Charging cable":["cable","Whole cable laid out, connector end visible."],
 "Spare tyre":["spare","Boot floor open with the spare tyre visible."],
 "Log book":["logbook","V5C front page, registration readable."],
 "Service history":["service","Service book stamps or latest printed record."]
};
function key(label){label=String(label==null?"":label);if(MAP.hasOwnProperty(label))return MAP[label];if(DAMAGE_RE.test(label))return["damage","Close-up of the dent or scratch, then one wider shot for location."];return null}
root.PickupPhotoGuides={
 has:function(label){return !!key(label)},
 render:function(label){var k=key(label);if(!k)return"";return svg(A[k[0]]())+'<small class="pickupPhotoHint">'+esc(k[1])+'</small>'},
 css:"svg.pickupPhotoGuide{display:block;width:100%;height:auto;max-height:140px;margin:6px 0 2px;border-radius:10px;border:1px solid #c9ccd0;pointer-events:none}small.pickupPhotoHint{display:block;font-size:12px;line-height:1.35;color:#4a4f55;margin-top:2px}"
};
})(typeof window!=="undefined"?window:this);
