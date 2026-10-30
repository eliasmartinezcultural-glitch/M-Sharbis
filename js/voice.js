window.JarvisVoice={
  supported:!!(window.SpeechRecognition||window.webkitSpeechRecognition),
  recognition:null, voices:[], selectedURI:localStorage.getItem("jarvis-voice-uri")||"",
  settings:{rate:Number(localStorage.getItem("jarvis-voice-rate")||"0.90"),pitch:Number(localStorage.getItem("jarvis-voice-pitch")||"0.72")},
  loadVoices(){
    if(!("speechSynthesis" in window))return [];
    this.voices=window.speechSynthesis.getVoices()||[];
    return this.voices;
  },
  spanishVoices(){
    return this.loadVoices().filter(v=>/^es([-_]|$)/i.test(v.lang));
  },
  preferredVoice(){
    const list=this.spanishVoices();
    if(this.selectedURI){const chosen=list.find(v=>v.voiceURI===this.selectedURI);if(chosen)return chosen;}
    const hints=["male","mascul","jorge","pablo","diego","carlos","andres","andrés","raul","raúl","miguel","antonio"];
    return list.find(v=>hints.some(h=>v.name.toLowerCase().includes(h)))||list.find(v=>/^es[-_]ar/i.test(v.lang))||list[0]||null;
  },
  setVoice(uri){this.selectedURI=uri;localStorage.setItem("jarvis-voice-uri",uri);},
  setSetting(key,value){this.settings[key]=Number(value);localStorage.setItem("jarvis-voice-"+key,String(value));},
  speak(text){
    if(!("speechSynthesis" in window))return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);u.lang="es-AR";u.rate=this.settings.rate;u.pitch=this.settings.pitch;
    const voice=this.preferredVoice();if(voice)u.voice=voice;
    window.speechSynthesis.speak(u);
  },
  listen(onText,onEnd,onError){
    const API=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!API){onError("Este navegador no ofrece reconocimiento de voz. Probá con Chrome y conexión a Internet.");return;}
    const r=new API();r.lang="es-AR";r.interimResults=true;r.maxAlternatives=1;
    r.onresult=e=>{let finalText="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript;}if(finalText.trim())onText(finalText.trim());};
    r.onerror=e=>onError(e.error==="not-allowed"?"Necesito permiso para usar el micrófono.":e.error==="no-speech"?"No detecté voz. Probá nuevamente.":"No pude reconocer la voz. Intentá nuevamente.");
    r.onend=()=>{this.recognition=null;onEnd();};this.recognition=r;
    try{r.start();}catch(e){this.recognition=null;onError("No pude iniciar el micrófono. Esperá un momento e intentá otra vez.");}
  },
  stop(){if(this.recognition)this.recognition.stop();},
  test(){this.speak("Sistemas operativos. Soy JARVIS. Estoy a tu disposición. Voz preparada. Esperando instrucciones.");}
};
if("speechSynthesis" in window){window.speechSynthesis.addEventListener("voiceschanged",()=>{window.JarvisVoice.loadVoices();document.dispatchEvent(new CustomEvent("jarvis:voices-ready"));});window.JarvisVoice.loadVoices();}
