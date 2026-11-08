import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { detectLang } from '@/lib/i18n/sharedLang';
import { Settings, SlidersHorizontal, Radio, Maximize, Menu, X, UserCircle, LogOut, Mic, HardDrive, Crown } from 'lucide-react';
import { hasPremiumAccess, isTauriDesktop } from '@/lib/crosscue/freemium';
import FreemiumUpgradeModal from '@/components/crosscue/FreemiumUpgradeModal';
import useDeck from '@/hooks/useDeck';
import useAutoDJ from '@/hooks/useAutoDJ';
import useSampler from '@/hooks/useSampler';
import { sourceProviders } from '@/lib/crosscue/sourceProviders';
import analysisService from '@/lib/crosscue/analysis';
import { readId3Metadata } from '@/lib/crosscue/id3Metadata';
import { DEFAULT_SAMPLES } from '@/lib/crosscue/defaultSamples';
import { DEMO_TRACKS } from '@/lib/crosscue/defaultDemoTracks';
import { audioEngine } from '@/lib/crosscue/audioEngine';
import useDeviceProfile from '@/hooks/useDeviceProfile';
import MobileMixBar from '@/components/crosscue/MobileMixBar';
import MobileLandscapeHint from '@/components/crosscue/MobileLandscapeHint';
import { CrossCueSettingsProvider, useCrossCueSettings } from '@/lib/crosscue/settings';
import { flagThemeVars } from '@/lib/crosscue/flagThemes';
import { effectiveBpm, dbToGain, gainToDb, midiToEqDb } from '@/lib/decksmith/audioMath';
import { CrossfaderDamper } from '@/lib/crosscue/crossfaderDamping';
import { midiManager } from '@/lib/midi/MidiManager';
import { defaultMode, loadMidiMappings, matchesMapping, saveMidiMappings } from '@/lib/midi/mappings';
import { midiSmoother } from '@/lib/midi/midiSmoother';
import { jogDetector } from '@/lib/midi/jogDetector';
import MidiPanel from '@/components/midi/MidiPanel';
import MappingManager from '@/components/midi/MappingManager';
import { mappingLibraryStore } from '@/lib/midi/mappingLibraryStore';
import RecordingPanel from '@/components/recording/RecordingPanel';
import { recordingManager } from '@/lib/recording/RecordingManager';
import Deck from '@/components/crosscue/Deck';
import Mixer from '@/components/crosscue/Mixer';
import Library from '@/components/crosscue/Library';
import SourcePanel from '@/components/crosscue/SourcePanel';
import SettingsDialog from '@/components/crosscue/SettingsDialog';
import ViewMenu from '@/components/crosscue/ViewMenu';
import useSessionLogger from '@/hooks/useSessionLogger';
import usePlaybackPermission from '@/hooks/usePlaybackPermission';
import { fadeOutAndStop } from '@/lib/crosscue/playbackEnforcement';
import PlaybackLock from '@/components/crosscue/PlaybackLock';
import NetworkLossBanner from '@/components/crosscue/NetworkLossBanner';
import useKaraoke from '@/hooks/useKaraoke';
import KaraokePanel from '@/components/crosscue/KaraokePanel';
import GoogleDriveBrowser from '@/components/crosscue/GoogleDriveBrowser';
import TrialOnboarding from '@/components/crosscue/TrialOnboarding';
import TrialStatusIndicator from '@/components/crosscue/TrialStatusIndicator';
import TrialFeedback from '@/components/crosscue/TrialFeedback';
import { useAnalytics } from '@/hooks/useAnalytics';
import useMixIntentAnalytics from '@/hooks/useMixIntentAnalytics';
import { createDriveTrackDescriptor } from '@/lib/crosscue/googleDriveLibrary';
import { resolveTrackForPlayback } from '@/lib/crosscue/trackResolver';

const stored = key => { try { const value = localStorage.getItem(key) ?? localStorage.getItem(key.replace('crosscue', 'decksmith')); if (value && !localStorage.getItem(key)) localStorage.setItem(key, value); return JSON.parse(value || '[]'); } catch { return []; } };
const storedView = () => { try { const key = 'crosscue-view-sections', value = localStorage.getItem(key) ?? localStorage.getItem('decksmith-view-sections'); if (value && !localStorage.getItem(key)) localStorage.setItem(key, value); return { ...{ deckA:true,mixer:true,deckB:true,meters:true,library:true }, ...JSON.parse(value || '{}') }; } catch { return { deckA:true,mixer:true,deckB:true,meters:true,library:true }; } };
const trackId = file => `local-${file.name}-${file.size}-${file.lastModified}`;
const isAudio = file => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function CrossCue({embedded=false}){return <CrossCueSettingsProvider><CrossCueWorkspace embedded={embedded}/></CrossCueSettingsProvider>}

