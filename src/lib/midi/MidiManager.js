class MidiManager {
  constructor(){this.access=null;this.listeners=new Set();this.devices=[];this.status='off';this.boundState=()=>this.refresh();}
  emit(){this.listeners.forEach(listener=>listener({devices:this.devices,status:this.status}));}
  subscribe(listener){this.listeners.add(listener);listener({devices:this.devices,status:this.status});return()=>this.listeners.delete(listener);}
  async checkPermission(){
    if(typeof navigator==='undefined'||!navigator?.permissions?.query) return null;
    try {
      const status = await navigator.permissions.query({ name: 'midi', sysex: false });
      return status?.state || null;
    } catch {
      try {
        const status = await navigator.permissions.query({ name: 'midi' });
        return status?.state || null;
      } catch {
        return null;
      }
    }
  }
  async autoConnectIfGranted(){
    if(typeof navigator==='undefined'||!navigator?.requestMIDIAccess) return false;
    const perm = await this.checkPermission();
    if(perm === 'granted'){
      await this.enable();
      return true;
    }
    return false;
  }
  async enable(){
    if(typeof navigator==='undefined'||!navigator.requestMIDIAccess){this.status='unavailable';this.emit();return;}
    try { this.access=await navigator.requestMIDIAccess(); this.access.onstatechange=this.boundState; this.status='ready'; this.refresh(); }
    catch { this.status='denied'; this.emit(); }
  }
  refresh(){
    if(!this.access)return;
    this.devices=[...this.access.inputs.values()].map(input=>({id:input.id,name:input.name||'Unknown MIDI input',manufacturer:input.manufacturer||'',state:input.state,enabled:true}));
    this.access.inputs.forEach(input=>{input.onmidimessage=event=>this.handle(input,event);}); this.emit();
  }
  handle(device,event){
    const [status,number,value=0]=event.data;
    const command=status>>4,channel=(status&15)+1;
    let type=command===11?'cc':command===9?'noteon':command===8?'noteoff':null;
    if(!type)return;
    // Standard MIDI specification: Note On with velocity 0 is defined as Note Off
    if(type==='noteon'&&value===0){
      type='noteoff';
    }
    const message={device:{id:device.id,name:device.name||'Unknown MIDI input',manufacturer:device.manufacturer||''},channel,command,type,number,value,normalized:value/127};
    this.listeners.forEach(listener=>listener({message,status:'active',devices:this.devices}));
  }
  destroy(){if(this.access){this.access.onstatechange=null;this.access.inputs.forEach(input=>input.onmidimessage=null);}this.access=null;this.devices=[];this.status='off';this.emit();}
}
export const midiManager=new MidiManager();