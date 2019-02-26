'use strict';

// make different sounds in sequence
// based on letters
// hear sound
// analyse sound
// get letters from sound

/* how to solve sampleRate shit
 now dataArray contains the waveform data (freqs) of each moment
 original idea was to replay the collected audio and analyse it while playing it silently, but this takes too much time
 i can now access all collected data and analyse it when recording stops from lastRecData
 when rec stops, go over each sub-array and guess letter
*/


// https://github.com/audio-lab/analyser
// ? https://github.com/scijs/ndarray-fft

const freqs = []
const Fstep = 10
const a = 43 //parseInt(context.sampleRate /1024)
let alph = [] //['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']
const dict = {}
const listenDict = {}


const context = new Tone().context
console.log(context.sampleRate, context)
let offlineCtx


createDict()


const synth = new Tone.Synth({oscillator:{type: 'sine'}}).toMaster() //Oscillator(f, "sine").toMaster()

let recStream // contains recording stream


//let dataArray = new Float32Array(256); // 256 gets replaced later when analyser is created
let lastRecData = []

let mediaRecorder, audioChunks, recording,
analyser, off_analyser, // for offline ctx
recurl,
mySound,
spectrum, off_spectrum,
timer,
resampledFreqs = [],
snapshots = []

let message = []

const toneLen = 250 /// 150


getS('#sndInfo').innerHTML = `${context.sampleRate}, ${a}`


getS('#startRec').onclick = startRecord
getS('#stopRec').onclick = stopRecord
getS('#submit').onclick = async ev =>{
  const val = getS('#input').value
  if (!val) return;
  await context.resume() 
  playSequence(val)
}



function setup(){
    createCanvas(innerWidth, 360)
    frameRate(12)
    noLoop()
    strokeWeight(3)
}

function draw(){
  
    if (!analyser) return;
      
    analyser.getFloatFrequencyData(spectrum);
    //off_analyser.getFloatFrequencyData(off_spectrum);
  
    //console.log(spectrum, analyser.frequencyBinCount)
    const m = Math.max(...spectrum)
    let I = spectrum.indexOf(m)
    // debug - find all columns that have this value and prove this number is there always only once

    background(255)
    
    //const thisF = freqs[I]
    //let char = dict[thisF]
    // f from - f till
    //console.log('   f?', thisF, I, char) //,  I*a, '-',(I+1)*a, '      ',char)
        
    
    let len = spectrum.length/4
    for (let i=0; i<len; i++){
        let amp = spectrum[i]
        const x = map(i, 0, len, 0, width)
        //let y = map(amp, 0, 255, height,0)
        let y = map(amp, analyser.minDecibels, analyser.maxDecibels, 0,height)
        stroke( amp == m & amp > -60 ? 'blue' : 'black')
        line(x,height, x,height-y)
    }
  
    
    // draw resampled fft snapshot of bins
    if (snapshots.length){
      const thickness = 2
      // snapshots contains slices over time. each time contains fft
      background('white')
      strokeWeight(1)
      
      for (let i=0; i< snapshots.length; i++ ){
        const ffts = snapshots[i]  // example: ffts[43] = { avgAmp: 0.00034132, count ... }
        
        const x1 = map(i,   0,snapshots.length, 0, width), 
              x2 = map(i+1, 0,snapshots.length, 0, width),
              binCount = Object.keys(ffts).length-1
        
        Object.keys(ffts).map((f,j)=>{
            //const y = map(parseInt(f), 0, 4343, height, 0),
            const y = map(j, 0, binCount, height, 0),
            amp = ffts[f].avgAmp
            
            //if (i==0) console.log('   ', parseInt(f), j, 'y', y, amp)
            
            const darkness = map(amp, 0, 0.025, 255,0)  // strongest amps are dark
            stroke(darkness)
            line(x1,y, x2,y)
          
            stroke('blue')
            point(x1,y)
        })
          
      }
      noLoop()
      //console.log('finished drawing resampled', Object.keys(snapshots[0]))
    }
}


