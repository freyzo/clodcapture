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

/* --- SPIDER (3D) --- */
var ox=CX+sx,oy=CY+sy;x.save();x.translate(ox,oy);
var legs=[[-9,-4,-16,-24,-25,-35,-29,-33],[9,-4,16,-24,25,-35,29,-33],[-10,-2,-22,-15,-35,-18,-42,-13],[10,-2,22,-15,35,-18,42,-13],[-10,2,-24,2,-39,9,-46,16],[10,2,24,2,39,9,46,16],[-9,6,-20,18,-31,33,-35,42],[9,6,20,18,31,33,35,42]];
x.lineCap='round';x.lineJoin='round';
/* leg shadow */
for(var i=0;i<legs.length;i++){var l=legs[i];
x.beginPath();x.moveTo(l[0],l[1]);x.lineTo(l[2],l[3]);x.lineTo(l[4],l[5]);x.lineTo(l[6],l[7]);
x.strokeStyle='rgba(140,70,35,0.3)';x.lineWidth=5.5;x.stroke();}
/* leg gradient fill */
var legGrad=x.createLinearGradient(0,-35,0,42);
legGrad.addColorStop(0,'#f0a080');legGrad.addColorStop(0.3,'#D97757');legGrad.addColorStop(0.7,'#cf6e42');legGrad.addColorStop(1,'#b8622e');
for(var i=0;i<legs.length;i++){var l=legs[i];
x.beginPath();x.moveTo(l[0],l[1]);x.lineTo(l[2],l[3]);x.lineTo(l[4],l[5]);x.lineTo(l[6],l[7]);
x.strokeStyle=legGrad;x.lineWidth=3.8;x.stroke();}
/* leg highlight */
for(var i=0;i<legs.length;i++){var l=legs[i];
x.beginPath();x.moveTo(l[0]-0.5,l[1]-0.8);x.lineTo(l[2]-0.5,l[3]-0.8);x.lineTo(l[4]-0.5,l[5]-0.8);x.lineTo(l[6]-0.5,l[7]-0.8);
x.strokeStyle='rgba(255,210,180,0.2)';x.lineWidth=1.2;x.stroke();}
/* joint knuckles */
x.fillStyle='#c06840';
for(var i=0;i<legs.length;i++){var l=legs[i];x.beginPath();x.arc(l[2],l[3],2,0,Math.PI*2);x.fill();}
/* body shadow */
x.fillStyle='rgba(140,70,35,0.15)';
x.beginPath();x.ellipse(1.5,-3.5,6.5,5.8,0,0,Math.PI*2);x.fill();
x.beginPath();x.moveTo(-6.7,2.5);x.bezierCurveTo(-7.7,11.3,-5.5,20,1.5,23.5);x.bezierCurveTo(8.5,20,10.7,11.3,9.7,2.5);x.bezierCurveTo(7.5,0.3,-4.5,0.3,-6.7,2.5);x.fill();
/* head - 3D gradient */
var headGrad=x.createRadialGradient(-2,-8,1,0,-6,8);
headGrad.addColorStop(0,'#f4a078');headGrad.addColorStop(0.4,'#D97757');headGrad.addColorStop(0.8,'#c0643f');headGrad.addColorStop(1,'#c06a3a');
x.fillStyle=headGrad;
x.beginPath();x.ellipse(0,-6,6.2,5.4,0,0,Math.PI*2);x.fill();
/* abdomen - 3D gradient */
var bodyGrad=x.createRadialGradient(-2,6,1,0,10,14);
bodyGrad.addColorStop(0,'#f4a078');bodyGrad.addColorStop(0.35,'#D97757');bodyGrad.addColorStop(0.7,'#cf6e42');bodyGrad.addColorStop(1,'#b8622e');
x.fillStyle=bodyGrad;
x.beginPath();x.moveTo(-8.2,0);x.bezierCurveTo(-9.2,8.8,-7,17.5,0,21);x.bezierCurveTo(7,17.5,9.2,8.8,8.2,0);x.bezierCurveTo(6,-2.2,-6,-2.2,-8.2,0);x.fill();
/* segment line */
x.strokeStyle='rgba(180,100,60,0.15)';x.lineWidth=1.0;
x.beginPath();x.moveTo(-6,-0.5);x.lineTo(6,-0.5);x.stroke();
/* specular highlight - head */
var specH=x.createRadialGradient(-2,-9,0,-2,-9,5);
specH.addColorStop(0,'rgba(255,255,255,0.4)');specH.addColorStop(1,'rgba(255,255,255,0)');
x.fillStyle=specH;
x.beginPath();x.ellipse(-2,-9,4,3.5,0,0,Math.PI*2);x.fill();
/* specular highlight - abdomen */
var specB=x.createRadialGradient(-2,6,0,-2,6,7);
specB.addColorStop(0,'rgba(255,255,255,0.3)');specB.addColorStop(1,'rgba(255,255,255,0)');
x.fillStyle=specB;
x.beginPath();x.ellipse(-2,6,5,7,0,0,Math.PI*2);x.fill();
/* rim light */
x.strokeStyle='rgba(255,200,170,0.15)';x.lineWidth=1;
x.beginPath();x.moveTo(-7,1);x.bezierCurveTo(-8,9,-6,16,0,19);x.bezierCurveTo(6,16,8,9,7,1);x.stroke();
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