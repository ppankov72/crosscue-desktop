import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { isTauriDesktop } from '@/lib/crosscue/freemium';

const KEY='crosscue.settings.v1';
export const defaultSettings={version:1,audio:{outputDeviceId:'default',masterGain:1.122018454,crossfaderCurve:'smooth',headphoneLevel:.0112201845,headphoneMix:0,boothLevel:.0112201845,headphoneOutputId:'default',boothOutputId:'default',defaultPitchOffset:0,autoGain:false},autoDJ:{transitionStart:3,crossfadeDuration:2,queueMode:'playlist'},interface:{theme:'crosscue',showVUMeters:true,showVideoOnLoad:true,showWaveform:true,fullscreen:false,mixerLogo:'DJ MIXER',djIdentityMode:'default',djName:'',djLogoUrl:'',customChassis:{mode:'none',colors:[],imageUri:null,imageUrl:null}},midi:{enabled:false,deviceId:'default'},recording:{format:'auto',source:'master'}};
const merge=s=>({...defaultSettings,...s,audio:{...defaultSettings.audio,...s?.audio},autoDJ:{...defaultSettings.autoDJ,...s?.autoDJ,queueMode:'playlist'},interface:{...defaultSettings.interface,...s?.interface,customChassis:{...defaultSettings.interface.customChassis,...s?.interface?.customChassis}},midi:{...defaultSettings.midi,...s?.midi},recording:{...defaultSettings.recording,...s?.recording}});
const SettingsContext=createContext(null);

export function CrossCueSettingsProvider({children}){
  const [settings,setSettings]=useState(()=>{try{return merge(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return defaultSettings;}});
  const serverLoadDoneRef=useRef(false);

  useEffect(()=>{
    if (isTauriDesktop()) {
      serverLoadDoneRef.current = true;
      return;
    }
    (async()=>{
      try{
        const authed=await base44.auth.isAuthenticated();
        if(!authed){serverLoadDoneRef.current=true;return;}
        const me=await base44.auth.me();
        if(me?.crosscue_interface){
          const serverInterface=typeof me.crosscue_interface==='string'?JSON.parse(me.crosscue_interface):me.crosscue_interface;
          setSettings(current=>({...current,interface:{...current.interface,...serverInterface}}));
        }
      }catch{}
      serverLoadDoneRef.current=true;
    })();
  },[]);

  const saveTimerRef=useRef(null);
  useEffect(()=>{
    if (isTauriDesktop()) return;
    if(!serverLoadDoneRef.current)return;
    if(saveTimerRef.current)clearTimeout(saveTimerRef.current);
    saveTimerRef.current=setTimeout(async()=>{
      try{
        const authed=await base44.auth.isAuthenticated();
        if(!authed)return;
        await base44.auth.updateMe({crosscue_interface:JSON.stringify(settings.interface)});
      }catch{}
    },2000);
    return()=>{if(saveTimerRef.current)clearTimeout(saveTimerRef.current);};
  },[settings.interface]);

  useEffect(()=>localStorage.setItem(KEY,JSON.stringify(settings)),[settings]);
  const update=(section,values)=>setSettings(current=>({...current,[section]:{...current[section],...values}}));
  const reset=()=>setSettings(defaultSettings);
  return <SettingsContext.Provider value={{settings,update,reset}}>{children}</SettingsContext.Provider>
}

export const useCrossCueSettings=()=>useContext(SettingsContext);