function drawNonbinFFT(){
    

    for (let j=0; j< snapshots.length; j++ ){
        const slice = snapshots[j]
        const l = slice.length /4 // i dont need frequencies over what number?

        const x1 = map(j,   0,snapshots.length, 0, width), 
              x2 = map(j+1, 0,snapshots.length, 0, width)


        for (let i=0; i<l; i+=10){  // +=10 bcs im currently doing fft for every 10th freq (viz fft.js)
            const amp = slice[i] //resampledFreqs[i]
            if (amp===undefined) {
              continue;
            }

            const y = map(i, 0, l, height, 0)
            const darkness = map(amp, 0, 0.05, 255,0)  // strongest amps are dark
            stroke(darkness)
            line(x1,y, x2,y)

            //const x = map(i, 0, l, 0, width),
            //y = map(amp, 0, 0.0001, 0,height)
            //line(x,height, x,height-y)
            //line(x,0, x,y)
        }
    }
}


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

    audioChunks = []
    mediaRecorder.addEventListener("dataavailable", event => {
        audioChunks.push(event.data)
        //getOfflineIDK(event.data)
    })
    mediaRecorder.addEventListener("error", er =>{ console.log(er) })
    mediaRecorder.addEventListener("stop", async () => {
      clearInterval(timer)
      //noLoop()

      const audioBlob = new Blob(audioChunks)
      recurl = URL.createObjectURL(audioBlob)
      recording = new Audio(recurl)
      
      const fileReader = new FileReader();
      fileReader.onload = handleBuffer    
      fileReader.readAsArrayBuffer(audioBlob)

    })
    createAnalyser(recStream)
    
    collectLetters()
    loop()
    //createOfflineAnalyser(recStream)
}
async function handleBuffer(ev){
  
      let buf = event.target.result
      const audioBuf = await context.decodeAudioData(buf)
      const resampled = await reSample(audioBuf, 44100 )
      console.log('resampled', resampled)
  
      analyseResampled(resampled)
  
      /*
      // add resampled to DOM for DSP library

      var wav = audioBufferToWav(resampled)

      var blob = new window.Blob([ new DataView(wav) ], {type: 'audio/wav'})  //  https://github.com/Jam3/audiobuffer-to-wav/blob/master/demo/index.js
      var url = window.URL.createObjectURL(blob)
      let rec = new Audio(url)
      rec.addEventListener('loadedmetadata',ev=>{
        console.log('loadedmetadata', ev, ev.target.result)
      })
      rec.addEventListener('canplaythrough', ev=>{
        //console.log('canplaythrough', ev)
      })
      //console.log('url', url, rec)
      //rec.play()*/
}



function reSample(audioBuffer, targetSampleRate) {
  return new Promise((resolve, reject)=>{

    const channel = 1 // audioBuffer.numberOfChannels
    const samples = audioBuffer.length * targetSampleRate / audioBuffer.sampleRate

    console.log(audioBuffer.sampleRate, 'samples',samples,'channel', channel, 'audioBuffer.numberOfChannels', audioBuffer.numberOfChannels)
    
    
    const offlineContext = new OfflineAudioContext(channel, samples, targetSampleRate)
    const bufferSource = offlineContext.createBufferSource()
    bufferSource.buffer = audioBuffer

    bufferSource.connect(offlineContext.destination)
    bufferSource.start(0)
    offlineContext.startRendering().then( renderedBuffer =>resolve(renderedBuffer))
  })
}


