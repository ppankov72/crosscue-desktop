export const DEMO_TRACKS=[
  {id:'demo-dmc-hero-10',name:'DMC Hero 1.0',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/faae088c4_DMCHero10.mp3'},
  {id:'demo-deephouse-plamen-dance',name:'DeepHouse Dj Mix (Remastered x2)',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/3b130badf_DeepHouseDJ_Plamen_Mix_dance_veraion.mp3'},
  {id:'demo-dmc-hero',name:'DMC Hero',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/aa447f86c_DMCHero.mp3'},
  {id:'demo-deephouse-plamen-radio',name:'DeepHouse DJ Plamen Mix (Radio)',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/9898165c9_DeepHouseDj_PlamenMix_radio.mp3'},
  {id:'demo-house-britpop',name:'House BritPop',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/b4a41990a_HouseBritPop.mp3'},
  {id:'demo-walking-through-the-fog',name:'Walking Through the Fog (Remastered)',url:'https://media.base44.com/videos/public/6a79fe2cc75208fe240db246/56bebfdc1_WalkingThroughtheFogRemastered.mp4'},
  {id:'demo-track-1',name:'Demo Track 1',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/d4929006f_DemoTrack1.mp3'},
  {id:'demo-track-2',name:'Demo Track 2',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/78cb8bbd2_DemoTrack2.mp3'},
  {id:'demo-genx-anthem',name:"Gen X Anthem — You're So Vibe",url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/292da6754__GenXAnthem_YoureSoVibe.mp3'},
  {id:'demo-electrical-destiny',name:'Electrical Destiny',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/dbda3b6ca_ElectricalDestiny.mp3'},
  {id:'demo-ohai-extended',name:'OHAI Extended Version',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/0b4ea56d2_OHAIextendedVersion.mp3'},
  {id:'demo-scratch-technics',name:'Scratch Technics',url:'https://media.base44.com/files/public/6a79fe2cc75208fe240db246/0f22392c5_scratch-technics_.mp3'}
];

export const getDemoTrackFile=async track=>{
  const blob=await fetch(track.url).then(response=>response.blob());
  const isMp4=/\.mp4(\?|$)/i.test(track.url);
  const ext=isMp4?'m4a':'mp3';
  const mime=isMp4?'audio/mp4':(blob.type&&blob.type.startsWith('audio/')?blob.type:'audio/mpeg');
  return new File([blob],`${track.name}.${ext}`,{type:mime});
};