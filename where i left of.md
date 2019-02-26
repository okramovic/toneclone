https://stackoverflow.com/questions/54726349/how-can-i-do-fft-analysis-of-audio-file-in-chrome-without-need-for-playback
https://github.com/scijs/fourier-transform
explanation 
https://betterexplained.com/articles/an-interactive-guide-to-the-fourier-transform/
- might be really usefull:
https://stackoverflow.com/questions/43294048/analyse-pcm-data-from-a-wav-file-with-a-fft 
https://github.com/vail-systems/node-fft

FFT code here
https://dev.to/trekhleb/playing-with-discrete-fourier-transform-algorithm-in-javascript-53n5
https://github.com/trekhleb/javascript-algorithms/tree/master/src/algorithms/math/fourier-transform

Smus book
https://webaudioapi.com/book/Web_Audio_API_Boris_Smus.pdf

You need 4 things:

1] Javascript code to read in a WAV file as a binary blob

2] Code to convert slices of that blob as 16-bit samples into suitable Javascript arrays of numeric samples for an FFT

3] A Javascript implementation of a DFT or FFT of suitable size arrays for the time and frequency resolution you desire

4] Code to estimate your desired frequency and magnitude parameters as you step-and-repeat the FFT across your data slices

The first 3 can be found from web searches (Github, here, et.al.)