function analyseResampled(audioBuf){
  
    const slices = [], sR = audioBuf.sampleRate / (1000/(toneLen/2))   // get sample for every quarter of second
          ,data = audioBuf.getChannelData(0)
    
    // should i keep or discard last slice??? it seems impossible to get enough fft data if slice is short which cant be predicted
    //   if it will happen or not
    // sR*(i-1) keeps last slice
    for (let i=1; sR*(i/*-1*/)<= audioBuf.length; i++ ){ // i< audioBuf.duration+1,
        const fromI = sR*(i-1), tillI = sR*i
        //console.log('   from-till indexes', fromI, tillI, data.length)
        const slice = data.slice(fromI, tillI)
        slices.push(slice)
    }
    
    console.time('test')
    console.log('slices', slices)
  
    const snap_local = []
    snapshots = []
  
    // analyse each time snapshot
    for (let i=0; i< slices.length; i++){
      
        /*  now im interested only in every tenth frequency, but tones have all wierd numbers (like 301 or 2021) // bcs of a=43 as freq step
        - get somehow reliable whole bin's amplitude (average those that fall into certain bin? ) */

        //if (!slices[i]) continue;
        
        const freqs = FFT1(slices[i])
        snap_local.push(freqs)
        console.log('   snap_local i:', i)
        //if (!i) console.log('fft', freqs)
    }
    console.timeEnd('test')
    console.log('snap_local', snap_local )
  
  
    // put freqs to bins - get average value of all freqs in one bin
    // create bins as keys of freqBins - will later be used to store FFT nums count and average amp for each bin  
    
    const freqBins = [] // all time snapshots are here
    
    
    //for (const slice of analysed){
    for (let i=0;i< snap_local.length ; i++){  //  snap_local.length
      const snapshot_fft = snap_local[i]
      
      const bins = {} // for every time snapshot
      freqs
      //.filter((f,i)=>{
        //if (i<10) console.log(i,f)
      //  return f <= 4343
      //}) // not interested in bins with higher tones
      .map(f=>{ 
        if (f>4343) return;
        bins[f] = {count:0, amp: 0} 
      })
      
      
      snapshot_fft
      //.filter((amp,f)=>{
      //  if (f<100) console.log(f, amp)
      // return f <= 4343 
      //}) 
      .map((amp,f)=>{ 
          if (f>4343) return; // bcs theres no such bin after 4343
        
          const [lower,upper] = getBinBoundaries(f)
          //console.log( f, lower,upper, 'amp', amp)
          // find to what bin f belongs to = lower and upper freq and add f's amp to it
          bins[lower].count ++
          bins[lower].amp += amp
          bins[lower].f = f
      })
      // average each bins amp
      Object.keys(bins).map(f=>{ bins[f].avgAmp = bins[f].amp/bins[f].count || 0 })  // 0 to prevent NaN as avg in last bin

      //freqBins[i] = JSON.parse(JSON.stringify(bins))
      freqBins.push(bins)
    }
      
    console.log('freqBins', freqBins)
  
    snapshots = freqBins
  
    freqBins.map((bin,i)=>{
        const amps = Object.entries(bin).map(data=> data[1].avgAmp )
        //if (!i) console.log('amps', amps)
      
        const mx = Math.max(...amps)
        
      
        const maxObjs = Object.entries(bin).map(data=>data[1])
        .map(data=> data.avgAmp===mx ? data : null) // how many max vals are there?
        .filter(v=>v)
        .sort((a,b)=> b.avgAmp-a.avgAmp)
        console.log(maxObjs[0].f, 'max', mx)
        const [lower, upper] = getBinBoundaries(maxObjs[0].f)
        console.log('   ',lower,upper)
        console.log('->', dict[lower])
    })
  
  function getBinBoundaries(f){
    const upper = freqs.find(num=>num>f)
    const lower = upper - a // 43
    return [lower, upper]
  }
}




function collectLetters(){
    clearInterval(timer)
    const millis = parseInt(toneLen/4)
    lastRecData = []
    message = []
  
  
    timer = setInterval(()=>{

      if (!analyser) return console.log('analyser not ready')

      //analyser.getFloatTimeDomainData(dataArray);
      //console.log('TimeDomainData dataArray',dataArray)
      //lastRecData.push(dataArray)
      analyser.getFloatFrequencyData(spectrum);
      lastRecData.push(spectrum.join().split(',')) // ??
      
      //console.log(spectrum.length) // 512
      const m = Math.max(...spectrum)
      let I = spectrum.indexOf(m)
      
      if (m<-50) return;
      
      const thisF = freqs[I]
      const char = dict[thisF] // listenDict[thisF] 
      if (char) message.push(char)
      //console.log('   f?', thisF, I, char)
      console.log('   f?',I, thisF)
      
      // autostop on _eom_
      if (!message.join('').match(/(\.*)(_+e+o+(n+)?m+_+)/)) return;
      else getS('#stopRec').click()

    }, millis)
}


