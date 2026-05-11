(function(){
var c=document.getElementById('spider-canvas');if(!c)return;
var x=c.getContext('2d'),W=280,H=100,CX=140,CY=50;
c.width=W*2;c.height=H*2;x.scale(2,2);
var sx=0,sy=0,vx=0,vy=0,pulse=0,run=false;
var wA=[];for(var i=0;i<10;i++)wA.push(i/10*Math.PI*2);
function draw(){
x.clearRect(0,0,W,H);
// web
for(var ri=0;ri<3;ri++){
var t=[0.9,0.6,0.35][ri],rp=Math.max(0,pulse-(1-t)*2);
x.beginPath();
for(var j=0;j<=10;j++){var a=wA[j%10],r=t*48;var px=CX+Math.cos(a)*r*2.8+sx*t*0.3,py=CY+Math.sin(a)*r+sy*t*0.3;j===0?x.moveTo(px,py):x.lineTo(px,py);}
x.closePath();
if(rp>0.01){x.strokeStyle='rgba(217,119,87,'+(rp*0.4).toFixed(3)+')';x.lineWidth=1.5;x.stroke();}
x.strokeStyle='rgba(255,240,230,'+(0.08+rp*0.2).toFixed(3)+')';x.lineWidth=0.8;x.stroke();
}
for(var j=0;j<10;j++){var a=wA[j],np=Math.max(0,pulse-0.2);
x.beginPath();x.moveTo(CX+sx,CY+sy);x.lineTo(CX+Math.cos(a)*130,CY+Math.sin(a)*48);
if(np>0.01){x.strokeStyle='rgba(217,119,87,'+(np*0.3).toFixed(3)+')';x.lineWidth=1.5;x.stroke();}
x.strokeStyle='rgba(255,240,230,'+(0.06+np*0.15).toFixed(3)+')';x.lineWidth=0.7;x.stroke();}
// spider
var ox=CX+sx,oy=CY+sy;x.save();x.translate(ox,oy);
var legs=[[-8,-4,-14,-22,-22,-32,-26,-30],[8,-4,14,-22,22,-32,26,-30],[-9,-2,-20,-14,-32,-16,-38,-12],[9,-2,20,-14,32,-16,38,-12],[-9,2,-22,2,-36,8,-42,14],[9,2,22,2,36,8,42,14],[-8,6,-18,16,-28,30,-32,38],[8,6,18,16,28,30,32,38]];
x.strokeStyle='#D97757';x.lineWidth=2.5;x.lineCap='round';x.lineJoin='round';
for(var i=0;i<legs.length;i++){var l=legs[i];x.beginPath();x.moveTo(l[0],l[1]);x.lineTo(l[2],l[3]);x.lineTo(l[4],l[5]);x.lineTo(l[6],l[7]);x.stroke();}
x.fillStyle='#D97757';x.beginPath();x.ellipse(0,-6,5,4.5,0,0,Math.PI*2);x.fill();
x.beginPath();x.moveTo(-7,0);x.bezierCurveTo(-8,8,-6,16,0,19);x.bezierCurveTo(6,16,8,8,7,0);x.bezierCurveTo(5,-2,-5,-2,-7,0);x.fill();
x.strokeStyle='rgba(53,46,62,0.3)';x.lineWidth=0.8;x.beginPath();x.moveTo(-5,0);x.lineTo(5,0);x.stroke();
x.restore();}
function tick(){vx=(vx+(-0.12*sx))*0.82;vy=(vy+(-0.12*sy))*0.82;sx+=vx;sy+=vy;pulse*=0.96;draw();
if(Math.abs(sx)>0.1||Math.abs(sy)>0.1||Math.abs(vx)>0.05||pulse>0.005)requestAnimationFrame(tick);
else{sx=0;sy=0;vx=0;vy=0;pulse=0;draw();run=false;}}
c.addEventListener('click',function(e){var r=c.getBoundingClientRect(),s=W/r.width;var mx=(e.clientX-r.left)*s-CX,my=(e.clientY-r.top)*s-CY;var d=Math.sqrt(mx*mx+my*my)||1,f=12+Math.random()*10;vx+=(-mx/d)*f*(0.5+Math.random()*0.7);vy+=(-my/d)*f*(0.5+Math.random()*0.7);pulse=1;if(!run){run=true;tick();}});
draw();
})();