function CrossCueWorkspace({embedded=false}) {
 const a=useDeck('A'),b=useDeck('B'),samplerA=useSampler('A',a.deck),samplerB=useSampler('B',b.deck);const karaoke=useKaraoke();
 const {settings,update,reset}=useCrossCueSettings();
 const {toast}=useToast();
 const {trackEvent}=useAnalytics();
  useSessionLogger('/studio');
  const [showLock,setShowLock]=useState(false);
   const [autoDJ,setAutoDJ]=useState(false);
   const [freemiumModal,setFreemiumModal]=useState({open:false,feature:'general'});
   const [showOnboarding,setShowOnboarding]=useState(false);
   const [lang,setLang]=useState(()=>detectLang('en'));
   useEffect(()=>{
     const onLang=e=>setLang(e?.detail||detectLang('en'));
     window.addEventListener('crosscue-lang-changed',onLang);
     return()=>window.removeEventListener('crosscue-lang-changed',onLang);
   },[]);
   const handleLock=useCallback(reason=>{
     if(reason==='network_lost'||reason==='no_server_connection'){
       setShowLock(true);
       setAutoDJ(false);
       return fadeOutAndStop(audioEngine,settings.audio.masterGain,()=>{a.setTransport(false);b.setTransport(false);});
     }
   },[settings.audio.masterGain,a,b]);
  const permission=usePlaybackPermission({isPlaying:a.deck.playing||b.deck.playing,onLock:handleLock});
  useMixIntentAnalytics({deckAPlaying:a.deck.playing,deckBPlaying:b.deck.playing,permission,embedded});
  const djDisplayName=permission.isAnonymous&&permission.djNickname?permission.djNickname:settings.interface.djName;
  const requirePremium=useCallback((featureKey,action)=>{
    if(hasPremiumAccess(permission)){
      action();
    }else{
      setFreemiumModal({open:true,feature:featureKey});
    }
  },[permission]);
 const deviceProfile=useDeviceProfile();
 const isSingleTabDeckView=deviceProfile.isCompactPortrait;
 const canFullscreen=typeof document!=='undefined'&&Boolean(document.documentElement?.requestFullscreen);
 const theme=settings.interface.theme;
 const customChassis=settings.interface.customChassis;
 const [chassisImageUrl,setChassisImageUrl]=useState(null);
 useEffect(()=>{if(customChassis?.mode==='image'&&customChassis?.imageUri){base44.integrations.Core.CreateFileSignedUrl({file_uri:customChassis.imageUri,expires_in:604800}).then(r=>setChassisImageUrl(r.signed_url||null)).catch(()=>setChassisImageUrl(null));}else setChassisImageUrl(null);},[customChassis?.mode,customChassis?.imageUri]);
 const [cross,setCross]=useState(0),[tracks,setTracks]=useState(()=>stored('crosscue-local-tracks').map(t=>{if(t.type==='youtube')return t;if(t.type==='google_drive')return {...t,fileRequired:false};const sys=DEMO_TRACKS.find(d=>d.id===t.id)||DEFAULT_SAMPLES.find(s=>s.id===t.id);const sourceUrl=t.sourceUrl||sys?.url;return {...t,sourceUrl,fileRequired:!sourceUrl,file:t.file instanceof Blob?t.file:undefined};})),[history,setHistory]=useState(()=>stored('crosscue-history')),[playlists,setPlaylists]=useState(()=>stored('crosscue-playlists')),[selectedPlaylist,setSelectedPlaylist]=useState(''),[pfl,setPfl]=useState({A:false,B:false}),[settingsOpen,setSettingsOpen]=useState(false),[sections,setSections]=useState(storedView),[mobileTab,setMobileTab]=useState('A'),[headerOpen,setHeaderOpen]=useState(false),[syncState,setSyncState]=useState({master:null,follower:null,limit:null}),[midiOpen,setMidiOpen]=useState(false),[midiStatus,setMidiStatus]=useState('off'),[midiDevices,setMidiDevices]=useState([]),[midiMessage,setMidiMessage]=useState(null),[midiMappings,setMidiMappings]=useState(loadMidiMappings),[learnTarget,setLearnTarget]=useState(null),[recordingOpen,setRecordingOpen]=useState(false),[recording,setRecording]=useState(()=>recordingManager.snapshot()),[karaokeOpen,setKaraokeOpen]=useState(false),[googleDriveOpen,setGoogleDriveOpen]=useState(false),[googleDriveError,setGoogleDriveError]=useState(null),[mappingManagerOpen,setMappingManagerOpen]=useState(false),[mappingManagerTab,setMappingManagerTab]=useState('library');
 const deckTrackRef=useRef({A:null,B:null});const demoLoadAttempted=useRef(false);const initialDemoPreloaded=useRef(false);
 const autoDJShuffle=settings.autoDJ.queueMode==='shuffle';
 const visibleDecks=[sections.deckA,sections.mixer,sections.deckB].filter(Boolean).length;
 const deckGridClass=isSingleTabDeckView?'grid gap-3':visibleDecks===3?'grid gap-3 sm:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,3fr)] md:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,5fr)] xl:grid-cols-[minmax(0,39fr)_minmax(0,22fr)_minmax(0,39fr)]':visibleDecks===2?'grid gap-3 sm:grid-cols-2 xl:grid-cols-2':'grid gap-3';
 const toggleSection=key=>setSections(current=>({...current,[key]:!current[key]}));
  const deckClass=(key,tab)=>!sections[key]?'hidden':!isSingleTabDeckView?'':mobileTab===tab?'':'hidden';
  const mobileTabs=[sections.deckA&&{tab:'A',label:'DECK A'},sections.mixer&&{tab:'MIX',label:'MIXER'},sections.deckB&&{tab:'B',label:'DECK B'}].filter(Boolean);
  useEffect(()=>{const map={A:'deckA',MIX:'mixer',B:'deckB'};if(!sections[map[mobileTab]]){const next=['A','MIX','B'].find(t=>sections[map[t]]);if(next&&next!==mobileTab)setMobileTab(next);}},[sections,mobileTab]);
 useEffect(()=>localStorage.setItem('crosscue-view-sections',JSON.stringify(sections)),[sections]);
 useEffect(()=>localStorage.setItem('crosscue-local-tracks',JSON.stringify(tracks.map(track=>track.type==='youtube'?{id:track.id,type:track.type,name:track.name,artist:track.artist,url:track.url,supports:track.supports}:track.type==='google_drive'?{id:track.id,type:track.type,provider:track.provider,providerFileId:track.providerFileId,name:track.name,fileName:track.fileName,fileSize:track.fileSize,mimeType:track.mimeType,modifiedTime:track.modifiedTime,supports:track.supports,fileRequired:false,analysisStatus:track.analysisStatus,bpm:track.bpm,key:track.key,camelot:track.camelot,analysisBpm:track.analysisBpm,analysisBpmConfidence:track.analysisBpmConfidence,analysisDuration:track.analysisDuration,analysisUpdatedAt:track.analysisUpdatedAt,analysisKey:track.analysisKey,analysisKeyCamelot:track.analysisKeyCamelot,analysisKeyConfidence:track.analysisKeyConfidence,analysisFingerprint:track.analysisFingerprint}:{...track,file:undefined,fileRequired:!track.sourceUrl}))),[tracks]);
 useEffect(()=>localStorage.setItem('crosscue-playlists',JSON.stringify(playlists)),[playlists]);
 const makeTrack=(file,id=trackId(file))=>({...sourceProviders.local.create(file),id,supports:sourceProviders.local.supports,fileRequired:false,fileMeta:{name:file.name,size:file.size,lastModified:file.lastModified}});
 const makeRemoteDescriptor=(item,artist,genre)=>({id:item.id,name:item.name,artist,genre,type:'local',sourceUrl:item.url,supports:sourceProviders.local.supports,fileRequired:false});
const mergeAnalysisFields=(t,analysis)=>{const bpmValid=analysis.bpm?.value>0&&analysis.bpm?.confidence>=0.65;const keyValid=Boolean(analysis.keyAnalysis?.key);return {...t,analysisStatus:'ready',analysisFingerprint:analysis.trackFingerprint??t.analysisFingerprint,analysisBpm:analysis.bpm?.value||t.analysisBpm||0,analysisBpmConfidence:analysis.bpm?.confidence||t.analysisBpmConfidence||0,analysisDuration:analysis.duration??t.analysisDuration,analysisUpdatedAt:analysis.state?.analyzedAt??t.analysisUpdatedAt,analysisKey:analysis.keyAnalysis?.key||t.analysisKey||'',analysisKeyCamelot:analysis.keyAnalysis?.camelot||t.analysisKeyCamelot||'',analysisKeyConfidence:analysis.keyAnalysis?.confidence||t.analysisKeyConfidence||0,bpm:bpmValid?analysis.bpm.value:(t.bpm||0),key:keyValid?analysis.keyAnalysis.key:(t.key||''),camelot:keyValid?(analysis.keyAnalysis.camelot||''):(t.camelot||'')};};const analyzeTrack=(track,priority=false)=>{if(!track.file)return;setTracks(items=>items.map(t=>t.id===track.id?{...t,analysisStatus:'analyzing'}:t));analysisService.analyze(track.file,{priority}).then(analysis=>setTracks(items=>items.map(t=>t.id===track.id?mergeAnalysisFields(t,analysis):t))).catch(()=>setTracks(items=>items.map(t=>t.id===track.id?{...t,analysisStatus:'failed'}:t)));};
const applyAnalysis=(id,source,deckHook)=>{analysisService.analyze(source.file,{priority:true,existingBpm:deckHook.deck.bpm||0}).then(analysis=>{if(deckTrackRef.current[id]===source.id){if(analysis.bpm?.value>0&&analysis.bpm?.confidence>=0.65)deckHook.update({bpm:analysis.bpm.value});if(analysis.waveform?.resolutions?.overview?.peaks)deckHook.update({analyzedPeaks:analysis.waveform.resolutions.overview.peaks});if(analysis.keyAnalysis?.key)deckHook.update({key:analysis.keyAnalysis.key,camelot:analysis.keyAnalysis.camelot||''});}setTracks(items=>items.map(t=>t.id===source.id?mergeAnalysisFields(t,analysis):t));}).catch(()=>setTracks(items=>items.map(t=>t.id===source.id?{...t,analysisStatus:'failed'}:t)));};
 useEffect(()=>{setTracks(items=>{const byId=new Map(items.map(t=>[t.id,t]));const sampleDescriptors=DEFAULT_SAMPLES.map(s=>{const existing=byId.get(s.id);return existing?{...existing,name:s.name,sourceUrl:s.url,fileRequired:false}:makeRemoteDescriptor(s,'CROSSCUE Sample','Sample');});const demoDescriptors=DEMO_TRACKS.map(d=>{const existing=byId.get(d.id);return existing?{...existing,name:d.name,sourceUrl:d.url,fileRequired:false}:makeRemoteDescriptor(d,'CROSSCUE Demo','Demo Track');});const sysIds=new Set([...DEFAULT_SAMPLES.map(s=>s.id),...DEMO_TRACKS.map(d=>d.id)]);return [...demoDescriptors,...sampleDescriptors,...items.filter(t=>!sysIds.has(t.id))];});setPlaylists(items=>{const sampleIds=DEFAULT_SAMPLES.map(s=>s.id),demoIds=DEMO_TRACKS.map(d=>d.id);let next=[...items];const hasSamples=next.find(p=>p.name==='Samples');next=hasSamples?next.map(p=>p.id===hasSamples.id?{...p,trackIds:sampleIds}:p):[...next,{id:'playlist-samples',name:'Samples',trackIds:sampleIds}];const hasDemos=next.find(p=>p.name==='Demo Tracks');next=hasDemos?next.map(p=>p.id===hasDemos.id?{...p,trackIds:demoIds}:p):[...next,{id:'playlist-demo-tracks',name:'Demo Tracks',trackIds:demoIds}];return next;});},[]);
 const addFiles=files=>{const valid=files.filter(isAudio);const oversized=valid.filter(f=>f.size>MAX_FILE_SIZE);if(oversized.length){toast({title:'File too large',description:oversized.length+' file(s) exceed 100MB and cannot be loaded. Split long sets into smaller segments (45-60 min each).',variant:'destructive'});}const added=valid.filter(f=>f.size<=MAX_FILE_SIZE).map(file=>makeTrack(file));setTracks(items=>added.reduce((next,track)=>[...next.filter(item=>item.id!==track.id),track],items));Promise.all(added.map(async track=>({id:track.id,metadata:await readId3Metadata(track.file)}))).then(tags=>setTracks(items=>items.map(track=>{const tag=tags.find(item=>item.id===track.id)?.metadata;return tag?{...track,...tag}:track;})));added.forEach(track=>analyzeTrack(track,false));return added};
 const reconnect=(id,file)=>{if(!isAudio(file))return;const track=makeTrack(file,id);setTracks(items=>[...items.filter(item=>item.id!==id),track]);analyzeTrack(track,false);};
 const removeTrack=ids=>{const removed=Array.isArray(ids)?ids:[ids];setTracks(items=>items.filter(item=>!removed.includes(item.id)));}; const updateTrack=(id,data)=>setTracks(items=>items.map(item=>item.id===id?{...item,...data}:item));
 const assignSampler=(deck,slot,track)=>(deck==='A'?samplerA:samplerB).assignTrack(slot,track);
 const recordLoad=(id,source)=>setHistory(items=>{const next=[{id:`${Date.now()}-${id}`,trackId:source.id||source.url,name:source.name||'YouTube source',source:source.type||'local',loadedAt:new Date().toISOString(),deck:id},...items].slice(0,100);localStorage.setItem('crosscue-history',JSON.stringify(next));return next});
 const loadTrack=async(id,source,opts={})=>{
  if(source.type==='google_drive'&&!hasPremiumAccess(permission)){
    setFreemiumModal({open:true,feature:'drive'});
    return;
  }
  let resolved;try{resolved=await resolveTrackForPlayback(source);}catch(err){if(source.type==='google_drive'){const data=err.response?.data||err;setGoogleDriveError(data.notConnected?'Google Drive connection required. Reconnect to load this track.':data.error||err.message||'Failed to load Google Drive track');setGoogleDriveOpen(true);}return;}if(!resolved||(resolved.type==='local'&&!(resolved.file instanceof Blob)))return;deckTrackRef.current[id]=source.id;if(resolved.file instanceof Blob&&!(source.file instanceof Blob)){readId3Metadata(resolved.file).then(meta=>{setTracks(items=>items.map(t=>t.id===source.id?{...t,...meta,name:source.name||meta?.name||t.name,file:resolved.file,fileRequired:false}:t));}).catch(()=>{setTracks(items=>items.map(t=>t.id===source.id?{...t,file:resolved.file,fileRequired:false}:t));});}const deckHook=id==='A'?a:b;const result=await deckHook.load(resolved,{defaultPitch:typeof settings.audio.defaultPitchOffset==='number'?settings.audio.defaultPitchOffset:0,autoGain:Boolean(settings.audio.autoGain),autoPlay:Boolean(opts?.autoPlay)});if(result?.bpm)setTracks(items=>items.map(track=>track.id===source.id?{...track,bpm:result.bpm}:track));recordLoad(id,source);if(resolved.type==='local'&&resolved.file)applyAnalysis(id,{...resolved,id:source.id},deckHook)};
 const loadFile=(id,file)=>{const [source]=addFiles([file]);if(source)loadTrack(id,source)};
const existingDriveFileIds=new Set(tracks.filter(t=>t.type==='google_drive').map(t=>t.providerFileId));
const addDriveTracksToLibrary=driveTracks=>{const arr=Array.isArray(driveTracks)?driveTracks:[driveTracks];setTracks(items=>{const seen=new Set(items.filter(t=>t.type==='google_drive').map(t=>t.providerFileId));const added=[];for(const dt of arr){if(seen.has(dt.id))continue;seen.add(dt.id);added.push(createDriveTrackDescriptor(dt));}return added.length?[...added,...items]:items;});};
const addDriveTracksToPlaylistConfirm=(driveTracks,playlistId)=>{const arr=Array.isArray(driveTracks)?driveTracks:[driveTracks];const existingIds=new Map(tracks.filter(t=>t.type==='google_drive').map(t=>[t.providerFileId,t.id]));const newTracks=[];const trackIds=[];for(const dt of arr){const existingId=existingIds.get(dt.id);if(existingId){trackIds.push(existingId);continue;}const track=createDriveTrackDescriptor(dt);existingIds.set(dt.id,track.id);newTracks.push(track);trackIds.push(track.id);}if(newTracks.length)setTracks(items=>[...newTracks,...items]);setPlaylists(items=>items.map(p=>p.id===playlistId?{...p,trackIds:[...new Set([...p.trackIds,...trackIds])]}:p));};
const createPlaylistWithDriveTracks=(name,driveTracks)=>{const arr=Array.isArray(driveTracks)?driveTracks:[driveTracks];const existingIds=new Map(tracks.filter(t=>t.type==='google_drive').map(t=>[t.providerFileId,t.id]));const newTracks=[];const trackIds=[];for(const dt of arr){const existingId=existingIds.get(dt.id);if(existingId){trackIds.push(existingId);continue;}const track=createDriveTrackDescriptor(dt);existingIds.set(dt.id,track.id);newTracks.push(track);trackIds.push(track.id);}if(newTracks.length)setTracks(items=>[...newTracks,...items]);setPlaylists(items=>[...items,{id:`playlist-${Date.now()}`,name,trackIds}]);};
  const playableTrack=t=>t.type==='youtube'||t.type==='google_drive'||t.file instanceof Blob||Boolean(t.sourceUrl);
const loadRelative=(id,direction)=>{const list=selectedPlaylist?(playlists.find(p=>p.id===selectedPlaylist)?.trackIds||[]).map(tid=>tracks.find(t=>t.id===tid)).filter(Boolean):tracks;const currentId=deckTrackRef.current[id];const idx=list.findIndex(t=>t.id===currentId);if(idx===-1){if(direction>0){const i=list.findIndex(playableTrack);if(i!==-1)loadTrack(id,list[i]);}else{for(let i=list.length-1;i>=0;i--){if(playableTrack(list[i])){loadTrack(id,list[i]);break;}}}return;}let i=idx+direction;while(i>=0&&i<list.length){if(playableTrack(list[i])){loadTrack(id,list[i]);return;}i+=direction;}};
const loadRandom=(id)=>{const list=selectedPlaylist?(playlists.find(p=>p.id===selectedPlaylist)?.trackIds||[]).map(tid=>tracks.find(t=>t.id===tid)).filter(Boolean):tracks;const playable=list.filter(playableTrack);if(!playable.length)return;const currentId=deckTrackRef.current[id];let pool=playable.length>1?playable.filter(t=>t.id!==currentId):playable;if(!pool.length)pool=playable;loadTrack(id,pool[Math.floor(Math.random()*pool.length)]);};
const handlePrev=(id)=>{const deckHook=id==='A'?a:b;if(deckHook.deck.type&&deckHook.deck.elapsed>2){deckHook.seek(0);return;}loadRelative(id,-1);};
const handleNext=(id)=>{if(autoDJShuffle){loadRandom(id);return;}loadRelative(id,1);};
 const loadYouTube=(id,url)=>{const source={...sourceProviders.youtube.create(url),id:`youtube-${url}`,artist:'YouTube',videoVisible:settings.interface.showVideoOnLoad,supports:sourceProviders.youtube.supports};setTracks(items=>[source,...items.filter(item=>item.id!==source.id)]);loadTrack(id,source);};
  const crossfaderCurveRef = useRef(settings.audio.crossfaderCurve);
  crossfaderCurveRef.current = settings.audio.crossfaderCurve;
  const crossDamperRef = useRef(null);
  if (!crossDamperRef.current) {
    crossDamperRef.current = new CrossfaderDamper({
      tau: 0.075,
      onUpdate: (value) => {
        setCross(value);
        audioEngine.crossfade(value);
        a.setCrossfade(value, crossfaderCurveRef.current);
        b.setCrossfade(value, crossfaderCurveRef.current);
      }
    });
  }
  const setMix = useCallback((value) => {
    crossDamperRef.current?.setTarget(value);
  }, []);
  useEffect(() => () => crossDamperRef.current?.dispose(), []);
  useEffect(()=>{audioEngine.crossfade(cross);a.setCrossfade(cross,settings.audio.crossfaderCurve);b.setCrossfade(cross,settings.audio.crossfaderCurve);},[cross,a.deck.type,b.deck.type,settings.audio.crossfaderCurve]);
  const autoDJControls=useAutoDJ({enabled:autoDJ,playlists,selectedPlaylist,tracks,decks:{A:a,B:b},transitionStart:settings.autoDJ.transitionStart,crossfadeDuration:settings.autoDJ.crossfadeDuration,crossfaderCurve:settings.audio.crossfaderCurve,queueMode:settings.autoDJ.queueMode,onEnable:()=>setAutoDJ(true),onDisable:()=>setAutoDJ(false),onCrossChange:pos=>crossDamperRef.current?.setCurrent(pos),onError:msg=>toast({title:'AutoDJ',description:msg,variant:'destructive'})});
 const toggleAutoDJShuffle=()=>update('autoDJ',{queueMode:settings.autoDJ.queueMode==='shuffle'?'playlist':'shuffle'});
 const togglePfl=id=>setPfl(current=>{const active=!current[id];audioEngine.setPfl(id,active);return {...current,[id]:active};});
 const syncDeck=id=>{const follower=id==='A'?a:b,master=id==='A'?b:a,result=follower.syncTo(effectiveBpm(master.deck));if(result.ok){master.setSyncMaster();setSyncState({master:id==='A'?'B':'A',follower:id,limit:null});}else setSyncState({master:null,follower:null,limit:id});};
  const applyContinuousControl = useCallback((target, value) => {
    const deck = target.endsWith(' A') ? a : b;
    const id = target.endsWith(' A') ? 'A' : 'B';
    if (target === `PITCH ${id}`) {
      deck.update({ pitch: 15 - value * 30 });
    } else if (target === `GAIN ${id}`) {
      deck.update({ gain: value * 2 });
    } else if (['HIGH', 'MID', 'LOW'].some(name => target === `${name} ${id}`)) {
      const eqBand = target.split(' ')[0].toLowerCase();
      deck.update({ [eqBand]: midiToEqDb(value) });
    } else if (target === `FILTER ${id}`) {
      deck.update({ filter: 100 + value * 19900 });
    } else if (target === `CHANNEL FADER ${id}`) {
      let faderVol = value;
      if (faderVol <= 0.02) faderVol = 0;
      else if (faderVol >= 0.98) faderVol = 1;
      else faderVol = (faderVol - 0.02) / 0.96;
      faderVol = Math.max(0, Math.min(1, faderVol));
      deck.update({ volume: faderVol, volumeDb: faderVol > 0 ? gainToDb(faderVol) : -60 });
    } else if (target === 'CROSSFADER') {
      let cfVal = value;
      if (cfVal <= 0.035) cfVal = 0;
      else if (cfVal >= 0.965) cfVal = 1;
      else cfVal = (cfVal - 0.035) / 0.93;
      cfVal = Math.max(0, Math.min(1, cfVal));
      setMix(-1 + cfVal * 2);
    } else if (target === 'MASTER') {
      update('audio', { masterGain: dbToGain(-60 + value * 70) });
    } else if (target === 'HEADPHONES') {
      update('audio', { headphoneLevel: dbToGain(-60 + value * 70) });
    } else if (target === 'BOOTH') {
      update('audio', { boothLevel: dbToGain(-60 + value * 70) });
    } else if (target === 'CUE / MASTER MIX') {
      update('audio', { headphoneMix: value });
    }
  }, [a, b, setMix, update]);
  const applyContinuousControlRef = useRef(applyContinuousControl);
  applyContinuousControlRef.current = applyContinuousControl;
  const jogScratchStateRef = useRef({
    A: { timer: null, wasPlaying: false, active: false, touched: false },
    B: { timer: null, wasPlaying: false, active: false, touched: false }
  });
  const handleJogTouch = useCallback((deckId, isTouching) => {
    const deckHook = deckId === 'A' ? a : b;
    const scratchState = jogScratchStateRef.current[deckId];
    scratchState.touched = isTouching;
    if (isTouching) {
      clearTimeout(scratchState.timer);
      if (!scratchState.active) {
        scratchState.active = true;
        scratchState.wasPlaying = deckHook.scratchStart();
      }
      deckHook.scratchBy(0);
      audioEngine.setVelocity(deckId, 0);
    } else {
      clearTimeout(scratchState.timer);
      if (scratchState.active) {
        scratchState.active = false;
        deckHook.scratchEnd(scratchState.wasPlaying);
      }
    }
  }, [a, b]);
  const handleJogMovement = useCallback((deckId, message, explicitMode = 'auto') => {
    const deckHook = deckId === 'A' ? a : b;
    const scratchState = jogScratchStateRef.current[deckId];
    const { delta, detectedMode } = jogDetector.processJogMessage(message, explicitMode);
    if (delta === 0) return;
    if (!scratchState.active) {
      scratchState.active = true;
      scratchState.wasPlaying = deckHook.scratchStart();
    }
    deckHook.scratchBy(delta * 18);
    clearTimeout(scratchState.timer);
    scratchState.timer = setTimeout(() => {
      if (!scratchState.touched) {
        scratchState.active = false;
        deckHook.scratchEnd(scratchState.wasPlaying);
      } else {
        deckHook.scratchBy(0);
        audioEngine.setVelocity(deckId, 0);
      }
    }, 85);
  }, [a, b]);
  const runMidi = (target, value, message, mapping) => {
    const samplerTarget = target.match(/^SAMPLER ([AB]) PAD ([1-8])$/);
    if (samplerTarget) {
      if (message.type !== 'noteoff') (samplerTarget[1] === 'A' ? samplerA : samplerB).play(Number(samplerTarget[2]) - 1);
      return;
    }
    const deck = target.endsWith(' A') ? a : b, id = target.endsWith(' A') ? 'A' : 'B';
    if (message.type === 'noteoff' || (message.type === 'cc' && message.value === 0)) {
      if (mapping.mode === 'momentary') {
        if (target === `CUE ${id}`) deck.cueUp();
        else if (target === `JOG TOUCH ${id}`) handleJogTouch(id, false);
      }
      return;
    }
    if (target === `JOG TOUCH ${id}`) {
      handleJogTouch(id, true);
      return;
    }
    if (target === `PLAY ${id}`) {
      if (!deck.deck.playing) trackEvent('playback_start', { deck: id }, permission.isAnonymous);
      deck.toggle();
    }
    else if (target === `CUE ${id}`) {
      deck.cueDown();
    }
    else if (target === `SYNC ${id}`) syncDeck(id);
    else if (target === `LOAD ${id}`) document.querySelector(`[data-deck-id="${id}"] input[type="file"]`)?.click();
    else if (target === `LOOP ${id}`) deck.toggleLoop();
    else if (target === `REPLAY ${id}`) deck.toggleReplay();
    else if (target === `CUE 1 ${id}`) deck.hotCue(1);
    else if (target === `CUE 2 ${id}`) deck.hotCue(2);
    else if (target === `PITCH - ${id}`) deck.update({ pitch: deck.deck.pitch - .1 });
    else if (target === `PITCH + ${id}`) deck.update({ pitch: deck.deck.pitch + .1 });
    else if (target === `VINYL ${id}`) deck.update({ vinyl: !deck.deck.vinyl });
    else if (target === `KEY LOCK ${id}`) deck.toggleKeyLock();
    else if (target === 'AUTO DJ') {
      setAutoDJ(active => !active);
    }
    else if (target === 'SHUFFLE') toggleAutoDJShuffle();
  };
  const midiMappingsRef = useRef(midiMappings);
  midiMappingsRef.current = midiMappings;
  const midiOpenRef = useRef(midiOpen);
  midiOpenRef.current = midiOpen;
  useEffect(() => {
    const stop = midiManager.subscribe(event => {
      if (event.devices) setMidiDevices(event.devices);
      if (event.status) {
        setMidiStatus(s => (event.status === 'active' || event.status === 'ready') ? 'ready' : event.status);
      }
      if (event.message) {
        if (midiOpenRef.current) setMidiMessage(event.message);
        if (learnTarget) {
          if (event.message.type !== 'noteoff') {
            const isJogTarget = learnTarget === 'JOG A' || learnTarget === 'JOG B';
            if (isJogTarget && event.message.type !== 'cc') {
              return;
            }
            const isJogTouchTarget = learnTarget === 'JOG TOUCH A' || learnTarget === 'JOG TOUCH B';
            const numberToMap = (event.message.type === 'cc' && (event.message.number === 32 || event.message.number === 51 || event.message.number === 63))
              ? event.message.number - 32
              : event.message.number;
            const mapping = {
              id: `${Date.now()}-${event.message.device.id}-${numberToMap}`,
              deviceId: event.message.device.id,
              deviceName: event.message.device.name,
              manufacturer: event.message.device.manufacturer,
              channel: event.message.channel,
              type: event.message.type,
              number: numberToMap,
              target: learnTarget,
              mode: isJogTarget ? 'continuous' : isJogTouchTarget ? 'momentary' : defaultMode(event.message.type)
            };
            setMidiMappings(current => {
              const filtered = current.filter(m => m.target !== learnTarget);
              const next = [...filtered, mapping];
              saveMidiMappings(next);
              mappingLibraryStore.updateRuntime(() => next);
              return next;
            });
            setLearnTarget(null);
          }
        } else {
          const matching = midiMappingsRef.current.filter(mapping => matchesMapping(mapping, event.message));
          if (matching.length) {
            const decodedValue = midiSmoother.decodeContinuous(event.message);
            matching.forEach(mapping => {
              if (mapping.target === 'JOG A') {
                handleJogMovement('A', event.message, mapping.mode === 'continuous' ? 'auto' : mapping.mode);
              } else if (mapping.target === 'JOG B') {
                handleJogMovement('B', event.message, mapping.mode === 'continuous' ? 'auto' : mapping.mode);
              } else if (mapping.mode === 'continuous') {
                midiSmoother.setTarget(mapping.target, decodedValue, (smoothedVal) => {
                  applyContinuousControlRef.current?.(mapping.target, smoothedVal);
                });
              } else {
                runMidi(mapping.target, event.message.normalized, event.message, mapping);
              }
            });
          } else if (event.message.number === 54 && (event.message.type === 'noteon' || event.message.type === 'noteoff')) {
            const deckId = event.message.channel === 2 ? 'B' : 'A';
            const isTouching = event.message.type === 'noteon' && event.message.value > 0;
            handleJogTouch(deckId, isTouching);
          }
        }
      }
    });
    return stop;
  }, [learnTarget, a, b]);
  useEffect(() => {
    if (typeof a.deck.pitch === 'number') midiSmoother.syncCurrent('PITCH A', (15 - a.deck.pitch) / 30);
  }, [a.deck.pitch]);
  useEffect(() => {
    if (typeof b.deck.pitch === 'number') midiSmoother.syncCurrent('PITCH B', (15 - b.deck.pitch) / 30);
  }, [b.deck.pitch]);
  useEffect(() => {
    if (typeof a.deck.volume === 'number') midiSmoother.syncCurrent('CHANNEL FADER A', a.deck.volume);
  }, [a.deck.volume]);
  useEffect(() => {
    if (typeof b.deck.volume === 'number') midiSmoother.syncCurrent('CHANNEL FADER B', b.deck.volume);
  }, [b.deck.volume]);
  useEffect(() => {
    midiSmoother.syncCurrent('CROSSFADER', (cross + 1) / 2);
  }, [cross]);
  useEffect(() => () => midiSmoother.dispose(), []);
 useEffect(()=>mappingLibraryStore.subscribe(()=>{const runtime=mappingLibraryStore.getRuntimeMappings();setMidiMappings(current=>{if(current.length===runtime.length&&current.every((m,i)=>m.id===runtime[i]?.id))return current;return runtime;});}),[]);
 const enableMidi=async()=>{setMidiOpen(true);update('midi',{enabled:true});await midiManager.enable();};
 useEffect(()=>{if(embedded)return;if(settings.midi.enabled){midiManager.autoConnectIfGranted();}return()=>{};},[embedded,settings.midi.enabled]);
 const resetMix=useCallback(()=>{
  setAutoDJ(false);
  audioEngine.cancelAutoFade();
  crossDamperRef.current?.setCurrent(0);
  setCross(0);
  audioEngine.crossfade(0);
  setPfl({A:false,B:false});
  audioEngine.setPfl('A',false);
  audioEngine.setPfl('B',false);
  setSyncState({master:null,follower:null,limit:null});
  const defaultPitch=typeof settings.audio.defaultPitchOffset==='number'?settings.audio.defaultPitchOffset:0;
  const defaults={volume:0.5011872336271223,volumeDb:-6,gain:1,high:0,mid:0,low:0,filter:20000,echo:0,reverb:0,pitch:defaultPitch,keyLock:false,replay:false,loop:{active:false},loopMessage:null,syncRole:null,syncLimit:false};
  audioEngine.setLoop('A',null);
  audioEngine.setLoop('B',null);
  a.update(defaults);
  b.update(defaults);
  const demoA=tracks.find(item=>item.id==='demo-dmc-hero-10')||tracks.find(item=>item.id===DEMO_TRACKS[0]?.id);
  const demoB=tracks.find(item=>item.id==='demo-deephouse-plamen-dance')||tracks.find(item=>item.id===DEMO_TRACKS[1]?.id);
  if(demoA)loadTrack('A',demoA,{autoPlay:false});
  else{a.seek(0);a.setTransport(false);}
  if(demoB)loadTrack('B',demoB,{autoPlay:true});
  else{b.seek(0);b.setTransport(true);}
 },[a,b,tracks,settings.audio.defaultPitchOffset]);
 useEffect(()=>{const unsubscribe=recordingManager.subscribe(setRecording);return()=>{unsubscribe();recordingManager.destroy();};},[]);useEffect(()=>{const p=new URLSearchParams(window.location.search);const tid=p.get('demoTrack'),dk=p.get('deck');if(tid&&['A','B'].includes(dk)){if(demoLoadAttempted.current)return;const track=tracks.find(item=>item.id===tid);if(track&&(track.file instanceof Blob||track.sourceUrl)){demoLoadAttempted.current=true;initialDemoPreloaded.current=true;const otherDeck=dk==='A'?'B':'A';const fallbackDemo=tracks.find(item=>item.id!==tid&&DEMO_TRACKS.some(d=>d.id===item.id));loadTrack(dk,track);if(fallbackDemo&&!deckTrackRef.current[otherDeck])loadTrack(otherDeck,fallbackDemo);window.history.replaceState({},'',window.location.pathname);}return;}if(initialDemoPreloaded.current||deckTrackRef.current.A||deckTrackRef.current.B)return;const demoA=tracks.find(item=>item.id==='demo-dmc-hero-10')||tracks.find(item=>item.id===DEMO_TRACKS[0]?.id);const demoB=tracks.find(item=>item.id==='demo-deephouse-plamen-dance')||tracks.find(item=>item.id===DEMO_TRACKS[1]?.id);if(demoA&&demoB){initialDemoPreloaded.current=true;loadTrack('A',demoA,{autoPlay:false});loadTrack('B',demoB,{autoPlay:!embedded});}},[tracks]);
 useEffect(()=>{const p=settings.audio.defaultPitchOffset||0;const t=setTimeout(()=>{a.update({pitch:p});b.update({pitch:p});},150);return()=>clearTimeout(t);},[]);
 useEffect(()=>{document.documentElement.dataset.crosscueTheme=theme;audioEngine.setMasterGain(settings.audio.masterGain);audioEngine.setCrossfaderCurve(settings.audio.crossfaderCurve);audioEngine.setOutputDevice(settings.audio.outputDeviceId);audioEngine.setHeadphone({level:settings.audio.headphoneLevel,mix:settings.audio.headphoneMix});audioEngine.setBoothLevel(settings.audio.boothLevel);return()=>{delete document.documentElement.dataset.crosscueTheme;};},[theme,settings.audio.masterGain,settings.audio.crossfaderCurve,settings.audio.outputDeviceId,settings.audio.headphoneLevel,settings.audio.headphoneMix,settings.audio.boothLevel,a.deck.type,b.deck.type]);
 const changeOutput=async outputDeviceId=>{const applied=await audioEngine.setOutputDevice(outputDeviceId);update('audio',{outputDeviceId:applied?outputDeviceId:'default'});};
 const changeFullscreen=fullscreen=>{update('interface',{fullscreen});if(fullscreen)document.documentElement.requestFullscreen?.();else if(document.fullscreenElement)document.exitFullscreen?.();};
 const resetSettings=()=>{reset();if(document.fullscreenElement)document.exitFullscreen?.();};
 const startRecording=sessionName=>{
  if(!hasPremiumAccess(permission)){
    setRecordingOpen(false);
    setFreemiumModal({open:true,feature:'recording'});
    return;
  }
  recordingManager.start(audioEngine,{sessionName,djName:settings.interface.djIdentityMode==='text'?settings.interface.djName:''});
 };
 useEffect(() => {
  if (!window.__TAURI_INTERNALS__ && !window.__TAURI__) return;

  let unlisten;
  import('@tauri-apps/api/event').then(({ listen }) => {
    listen('menu-event', (event) => {
      const id = event.payload;
      if (id === 'toggle_deck_a') setSections(s => ({ ...s, deckA: !s.deckA }));
      if (id === 'toggle_mixer') setSections(s => ({ ...s, mixer: !s.mixer }));
      if (id === 'toggle_deck_b') setSections(s => ({ ...s, deckB: !s.deckB }));
      if (id === 'toggle_library') setSections(s => ({ ...s, library: !s.library }));
      if (id === 'open_settings') setSettingsOpen(true);
      if (id === 'open_midi') setMidiOpen(true);
      if (id === 'open_recording') setRecordingOpen(true);
      if (id === 'open_karaoke') setKaraokeOpen(o => !o);
    }).then(fn => { unlisten = fn; });
  });

  return () => { if (unlisten) unlisten(); };
}, []); const flagCode=theme.startsWith('flag-')?theme.slice(5):null;
 const chassisStyle={...(flagCode?flagThemeVars(flagCode):{}),...(customChassis?.mode==='colors'&&customChassis?.colors?.length>=2?{'--custom-chassis-bg':`linear-gradient(135deg,${customChassis.colors[0]} 0%,${customChassis.colors[1]} 100%)`,'--custom-chassis-accent':customChassis.colors[1]}:{}),...(customChassis?.mode==='image'&&chassisImageUrl?{'--custom-chassis-image':`url('${chassisImageUrl}')`}:{})};
 return <main data-crosscue-app data-crosscue-theme={theme} data-custom-chassis={customChassis?.mode||'none'} data-show-waveform={settings.interface.showWaveform?'true':'false'} data-device-type={deviceProfile.deviceType} data-layout-mode={deviceProfile.layoutMode} data-os={deviceProfile.os} style={chassisStyle||undefined} className="crosscue-app min-h-[100dvh] bg-[#0b0b0a] p-3 text-[#e8dec5]"><header className="equipment-panel mb-3 flex flex-wrap items-center gap-3 py-2"><div><h1 className="font-serif text-2xl tracking-[.15em] text-[#d5ad58]">CROSSCUE</h1><p className="text-[10px] tracking-[.18em] text-[#a49778]">VINTAGE VIRTUAL TURNTABLES</p></div>{!embedded&&permission.isAnonymous&&permission.trialToken&&!permission.needsOnboarding&&<TrialStatusIndicator nickname={permission.djNickname} remainingSeconds={permission.remainingSeconds} entitlementType={permission.entitlementType} active={!permission.trialExpired}/>}<button className="metal-button ml-auto lg:hidden" onClick={()=>setHeaderOpen(o=>!o)}>{headerOpen?<X size={14}/>:<Menu size={14}/>}</button><div className={`${headerOpen?'flex':'hidden'} lg:flex w-full lg:w-auto lg:ml-auto flex-wrap items-center gap-2`}><ViewMenu sections={sections} onToggle={toggleSection}/><SourcePanel onYouTube={loadYouTube}/><button className="metal-button" onClick={()=>setSettingsOpen(true)}><Settings size={14}/> SETTINGS</button><button className={`metal-button ${learnTarget?'vinyl-active':''}`} onClick={enableMidi}><SlidersHorizontal size={14}/> MIDI {learnTarget?'LEARN':(midiStatus==='ready'||midiStatus==='active')?'READY':midiStatus==='denied'?'DENIED':'CONNECT'}</button><button className={`metal-button ${recording.status==='recording'?'vinyl-active':''}`} onClick={()=>requirePremium('recording',()=>setRecordingOpen(true))}><Radio size={14}/> {recording.status==='recording'?`● REC ${String(Math.floor(recording.elapsed/60000)).padStart(2,'0')}:${String(Math.floor(recording.elapsed/1000)%60).padStart(2,'0')}`:recording.status==='paused'?'REC PAUSED':'RECORDING'}</button><button className={`metal-button ${karaokeOpen?'vinyl-active':''}`} onClick={()=>setKaraokeOpen(o=>!o)}><Mic size={14}/> KARAOKE</button>{!isTauriDesktop() && <button className={`metal-button ${googleDriveOpen?'vinyl-active':''}`} onClick={()=>requirePremium('drive',()=>setGoogleDriveOpen(true))}><HardDrive size={14}/> DRIVE</button>}{!embedded&&!hasPremiumAccess(permission)&&<button className="metal-button border-amber-500/70 text-amber-300 hover:bg-amber-950/40" onClick={()=>setFreemiumModal({open:true,feature:'general'})} title="CROSSCUE Premium"><Crown size={14} className="text-amber-400"/> PREMIUM</button>}{!isTauriDesktop() && <Link to="/portal" className="metal-button"><UserCircle size={14}/> PORTAL</Link>}
{!isTauriDesktop() && <button className="metal-button" onClick={()=>base44.auth.logout('/')} title="Log out"><LogOut size={14}/> LOGOUT</button>}
{canFullscreen&&<button className="metal-button" onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize size={14}/></button>}</div></header>{isSingleTabDeckView&&<MobileLandscapeHint visible={deviceProfile.layoutMode==='mobile-portrait'}/>}{isSingleTabDeckView&&<MobileMixBar deckA={a.deck} deckB={b.deck} cursorA={a.cursor} cursorB={b.cursor} onToggleA={()=>{if(!a.deck.playing)trackEvent('playback_start',{deck:'A'},permission.isAnonymous);a.toggle();}} onToggleB={()=>{if(!b.deck.playing)trackEvent('playback_start',{deck:'B'},permission.isAnonymous);b.toggle();}} cross={cross} onCross={setMix} activeTab={mobileTab} onSelectTab={setMobileTab} autoDJ={autoDJ} onResetMix={resetMix}/>}{isSingleTabDeckView&&mobileTabs.length>1&&<div className="mb-2 flex gap-1">{mobileTabs.map(({tab,label})=><button key={tab} className={`metal-button flex-1 ${mobileTab===tab?'vinyl-active':''}`} onClick={()=>setMobileTab(tab)}>{label}</button>)}</div>}<div data-decks-layout className={deckGridClass}><div className={deckClass('deckA','A')}><Deck id="A" deck={a.deck} cursor={a.cursor} positionVersion={a.positionVersion} onLoad={file=>loadFile('A',file)} onTrack={id=>{const track=tracks.find(item=>item.id===id);if(track)loadTrack('A',track)}} onToggle={()=>{if(!a.deck.playing)trackEvent('playback_start',{deck:'A'},permission.isAnonymous);a.toggle();}} onUpdate={a.update} onScratchStart={a.scratchStart} onScratchBy={a.scratchBy} onScratchEnd={a.scratchEnd} onSeek={a.seek} onYouTubeReady={a.setYouTubePlayer} onYouTubeProgress={a.updateYouTubeProgress} onCueDown={a.cueDown} onCueUp={a.cueUp} onReplay={a.toggleReplay} onHotCue={a.hotCue} onLoop={a.toggleLoop} onSync={()=>syncDeck('A')} onPrev={()=>handlePrev('A')} onNext={()=>handleNext('A')} onEject={a.eject} onStop={a.stop} syncAvailable={Boolean(b.deck.bpm)} syncRole={syncState.master==='A'?'master':syncState.follower==='A'?'follower':null} syncLimit={syncState.limit==='A'} showMeter={sections.meters&&settings.interface.showVUMeters} sampler={samplerA}/></div><div className={deckClass('mixer','MIX')}><Mixer a={a.deck} b={b.deck} djIdentity={{...settings.interface,djName:djDisplayName}} onA={a.update} onB={b.update} cross={cross} onCross={setMix} autoDJ={autoDJ} onAutoDJ={()=>setAutoDJ(active=>!active)} autoDJWarning={autoDJ&&autoDJControls.skippedTracks.at(-1)} shuffle={autoDJShuffle} onToggleShuffle={toggleAutoDJShuffle} onResetMix={resetMix} pfl={pfl} onPfl={togglePfl} audio={settings.audio} onAudioUpdate={values=>update('audio',values)}/></div><div className={deckClass('deckB','B')}><Deck id="B" deck={b.deck} cursor={b.cursor} positionVersion={b.positionVersion} onLoad={file=>loadFile('B',file)} onTrack={id=>{const track=tracks.find(item=>item.id===id);if(track)loadTrack('B',track)}} onToggle={()=>{if(!b.deck.playing)trackEvent('playback_start',{deck:'B'},permission.isAnonymous);b.toggle();}} onUpdate={b.update} onScratchStart={b.scratchStart} onScratchBy={b.scratchBy} onScratchEnd={b.scratchEnd} onSeek={b.seek} onYouTubeReady={b.setYouTubePlayer} onYouTubeProgress={b.updateYouTubeProgress} onCueDown={b.cueDown} onCueUp={b.cueUp} onReplay={b.toggleReplay} onHotCue={b.hotCue} onLoop={b.toggleLoop} onSync={()=>syncDeck('B')} onPrev={()=>handlePrev('B')} onNext={()=>handleNext('B')} onEject={b.eject} onStop={b.stop} syncAvailable={Boolean(a.deck.bpm)} syncRole={syncState.master==='B'?'master':syncState.follower==='B'?'follower':null} syncLimit={syncState.limit==='B'} showMeter={sections.meters&&settings.interface.showVUMeters} sampler={samplerB}/></div></div><div className={sections.library?'':'hidden'}><Library tracks={tracks} history={history} onLoad={loadTrack} onAddFiles={addFiles} onReconnect={reconnect} onRemoveFromLibrary={removeTrack} playlists={playlists} setPlaylists={setPlaylists} selected={selectedPlaylist} setSelected={setSelectedPlaylist} onAutoDJ={(action,track)=>autoDJControls[action]?.(track)} onDeleteHistory={ids=>setHistory(items=>{const next=items.filter(item=>!ids.includes(item.id));localStorage.setItem('crosscue-history',JSON.stringify(next));return next;})} onAssignSampler={assignSampler} onUpdateTrack={updateTrack}/></div><MidiPanel open={midiOpen} language={lang} onClose={()=>setMidiOpen(false)} onOpenMappingManager={tab=>{requirePremium('midi_manager',()=>{setMappingManagerTab(tab||'library');setMappingManagerOpen(true);});}} status={midiStatus} devices={midiDevices} message={midiMessage} mappings={midiMappings} learnTarget={learnTarget} onLearn={setLearnTarget} onEdit={(id,values)=>setMidiMappings(current=>{const next=current.map(mapping=>mapping.id===id?{...mapping,...values}:mapping);saveMidiMappings(next);return next;})} onDelete={id=>setMidiMappings(current=>{const next=current.filter(mapping=>mapping.id!==id);saveMidiMappings(next);return next;})} onClear={()=>{setMidiMappings([]);saveMidiMappings([]);}}/><MappingManager open={mappingManagerOpen} language={lang} defaultTab={mappingManagerTab} onClose={()=>setMappingManagerOpen(false)}/><RecordingPanel open={recordingOpen} state={recording} onClose={()=>setRecordingOpen(false)} onStart={startRecording} onPause={()=>recordingManager.pause()} onResume={()=>recordingManager.resume()} onStop={()=>recordingManager.stop()} onDownload={()=>recordingManager.download()} onDiscard={()=>recordingManager.discard()}/><SettingsDialog open={settingsOpen} onClose={()=>setSettingsOpen(false)} settings={settings} onUpdate={update} onReset={resetSettings} onOutputChange={changeOutput} onFullscreen={changeFullscreen} permission={permission} language={lang}/><NetworkLossBanner visible={permission.lockState==='grace'} graceSecondsLeft={permission.graceSecondsLeft} language={lang}/>{karaokeOpen&&<KaraokePanel karaoke={karaoke} onClose={()=>setKaraokeOpen(false)}/>}<GoogleDriveBrowser open={googleDriveOpen} onClose={()=>{setGoogleDriveOpen(false);setGoogleDriveError(null);}} onLoadToDeck={(deckId,file)=>loadFile(deckId,file)} onAddToLibrary={addDriveTracksToLibrary} onAddToPlaylist={addDriveTracksToPlaylistConfirm} onCreatePlaylist={createPlaylistWithDriveTracks} playlists={playlists} existingDriveFileIds={existingDriveFileIds} error={googleDriveError} trialToken={permission.trialToken} isAnonymous={permission.isAnonymous}/><PlaybackLock open={showLock&&(permission.reason==='network_lost'||permission.reason==='no_server_connection')} onClose={()=>setShowLock(false)} reason={permission.reason} language={lang}/><FreemiumUpgradeModal open={freemiumModal.open} onClose={()=>setFreemiumModal({open:false,feature:'general'})} feature={freemiumModal.feature} permission={permission} language={lang} onStartTrial={()=>{setFreemiumModal({open:false,feature:'general'});setShowOnboarding(true);}}/>{showOnboarding&&<TrialOnboarding onClose={()=>setShowOnboarding(false)} onComplete={data=>{trackEvent('trial_started',{nickname:data.dj_nickname},true);permission.completeOnboarding(data);setShowOnboarding(false);toast({title:'Trial Started',description:'Your 40-minute trial for premium features is now active.'});}} onSignIn={()=>base44.auth.redirectToLogin('/studio')}/>}{!embedded&&permission.trialExpired&&!permission.feedbackSubmitted&&permission.trialToken&&!showLock&&!a.deck.playing&&!b.deck.playing&&<TrialFeedback trialToken={permission.trialToken} nickname={permission.djNickname} onSubmitted={permission.markFeedbackSubmitted} onUpgrade={()=>base44.auth.redirectToLogin('/portal')}/>}</main>;
}