function createAnalyser(stream){
    // https://webaudiodemos.appspot.com/AudioRecorder/index.html#
    // https://stackoverflow.com/questions/32782505/fft-analysis-with-javascript-how-to-find-a-specific-frequency

    const aCtx = context // new AudioContext() //new webkitAudioContext();
    analyser = aCtx.createAnalyser();
    const microphone = aCtx.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 1024;
    //analyser.connect(aCtx.destination);//
    analyser.minDecibels = -90;//
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.25;
    //console.log(analyser, 'bins', analyser.frequencyBinCount)
    spectrum = new Float32Array(analyser.frequencyBinCount);

    //a = parseInt(context.sampleRate/analyser.frequencyBinCount) // this brings bugs, idk why its here
  
    //analyser.fftSize = 1024;
    //var bufferLength = analyser.fftSize;
    //console.log(bufferLength);
    //dataArray = new Float32Array(analyser.fftSize);

  
  // you need to connect stream to a web audio context with a MediaStreamAudioSourceNode
  //var scriptNode = context.createScriptProcessor(4096, 1, 1);
  //console.log('scriptNode.bufferSize',scriptNode.bufferSize);
}

function stopRecord(){
    getS('body').classList = []

    if (mediaRecorder.state ==='inactive') return;
  
    mediaRecorder.stop()
    recStream.getTracks().forEach(track => track.stop()) // bcs chrome
    
    const result = parseMessage()
    console.log('message', result)

    const a = getS('a')
    a.target = '_blank'
    a.href = result
    a.innerHTML = result
    a.style.display = 'block'
  
    guessLetters()
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

function createDict(){

    // create ASCII alphabet for dict
    for (let i=32; i<=126+1;i++){  // +1 is to have one extra bin later - so last freq bin does not contain values from all higher tones there
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

function createListenDict(){
    
    const a = context.sampleRate / 1024
    //console.log('listening a',a)
    // create dict of freqs and ASCII chars
    for (let i=0; i<alph.length+6; i+=1){ // +5 is to not start with lowest freq
        const f = Math.floor(i*a)
        //freqs.push(f)
        listenDict[f] = alph[i-6]
    }
    //console.log('listenDict',listenDict)
  
}



function playString(string, delay = 0){
  //console.log('msg parts',string, delay)

  string.split('').map((char,j)=>{
    let f
    Object.keys(dict).map(key=>{
      if (dict[key] !== char) return; 
      f = parseInt(key) +2 // +2 to be not on start of frequency bin, but a bit inside
    })
    const i = j++
    if (f === undefined) return console.log('no freq', char, f, i*toneLen);

    setTimeout(()=>{ synth.triggerAttackRelease(f, '32n') }, i*toneLen + delay)
    //console.log(i)
  })

}


function guessLetters(){
    //console.log('lastRecData', lastRecData.length, lastRecData)
  
    for (let i=0; i<lastRecData.length; i++){
      const arr = lastRecData[i]
      
      const m = Math.max(...arr)
      let I = arr.indexOf(m.toString())
      
      //console.log(arr)
      //console.log(m, I)
      //console.log('\n')
      if (m<-50) continue; //return console.log('too little', m);
      
      const thisF = freqs[I]
      const char = dict[thisF] // listenDict[thisF] 
      //if (char) message.push(char)
      //console.log('   f?', thisF, I, char)
      //console.log('   f?', m, I, char, thisF)
    }
}




async function createOfflineAnalyser(stream){
  
  
  offlineCtx = new OfflineAudioContext({
    numberOfChannels: 1,
    length: 44100 * 400, // how to get its length?
    sampleRate: 44100,
  })
  console.log('offline', offlineCtx)
  await offlineCtx.startRendering()
  /*await offlineCtx.resume()
  */
  
  // you need to connect stream to a web audio context with a MediaStreamAudioSourceNode
  //const x = offlineCtx.createMediaStreamSource(stream);
  //x.connect(analyser);
  
  //var scriptNode = offlineCtx.createScriptProcessor(4096, 1, 1);
  //console.log('scriptNode.bufferSize',scriptNode.bufferSize);
  
  /*offlineCtx.startRendering().then((buffer)=> {
    console.log('off rendered buffer', buffer)
  })*/
  
  
  /*off_analyser = offlineCtx.createAnalyser();
  let source = offlineCtx.createMediaStreamSource(stream);
  source.connect(off_analyser);
  off_analyser.fftSize = 1024;
  off_analyser.smoothingTimeConstant = 0.25;*/
  //off_analyser.getFloatFrequencyData(off_spectrum);
}





function playSequence(string){
  //getS('#stats').innerHTML = ''
  let header
  // send header
  if (context.sampleRate === 44100){
    header = 'abba'
  } else if (context.sampleRate === 48000){
    header = 'abab'
  } else {
    header = 'baab'
  }
  
  //playString(header)
  playString(string, 1) // header.length*toneLen) // *1.5

  const msgLen = string.length
  playString('_eom_', ( msgLen)*toneLen) // header.length+msgLen  // *1.5

  // send End of Message 'header'
  /*setTimeout(()=>{ 
  
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
  }, msgLen*toneLen)*/
}


function getS(sel){ return document.querySelector(sel);}
function getSA(sel){ return document.querySelectorAll(sel);}




function getOfflineIDK(blob){
        
        const fileReader = new FileReader();
        fileReader.onload = loadhandler
        fileReader.readAsArrayBuffer(new Blob([blob]))
  
  async function loadhandler(ev){
      //const ctx2 = new OfflineAudioContext(1, samples, 44100)
    
      //const samples = buffer.length * 44100 / buffer.sampleRate
      const offlineContext = new OfflineAudioContext(1, 44100*60, 44100)
      let buffer = await offlineContext.decodeAudioData(ev.target.result)
      
      let source = offlineContext.createBufferSource()
      let processor = offlineContext.createScriptProcessor(1024,1, 1)
          
      console.log('buffer', buffer)
  
      let fft = offlineContext.createAnalyser()
      fft.fftSize = 1024

      source.buffer = buffer
      source.connect(processor)
      //source.connect(fft);
      //fft.connect(processor);
      //processor.connect(offlineCtx.destination);
      processor.onaudioprocess = processAudio;
      console.log('processor', processor)
      source.start(0);
      source.connect(offlineContext.destination)
      const x = await offlineContext.startRendering()
      
      console.log("starting", x);
      
      /*try {
        console.log('offlineCtx', offlineCtx)
        await offlineCtx.startRendering()  //.suspend()
      } catch(e){
        console.error('starte rendering err', e)
      }*/
    
      
      
      console.log('offlineContext', offlineContext)
      //const bufferSource = offlineContext.createBufferSource()
      //bufferSource.buffer = buffer

      //bufferSource.connect(processor)
      //bufferSource.connect(offlineContext.destination)
    
      //bufferSource.start(0)  

      console.log("starting 2");
    
    
  }
  function processAudio(ev){
      console.log(' - -  - - - processing audio  - - - - ');
  }
  
  async function idk1(event){
          
            let buf = event.target.result
            console.log('off buf', buf, event)
            const audioBuf = await offlineCtx.decodeAudioData(buf) //await offlineCtx.decodeAudioData(buf)
            
            //let source = context.createBufferSource();
            let source = offlineCtx.createBufferSource();
            
            source.buffer = audioBuf; // or just buf ?
            console.log('audiobuff\n', audioBuf, source)
            const fft = offlineCtx.createAnalyser();
            fft.fftSize = 1024;

            
            source.connect(fft);
            
            
            var scriptNode = offlineCtx.createScriptProcessor(1024, 1, 1); // 4096
            
            scriptNode.onaudioprocess = function blabla(audioProcessingEvent) {

                            console.log('---- - - - -  -  audioProcessingEvent',audioProcessingEvent)
            }
            fft.connect(scriptNode);
            scriptNode.connect(offlineCtx.destination);
          
          
            //source.connect(scriptNode);
            source.start(0)
            
            console.log('scriptNode.bufferSize',scriptNode);
            //const audioBuf = await offlineCtx.decodeAudioData(buf)
            //const resampled = await reSample(audioBuf, 44100 ) // 48000
            //console.log('resampled', resampled)
        }
}