/* Original artwork is sampled directly. Pupils/highlights use rigid masked
   source-pixel translation; brows, mouth and hands use local deformation. */
(() => {
  'use strict';
  const stage = document.querySelector('.stage');
  const portrait = document.querySelector('.portrait');
  const canvas = document.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) { document.querySelector('.hint').textContent = '比个心'; return; }
  const vertex = `attribute vec2 a_position; varying vec2 uv;
    void main() { uv = (a_position + 1.0) * 0.5; gl_Position = vec4(a_position,0.,1.); }`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform sampler2D artwork; uniform sampler2D closedArtwork; uniform sampler2D silhouette; uniform float blink; uniform vec2 eyeLeft; uniform vec2 eyeRight; uniform vec2 hands; uniform vec2 brow; uniform float mouth;
    float edge(vec2 p,vec2 a,vec2 b) { vec2 v=b-a; return (v.x*(p.y-a.y)-v.y*(p.x-a.x))/length(v); }
    // Fixed, manually located clipping envelopes around the original pupils.
    // The PNG supplies the actual pupil outline and all highlight pixels.
    float leftEye(vec2 p) {
      float d=edge(p,vec2(652.,549.),vec2(679.,550.));
      d=min(d,edge(p,vec2(679.,550.),vec2(693.,568.)));
      d=min(d,edge(p,vec2(693.,568.),vec2(697.,611.)));
      d=min(d,edge(p,vec2(697.,611.),vec2(689.,645.)));
      d=min(d,edge(p,vec2(689.,645.),vec2(662.,660.)));
      d=min(d,edge(p,vec2(662.,660.),vec2(641.,647.)));
      d=min(d,edge(p,vec2(641.,647.),vec2(630.,609.)));
      d=min(d,edge(p,vec2(630.,609.),vec2(627.,568.)));
      d=min(d,edge(p,vec2(627.,568.),vec2(652.,549.)));
      return smoothstep(-.4,.4,d);
    }
    float rightEye(vec2 p) {
      float d=edge(p,vec2(833.,529.),vec2(862.,530.));
      d=min(d,edge(p,vec2(862.,530.),vec2(874.,549.)));
      d=min(d,edge(p,vec2(874.,549.),vec2(875.,611.)));
      d=min(d,edge(p,vec2(875.,611.),vec2(867.,638.)));
      d=min(d,edge(p,vec2(867.,638.),vec2(838.,647.)));
      d=min(d,edge(p,vec2(838.,647.),vec2(820.,635.)));
      d=min(d,edge(p,vec2(820.,635.),vec2(813.,598.)));
      d=min(d,edge(p,vec2(813.,598.),vec2(811.,556.)));
      d=min(d,edge(p,vec2(811.,556.),vec2(833.,529.)));
      return smoothstep(-.4,.4,d);
    }
    float blob(vec2 p, vec2 c, vec2 r) {
      float d = length((p-c)/r); return 1.0-smoothstep(0.40,1.0,d);
    }
    float segment(vec2 p, vec2 a, vec2 b) {
      vec2 pa=p-a, ba=b-a; return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));
    }
    float eyebrows(vec2 p) {
      float d=segment(p,vec2(609.,535.),vec2(631.,523.));
      d=min(d,segment(p,vec2(631.,523.),vec2(653.,525.)));
      d=min(d,segment(p,vec2(653.,525.),vec2(686.,544.)));
      d=min(d,segment(p,vec2(686.,544.),vec2(709.,550.)));
      d=min(d,segment(p,vec2(709.,550.),vec2(723.,537.)));
      d=min(d,segment(p,vec2(761.,544.),vec2(780.,550.)));
      d=min(d,segment(p,vec2(780.,550.),vec2(806.,526.)));
      d=min(d,segment(p,vec2(806.,526.),vec2(844.,506.)));
      d=min(d,segment(p,vec2(844.,506.),vec2(873.,516.)));
      return (1.-smoothstep(7.,23.,d))*smoothstep(600.,607.,p.x);
    }
    void main() {
      // Coordinates correspond to a 1600-square view of the supplied 3300px scan.
      vec2 p=vec2(530.+uv.x*500.,350.+(1.-uv.y)*750.);
      vec2 q=p;
      q-=brow*eyebrows(p);
      q.x-=mouth*blob(p,vec2(790.,775.),vec2(85.,113.));
      // Both hands and wrists share one field. Its weight smoothly falls to zero
      // toward the shoulders/body, so the heart never splits or opens a seam.
      float heart=blob(p,vec2(807.,944.),vec2(152.,77.));
      heart*=1.-smoothstep(925.,945.,p.x);
      heart*=mix(smoothstep(945.,970.,p.y),1.,smoothstep(695.,725.,p.x));
      q-=hands*heart;
      bool closedSample=blink>.5&&q.x>=590.&&q.x<=910.&&q.y>=528.&&q.y<=681.;
      vec4 color=closedSample?texture2D(closedArtwork,q/1600.):texture2D(artwork,q/1600.);
      // Keep the lash/eye surroundings static even where the brow feather
      // approaches them. Rectangle boundaries are in the blank white margin.
      if((p.x>=590.&&p.x<=700.&&p.y>=550.&&p.y<=680.)||
         (p.x>=808.&&p.x<=900.&&p.y>=max(525.,535.-(p.x-808.)*.35)&&p.y<=652.)) color=blink>.5?texture2D(closedArtwork,p/1600.):texture2D(artwork,p/1600.);
      // Rigid source-pixel translation, NOT an eye deformation. Whiten the
      // original pupil footprint, then composite its shifted pixels through a
      // stationary clip. At rest return the unmodified source eye exactly.
      if(blink<.5 && length(eyeLeft)>.0001) {
        vec2 samplePoint=p-eyeLeft;
        vec4 pupil=mix(vec4(1.),texture2D(artwork,samplePoint/1600.),leftEye(samplePoint));
        color=mix(color,pupil,leftEye(p));
      }
      if(blink<.5 && length(eyeRight)>.0001) {
        vec2 samplePoint=p-eyeRight;
        vec4 pupil=mix(vec4(1.),texture2D(artwork,samplePoint/1600.),rightEye(samplePoint));
        color=mix(color,pupil,rightEye(p));
      }
      // Only replace the eye regions; all other live movement continues.
      if(blink>.5 && ((p.x>=590.&&p.x<=704.&&p.y>=550.&&p.y<=680.)||
         (p.x>=802.&&p.x<=909.&&p.y>=max(529.,535.-(p.x-808.)*.35)&&p.y<=655.)))
        color=texture2D(closedArtwork,p/1600.);
      float coverage=texture2D(silhouette,p/1600.).a;
      // Remove the original white matte on the outside antialiased edge.
      if(coverage<.999)color.rgb=vec3(0.);
      color.a=coverage;
      gl_FragColor=color;
    }`;
  function compile(type, source) {
    const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  let program;
  try {
    program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) { console.error(error); document.querySelector('.hint').textContent='比个心'; return; }
  gl.useProgram(program);
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,'a_position');
  gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const loc={ eyeLeft:gl.getUniformLocation(program,'eyeLeft'), eyeRight:gl.getUniformLocation(program,'eyeRight'), hands:gl.getUniformLocation(program,'hands'), brow:gl.getUniformLocation(program,'brow'), mouth:gl.getUniformLocation(program,'mouth') };
  // Explicit WEBPAGE calibration, not an inferred Rive asset transform:
  // a virtual 500-unit square spans 750 source-working pixels vertically.
  // The displayed 500x750 crop is its central 333.33x500 strip.
  const SOURCE_PER_UNIT=750/500, LOOK_RANGE=80;
  const target={x:0,y:0}; const state={lx:0,ly:0,rx:0,ry:0,hx:0,hy:0,bx:0,by:0,m:0};
  let loaded=false, frame=0, last=0;
  const blinkLoc=gl.getUniformLocation(program,'blink');
  let closedReady=false, blinking=false, blinkTimer=0, reopenTimer=0;
  function stopBlink(){
    clearTimeout(blinkTimer);clearTimeout(reopenTimer);blinking=false;
    if(loaded)draw();
  }
  function scheduleBlink(){
    clearTimeout(blinkTimer);
    if(!loaded||!closedReady||reduced.matches||document.hidden)return;
    blinkTimer=setTimeout(()=>{
      if(!loaded||reduced.matches||document.hidden)return;
      blinking=true;draw();
      reopenTimer=setTimeout(()=>{blinking=false;if(loaded)draw();scheduleBlink();},180);
    },3000+Math.random()*3000);
  }
  function draw() {
    const ratio=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(portrait.clientWidth*ratio)),h=Math.max(1,Math.round(portrait.clientHeight*ratio));
    if(canvas.width!==w||canvas.height!==h) { canvas.width=w; canvas.height=h; }
    gl.viewport(0,0,w,h);
    gl.uniform2f(loc.eyeLeft,state.lx*SOURCE_PER_UNIT,state.ly*SOURCE_PER_UNIT);
    gl.uniform2f(loc.eyeRight,state.rx*SOURCE_PER_UNIT,state.ry*SOURCE_PER_UNIT);
    gl.uniform2f(loc.hands,state.hx*SOURCE_PER_UNIT,state.hy*SOURCE_PER_UNIT);
    gl.uniform2f(loc.brow,state.bx*SOURCE_PER_UNIT,state.by*SOURCE_PER_UNIT);
    gl.uniform1f(loc.mouth,state.m*SOURCE_PER_UNIT);
    gl.uniform1f(blinkLoc,blinking?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function tick(now) {
    frame=0;
    const dt=Math.min((now-last)/1000 || 1/60,.05); last=now;
    const eyes=1-Math.exp(-dt*12), soft=1-Math.exp(-dt*7);
    const tx=reduced.matches?0:target.x,ty=reduced.matches?0:target.y;
    const lookX=tx*LOOK_RANGE,lookY=ty*LOOK_RANGE;
    const rawBX=lookX*.03*2,rawBY=lookY*.03;
    const limit=Math.min(1,4/Math.max(Math.hypot(rawBX,rawBY),.000001));
    // Clamp before smoothing. A lerp of two points in this disk stays in it.
    const distance=Math.max(Math.hypot(lookX,lookY),.000001);
    const leftLimit=Math.min(1,14/distance),rightLimit=Math.min(1,15/distance);
    const desired={lx:lookX*leftLimit,ly:lookY*leftLimit,rx:lookX*rightLimit,ry:lookY*rightLimit,hx:lookX*.05,hy:lookY*.05,bx:rawBX*limit,by:rawBY*limit,m:lookX*.1*.1};
    let difference=0;
    for(const key of Object.keys(state)) {
      state[key]+=(desired[key]-state[key])*('lx ly rx ry'.split(' ').includes(key)?eyes:soft);
      difference+=Math.abs(desired[key]-state[key]);
    }
    if(difference<.0002) Object.assign(state,desired);
    draw();
    if(difference>=.0002) frame=requestAnimationFrame(tick);
  }
  function wake() { if(loaded&&!frame) { last=performance.now(); frame=requestAnimationFrame(tick); } }
  function reset() { target.x=0; target.y=0; wake(); }
  stage.addEventListener('pointermove',event=>{
    if(reduced.matches) return;
    const r=portrait.getBoundingClientRect();
    target.x=Math.max(-1,Math.min(1,(event.clientX-r.left-r.width/2)/(r.width*.5)));
    target.y=Math.max(-1,Math.min(1,(event.clientY-r.top-r.height/2)/(r.height*.5)));
    wake();
  });
  stage.addEventListener('pointerleave',reset);
  stage.addEventListener('pointercancel',reset);
  stage.addEventListener('pointerup',event=>{ if(event.pointerType!=='mouse') reset(); });
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{stopBlink();if(document.hidden)reset();else scheduleBlink();});
  reduced.addEventListener('change',()=>{stopBlink();reset();if(reduced.matches){Object.keys(state).forEach(k=>state[k]=0);if(loaded)draw();}else scheduleBlink();});
  new ResizeObserver(()=>{ if(loaded)draw(); }).observe(portrait);
  canvas.addEventListener('webglcontextlost',event=>{ event.preventDefault(); loaded=false; stopBlink();cancelAnimationFrame(frame); portrait.classList.remove('ready'); });
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  const source=new Image();
  source.onload=()=>{
    // Flood-fill only white connected to the image border. Enclosed whites
    // (face, eyes, fingers and clothing) remain opaque.
    const maskCanvas=document.createElement('canvas');
    maskCanvas.width=source.naturalWidth;maskCanvas.height=source.naturalHeight;
    const ctx=maskCanvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
    const pixels=ctx.getImageData(0,0,maskCanvas.width,maskCanvas.height);
    const w=maskCanvas.width,h=maskCanvas.height,n=w*h,seen=new Uint8Array(n),queue=new Int32Array(n);
    let head=0,tail=0;
    const visit=i=>{if(seen[i])return;const k=i*4;if(Math.min(pixels.data[k],pixels.data[k+1],pixels.data[k+2])<200)return;seen[i]=1;queue[tail++]=i;};
    for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
    for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
    while(head<tail){const i=queue[head++],x=i%w;if(x)visit(i-1);if(x<w-1)visit(i+1);if(i>=w)visit(i-w);if(i<n-w)visit(i+w);}
    for(let i=0;i<n;i++){const k=i*4;pixels.data[k+3]=seen[i]?255-Math.min(pixels.data[k],pixels.data[k+1],pixels.data[k+2]):255;pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=255;}
    ctx.putImageData(pixels,0,0);
    gl.activeTexture(gl.TEXTURE2);
    const maskTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,maskTexture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,maskCanvas);
    gl.uniform1i(gl.getUniformLocation(program,'silhouette'),2);
    gl.activeTexture(gl.TEXTURE0);
    const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.uniform1i(gl.getUniformLocation(program,'artwork'),0);
    loaded=true; draw(); portrait.classList.add('ready');scheduleBlink();
  };
  // Embedded original allows WebGL on file:// without local-file CORS errors.
  source.src=window.CHARACTER_SOURCE;
  const closedSource=new Image();
  closedSource.onload=()=>{
    gl.activeTexture(gl.TEXTURE1);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,closedSource);
    gl.uniform1i(gl.getUniformLocation(program,'closedArtwork'),1);
    gl.activeTexture(gl.TEXTURE0);closedReady=true;scheduleBlink();
  };
  closedSource.src=window.CHARACTER_CLOSED_SOURCE;
})();
