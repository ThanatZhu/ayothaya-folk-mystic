// Exact display finish used by soft-look.js (desktop); kept separate so the
// study can render both profiles into textures without changing live settings.
import * as THREE from 'three';
export const baselineShader={
 uniforms:{tDiffuse:{value:null},resolution:{value:new THREE.Vector2(1,1)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 resolution;varying vec2 vUv;
 void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float amount=smoothstep(.3,.64,abs(vUv.y-.48))*1.3;
 if(amount>.05){vec2 px=amount/resolution;vec3 sum=c;for(int i=0;i<12;i++){float a=float(i)*2.39996,r=sqrt(float(i)+.5)/3.46;sum+=texture2D(tDiffuse,vUv+vec2(cos(a),sin(a))*r*px*2.).rgb;}c=sum/13.;}
 float l=dot(c,vec3(.2126,.7152,.0722));c=c*.93+.04;c+=vec3(.05,.025,-.02)*smoothstep(.4,1.,l);
 vec2 d=vUv-.5;c*=1.-.32*dot(d,d)*1.5;gl_FragColor=vec4(c,1.);}`
};
