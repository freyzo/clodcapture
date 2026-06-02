(function(){var c=document.getElementById('spider-canvas');if(!c)return;var x=c.getContext('2d'),W=336,H=100,CX=168,CY=50;c.width=W*2;c.height=H*2;x.scale(2,2);var sx=0,sy=0,vx=0,vy=0,pulse=0,run=false;var wA=[];for(var i=0;i<10;i++)wA.push(i/10*Math.PI*2);var glowT=0;function draw(){glowT+=0.02;x.clearRect(0,0,W,H);

/* --- WEB GLOW LAYER --- */
var glowPulse=0.5+0.5*Math.sin(glowT*1.2);
var baseGlow=0.12+glowPulse*0.08;

/* radial lines (spokes) */
for(var j=0;j<10;j++){var a=wA[j],np=Math.max(0,pulse-0.2);
x.save();
x.shadowColor='rgba(217,119,87,'+(0.35+glowPulse*0.25).toFixed(3)+')';
x.shadowBlur=6+glowPulse*4;
x.beginPath();
x.moveTo(CX+sx,CY+sy);
x.lineTo(CX+Math.cos(a)*156,CY+Math.sin(a)*48);
/* bright glow stroke */
x.strokeStyle='rgba(217,119,87,'+(baseGlow+np*0.25).toFixed(3)+')';
x.lineWidth=1.0;
x.stroke();
/* crisp overlay */
x.shadowBlur=0;
x.strokeStyle='rgba(255,240,230,'+(0.08+np*0.15+glowPulse*0.04).toFixed(3)+')';
x.lineWidth=0.6;
x.stroke();
x.restore();
}

/* concentric rings */
for(var ri=0;ri<3;ri++){var t=[0.9,0.6,0.35][ri],rp=Math.max(0,pulse-(1-t)*2);
x.save();
x.shadowColor='rgba(217,119,87,'+(0.3+glowPulse*0.2).toFixed(3)+')';
x.shadowBlur=5+glowPulse*3;
x.beginPath();
for(var j=0;j<=10;j++){var a=wA[j%10],r=t*48;var px=CX+Math.cos(a)*r*2.8+sx*t*0.3,py=CY+Math.sin(a)*r+sy*t*0.3;j===0?x.moveTo(px,py):x.lineTo(px,py);}
x.closePath();
/* glow stroke */
x.strokeStyle='rgba(217,119,87,'+(baseGlow*0.8+rp*0.3).toFixed(3)+')';
x.lineWidth=1.2;
x.stroke();
/* crisp overlay */
x.shadowBlur=0;
x.strokeStyle='rgba(255,240,230,'+(0.07+rp*0.15+glowPulse*0.03).toFixed(3)+')';
x.lineWidth=0.55;
x.stroke();
x.restore();
}

/* intersection nodes - tiny glowing dots where rings meet spokes */
for(var ri=0;ri<3;ri++){var t=[0.9,0.6,0.35][ri];
for(var j=0;j<10;j++){var a=wA[j],r=t*48;
var nx=CX+Math.cos(a)*r*2.8+sx*t*0.3,ny=CY+Math.sin(a)*r+sy*t*0.3;
x.save();
x.shadowColor='rgba(217,119,87,'+(0.5+glowPulse*0.3).toFixed(3)+')';
x.shadowBlur=4+glowPulse*3;
x.beginPath();
x.arc(nx,ny,1.0+glowPulse*0.5,0,Math.PI*2);
x.fillStyle='rgba(217,119,87,'+(0.25+glowPulse*0.2).toFixed(3)+')';
x.fill();
x.restore();
}}

/* --- SPIDER --- */
var ox=CX+sx,oy=CY+sy;x.save();x.translate(ox,oy);
var legs=[[-9,-4,-16,-24,-25,-35,-29,-33],[9,-4,16,-24,25,-35,29,-33],[-10,-2,-22,-15,-35,-18,-42,-13],[10,-2,22,-15,35,-18,42,-13],[-10,2,-24,2,-39,9,-46,16],[10,2,24,2,39,9,46,16],[-9,6,-20,18,-31,33,-35,42],[9,6,20,18,31,33,35,42]];
x.lineCap='round';x.lineJoin='round';
for(var i=0;i<legs.length;i++){var l=legs[i];
x.beginPath();x.moveTo(l[0],l[1]);x.lineTo(l[2],l[3]);x.lineTo(l[4],l[5]);x.lineTo(l[6],l[7]);
x.strokeStyle='rgba(18,14,26,0.45)';x.lineWidth=5.2;x.stroke();
x.beginPath();x.moveTo(l[0],l[1]);x.lineTo(l[2],l[3]);x.lineTo(l[4],l[5]);x.lineTo(l[6],l[7]);
x.strokeStyle='#D97757';x.lineWidth=3.6;x.stroke();}
x.fillStyle='rgba(18,14,26,0.35)';
x.beginPath();x.ellipse(0,-6,6.2,5.4,0,0,Math.PI*2);x.fill();
x.beginPath();x.moveTo(-8.2,0);x.bezierCurveTo(-9.2,8.8,-7,17.5,0,21);x.bezierCurveTo(7,17.5,9.2,8.8,8.2,0);x.bezierCurveTo(6,-2.2,-6,-2.2,-8.2,0);x.fill();
x.fillStyle='#D97757';
x.beginPath();x.ellipse(0,-6,6.2,5.4,0,0,Math.PI*2);x.fill();
x.beginPath();x.moveTo(-8.2,0);x.bezierCurveTo(-9.2,8.8,-7,17.5,0,21);x.bezierCurveTo(7,17.5,9.2,8.8,8.2,0);x.bezierCurveTo(6,-2.2,-6,-2.2,-8.2,0);x.fill();
x.restore();}

var animId=null;
function tick(){vx=(vx+(-0.12*sx))*0.82;vy=(vy+(-0.12*sy))*0.82;sx+=vx;sy+=vy;pulse*=0.96;draw();
if(Math.abs(sx)>0.1||Math.abs(sy)>0.1||Math.abs(vx)>0.05||pulse>0.005){animId=requestAnimationFrame(tick);}
else{sx=0;sy=0;vx=0;vy=0;pulse=0;draw();run=false;}}

/* ambient glow animation loop - pauses when popup hidden */
var ambientId=null;
function ambientTick(){draw();ambientId=requestAnimationFrame(ambientTick);}
function startAmbient(){if(!ambientId)ambientTick();}
function stopAmbient(){if(ambientId){cancelAnimationFrame(ambientId);ambientId=null;}}
document.addEventListener('visibilitychange',function(){document.hidden?stopAmbient():startAmbient();});
startAmbient();

c.addEventListener('click',function(e){var r=c.getBoundingClientRect(),s=W/r.width;
var mx=(e.clientX-r.left)*s-CX,my=(e.clientY-r.top)*s-CY;
var d=Math.sqrt(mx*mx+my*my)||1,f=12+Math.random()*10;
vx+=(-mx/d)*f*(0.5+Math.random()*0.7);vy+=(-my/d)*f*(0.5+Math.random()*0.7);pulse=1;
if(!run){run=true;if(animId)cancelAnimationFrame(animId);tick();}});
})();