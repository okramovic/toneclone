'use strict'

// make different sounds in sequence
// based on letters
// hear sound
// analyse sound
// get letters from sound

const freqs = []
let a = 43 //parseInt(context.sampleRate /1024)
let alph = [] //['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']
const dict = {
}
createDict()

const context = new Tone().context
console.log(context.sampleRate, context)

let recStream // contains recording stream

let mediaRecorder, audioChunks, recording,
analyser,
recurl,
mySound,
spectrum,
timer

let message = []

const toneLen = 240 /// 150


getS('#sndInfo').innerHTML = `${context.sampleRate}, ${a}`


getS('#startRec').onclick = startRecord
getS('#stopRec').onclick = stopRecord
/*getS('#playSound').onclick = async ()=> {
    //context = p5.soundOut.audiocontext
    console.log('au context', context)
    await context.resume()
    playSequence('aabb')//'abcdemlkj')
}
getS('#playRec').onclick = async ()=>{
    loop()
    mySound.play()
}*/
getS('#submit').onclick = async ev =>{
  const val = getS('#input').value
  if (!val) return;
  await context.resume() 
  playSequence(val)
}



function setup(){
  createCanvas(innerWidth, 255)
  frameRate(12)
  noLoop()
  strokeWeight(3)
}

//#region draw

function draw(){
  //console.log(frameRate())
    if (!analyser) return;
    //if (recurl && ! mySound) mySound = loadSound(recurl) 
      
    analyser.getFloatFrequencyData(spectrum);
    //console.log(spectrum, analyser.frequencyBinCount)
    const m = Math.max(...spectrum)
    let I = spectrum.indexOf(m)
    // debug - find all columns that have this value and prove this number is there always only once

    background(255)
    if (m<-60) return;
    
    
    
    //const thisF = freqs[I]
    //let char = dict[thisF]
    // f from - f till
    //console.log('   f?', thisF, I, char) //,  I*a, '-',(I+1)*a, '      ',char)
        
    //#region draw graph
    let len = spectrum.length/4
    for (let i=0; i<len; i++){
        let amp = spectrum[i]
        const x = map(i, 0, len, 0, width)
        //let y = map(amp, 0, 255, height,0)
        let y = map(amp, -150, 0, 0,height)
        line(x,height, x,height-y)
    }
    //#endregion draw graph
}
//#endregion draw

// listen for message
async function startRecord(){

    getS('a').style.display = 'none'
    getS('body').classList = ['active']

    await context.resume()

    recStream = await navigator.mediaDevices.getUserMedia({ audio: true })  //  https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b
    
    //var input = audioContext.createMediaStreamSource(stream);
    //var scriptNode = audioContext.createScriptProcessor(4096, 1, 1);

    mediaRecorder = new MediaRecorder(recStream)
    mediaRecorder.start()
    const tracks = recStream.getTracks()
    console.log('tracks', tracks)

    // volume https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/volume
    audioChunks = []
    mediaRecorder.addEventListener("dataavailable", event => audioChunks.push(event.data) )
    mediaRecorder.addEventListener("error", er =>{ console.log(er) })
    mediaRecorder.addEventListener("stop", async () => {
      clearInterval(timer)
      noLoop()

      const audioBlob = new Blob(audioChunks)
      recurl = URL.createObjectURL(audioBlob)
      recording = new Audio(recurl)
      
      if (context.sampleRate !== 48000){
        
        //const buf = await new Response(audioChunks).arrayBuffer()
        const fileReader = new FileReader();
        fileReader.onload = async function(event) {
            let buf = event.target.result
            console.log('buf', buf)
            const audioBuf = await context.decodeAudioData(buf)
            const resampled = await reSample(audioBuf, 48000)
            console.log('resampled', resampled)
            
        }
        fileReader.readAsArrayBuffer(audioBlob)
      }
      // mySound = loadSound(recurl)
      // mySound.onended = function(){
      // }
    })
    createAnalyser(recStream)
    collectLetters()
    loop()
}

function collectLetters(){
    clearInterval(timer)
    const millis = parseInt(toneLen/4)
    message = []

    timer = setInterval(()=>{

      if (!analyser) return console.log('analyser not ready')

      analyser.getFloatFrequencyData(spectrum);
      const m = Math.max(...spectrum)
      let I = spectrum.indexOf(m)
      
      if (m<-50) return;
      
      const thisF = freqs[I]
      const char = dict[thisF]
      if (char) message.push(char)
      //console.log('   f?', thisF, I, char)
      console.log('   f?', char)
      
      // autostop on _eom_
      if (!message.join('').match(/(\.*)(_+e+o+(n+)?m+_+)/)) return;
      else getS('#stopRec').click()

      return;
      // if last 10 messages are empty, turn of recording
      const from = message.length - 50
      let emptyCount = 0
      for (let i = from; i<message.length; i++){
        if (message[i]===undefined) emptyCount++
      }
      if (emptyCount>=30) getS('#stopRec').click()
      // debug - find all columns that have this value and prove this number is there always only once
    }, millis)
}

