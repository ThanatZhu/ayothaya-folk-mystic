// No client XP, damage, inventory or position claims cross this transport.
export class MultiplayerClient extends EventTarget{
 constructor({url,identity,WebSocketImpl=globalThis.WebSocket}){super();this.url=url;this.identity=identity;this.WebSocket=WebSocketImpl;this.seq=0;this.status='offline';this.socket=null;this.stopped=false;this.pending=new Map();this.retries=0;this.generation=0;this.lastInput=0;this.input={x:0,z:0,attack:false};this.ready=null;}
 emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
 state(status){this.status=status;this.emit('status',status);}
 async connect(){
  const generation=++this.generation;this.stopped=false;this.state(this.retries?'reconnecting':'connecting');
  try{
   const identity=await this.identity();if(this.stopped||generation!==this.generation)return;
   const socket=this.socket=new this.WebSocket(this.url);
   socket.addEventListener('open',()=>{if(generation!==this.generation){socket.close();return;}socket.send(JSON.stringify({type:'join',...identity}));});
   socket.addEventListener('message',e=>{if(generation!==this.generation)return;let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='welcome'){this.equipment=m.snapshot.self.equipment;this.training=m.snapshot.self.training??null;this.seq=0;this.id=m.id;this.retries=0;this.everOnline=true;this.state('online');this.emit('welcome',m);this.emit('snapshot',m.snapshot);}
    else if(m.type==='snapshot'){if(m.self?.equipment)this.equipment=m.self.equipment;if('training' in (m.self??{}))this.training=m.self.training??null;this.emit('snapshot',m);}
    else if(m.type==='channelSwitched'){if(m.snapshot?.self?.equipment)this.equipment=m.snapshot.self.equipment;if('training' in (m.snapshot?.self??{}))this.training=m.snapshot.self.training??null;this.emit('channelSwitched',m);}
    else if(m.type==='equipped'){this.equipment=m.equipment;this.pending.get(m.id)?.resolve(m);this.pending.delete(m.id);}
    else if(m.type==='equipment-error'){this.pending.get(m.id)?.reject(new Error(m.code));this.pending.delete(m.id);}
    else if(m.type==='trained'){this.training=m.training;if(m.advanced)this.stopped=true;this.pending.get(m.id)?.resolve(m);this.pending.delete(m.id);}
    else if(m.type==='training-error'){this.pending.get(m.id)?.reject(new Error(m.code));this.pending.delete(m.id);}
    else if(['petChanged','mailChanged'].includes(m.type)){this.pending.get(m.id)?.resolve(m);this.pending.delete(m.id);}
    else if(['petError','mailError'].includes(m.type)){this.pending.get(m.id)?.reject(new Error(m.code));this.pending.delete(m.id);}
    else if(m.type==='saved'){this.pending.get(m.id)?.resolve();this.pending.delete(m.id);this.emit('saved',m);}
    else if(m.type==='traveled'){this.stopped=true;this.pending.get(m.id)?.resolve();this.pending.delete(m.id);}
    else if(m.type==='travel-error'){this.pending.get(m.id)?.reject(new Error(m.code));this.pending.delete(m.id);}
    else if(m.type==='left'){this.pending.get('leave')?.resolve();this.pending.delete('leave');this.stopped=true;this.state('offline');}
    else{if(m.type==='error'&&['authentication-failed','character-not-found','character-server','save-failed','save-conflict','replaced'].includes(m.code)){this.stopped=true;this.state('error');}this.emit(m.type,m);}
   });
   socket.addEventListener('close',()=>{if(generation!==this.generation)return;for(const task of this.pending.values())task.reject(new Error('disconnected'));this.pending.clear();
    if(this.stopped){if(this.status!=='error')this.state('offline');return;}if(this.retries>=14){this.stopped=true;this.state('error');this.emit('error',{code:'connection-timeout'});return;}this.state('reconnecting');const delay=Math.min(15000,700*2**Math.min(this.retries++,5));clearTimeout(this.timer);this.timer=setTimeout(()=>this.connect(),delay+Math.random()*300);
   });socket.addEventListener('error',()=>{});
  }catch(error){this.stopped=true;this.state('error');this.emit('error',{code:error.message});}
 }
 command(type,data={}){if(this.status!=='online'||this.socket?.readyState!==1){if(type!=='input')console.warn('command-blocked',type,this.status,this.socket?.readyState,this.stopped);return false;}this.socket.send(JSON.stringify({type,...data,seq:++this.seq}));return true;}
 setInput(input){const moving=this.input.x||this.input.z,wasRunning=!!this.input.run;this.input={x:Math.max(-1,Math.min(1,input.x)),z:Math.max(-1,Math.min(1,input.z)),attack:!!input.attack,run:input.run===true&&Math.hypot(input.x,input.z)>.08};const now=performance.now(),stopped=moving&&!this.input.x&&!this.input.z,runChanged=wasRunning!==this.input.run;
  // Throttle steering to ~15/s, but send a stop at once so the server does not keep walking past where the player let go.
  if(stopped||runChanged||now-this.lastInput>=65){this.lastInput=now;this.command('input',this.input);}}
 request(type,id,data={}){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('server-timeout'));},12000);this.pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:e=>{clearTimeout(timer);reject(e);}});if(!this.command(type,{id,...data})){this.pending.get(id).reject(new Error('not-connected'));this.pending.delete(id);}});}
 train(mentor,action,jobId){return this.request('train',crypto.randomUUID(),{mentor,action,jobId});}
 equip(item){return this.request('equip',crypto.randomUUID(),{item});}
 flush(settings){if(this.saving)return this.saving;this.saving=this.request('save',crypto.randomUUID(),{settings}).finally(()=>{this.saving=null;});return this.saving;}
 async travel(destination,warp=false){await this.request('travel',crypto.randomUUID(),{destination,warp});this.stopped=true;}
 async leave(){if(this.status!=='online')throw new Error('not-connected');await this.request('leave','leave');this.stopped=true;this.socket?.close();}
 stop(){this.stopped=true;this.generation++;clearTimeout(this.timer);this.socket?.close();for(const task of this.pending.values())task.reject(new Error('stopped'));this.pending.clear();this.state('offline');}
}