function createAnalyser(stream, audioEl){
    // https://webaudiodemos.appspot.com/AudioRecorder/index.html#
    // https://stackoverflow.com/questions/32782505/fft-analysis-with-javascript-how-to-find-a-specific-frequency

    const aCtx = context // new AudioContext() //new webkitAudioContext();
    analyser = aCtx.createAnalyser();
    const microphone = aCtx.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 1024;
    //analyser.connect(aCtx.destination);//analyser.minDecibels = -90;//analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.25;
    //console.log(analyser, 'bins', analyser.frequencyBinCount)
    spectrum = new Float32Array(analyser.frequencyBinCount);

    a = parseInt(context.sampleRate/analyser.frequencyBinCount)
    return;

    //#region from audio element
    //context = p5.soundOut.audiocontext // new AudioContext();
    console.log('got context', context)
    analyser = context.createAnalyser();
    //const source = context.createMediaElementSource(audio);
    const source = context.createMediaStreamSource(stream)
    //console.log(audio, source)
    source.connect(analyser);
    //stream.connect(analyser)
    analyser.connect(context.destination);
    analyser.fftSize = 1024;
    console.log(analyser)
    //#endregion from audio element
}

function stopRecord(){
    getS('body').classList = []

    mediaRecorder.stop()
    recStream.getTracks().forEach(track => track.stop()) // bcs chrome
    
    const result = parseMessage()
    console.log('message', result)

    const a = getS('a')
    a.target = '_blank'
    a.href = result
    a.innerHTML = result
    a.style.display = 'block'
}

function parseMessage(){

    const msgStr = message.join('').replace(/(\.*)(_+e+o+(n+)?m+_+)$/, '$1')
    // get typical number of letter repeats
    const parts = [],
    //letters = [msgStr[0]],
    counts = []

    // get counts
    let c = 1
    for (let i=1; i<=msgStr.length; i++){
      let prev = msgStr[i-1], cur = msgStr[i]

      if (prev === cur) c++
      else {
        counts.push(c)
        c = 1
      }
    }
    const avgCount = getModus(counts)
    console.log('counts', counts, 'most', avgCount)

    // split string into parts of same letters to examine how long is each part
    let curPart = msgStr[0]
    for (let i=1; i<=msgStr.length; i++){
      let prev = msgStr[i-1], cur = msgStr[i]

      // how many times is this letter in row?
      if (prev === cur) curPart+= cur
      
      if (prev !== cur) {
        //letters.push(cur)
        parts.push(curPart)
        curPart = cur
      }  
    }
    console.log('parts', parts, 'tresh', avgCount*1.5)
    
    let result = ''
    const tresh = avgCount*1.25
    parts
    .filter(part=>part.length>1)
    .map(part=>{
      // establish how many times does letter repeat intentionally
      if (part.length<=tresh) result+= part[0] // = it should be there once only
      else{
        const cnt = Math.round(part.length/avgCount)
        console.log('   ',part[0], cnt)
        for (let i=0; i<cnt; i++) result+= part[0]
      }
      
    })
    
    console.log('result', result)

    return result

    function getModus(counts){
      const store = counts
      let frequency = {}
      let max = 0
      let result
      for(const v in store) {
              frequency[store[v]]=(frequency[store[v]] || 0)+1; // increment frequency.
              if(frequency[store[v]] > max) {     // is this frequency > max so far ?
                      max = frequency[store[v]];  // update max.
                      result = store[v];          // update result.
              }
      }
      return result
    }
}

function playSequence(string){
  //getS('#stats').innerHTML = ''
  const synth = new Tone.Synth({oscillator:{type: 'sine'}}).toMaster() //Oscillator(f, "sine").toMaster()

  const msgLen = string.length
  string.split('').map((char,j)=>{
    let f,c
    Object.keys(dict).map(key=>{
      if (dict[key] !== char) return; 

      f = parseInt(key) +2
      
    })
    //getS('#stats').innerHTML += `${char} = ${f}<br/>`
    const i = j++
    if (f === undefined) return console.log('no freq', char, f, i*toneLen);

    setTimeout(()=>{ synth.triggerAttackRelease(f, '32n') }, i*toneLen) // "32n"
    console.log(i)
  })

  // send End of Message 'header'
  setTimeout(()=>{ 
  
    '_eom_'.split('').map((char,j)=>{
      let f
      Object.keys(dict).map(key=>{
          if (dict[key] !== char) return; 
          f = parseInt(key) +2
      })
      //getS('#stats').innerHTML += `${char} = ${f}<br/>`
      const i = j++
      
      setTimeout(()=>{ synth.triggerAttackRelease(f, '32n') }, i*toneLen) // "32n"
      
    })
  }, msgLen*toneLen)
}

function createDict(){

    // create ASCII alphabet for dict
    for (let i=32; i<=126;i++){
      let char = String.fromCharCode(i)
      alph.push(char)
    }

    // create dict of freqs and ASCII chars
    for (let i=0; i<alph.length+6; i+=1){ // +5 is to not start with lowest freq
        const f = i*a
        freqs.push(f)
        dict[f] = alph[i-6]
    }
    console.log(freqs, dict)
}


function reSample(audioBuffer, targetSampleRate) {
  return new Promise((resolve, reject)=>{

    const channel = audioBuffer.numberOfChannels;
    const samples = audioBuffer.length * targetSampleRate / audioBuffer.sampleRate;

    console.log(audioBuffer.sampleRate, 'samples',samples,'channel', channel)
    const offlineContext = new OfflineAudioContext(channel, samples, targetSampleRate);
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;

    bufferSource.connect(offlineContext.destination);
    bufferSource.start(0);
    offlineContext.startRendering().then(function(renderedBuffer){
        resolve(renderedBuffer);
    })
  })
}


function getS(sel){ return document.querySelector(sel);}
function getSA(sel){ return document.querySelectorAll(sel);}