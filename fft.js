// https://gist.github.com/anonymous/129d477ddb1c8025c9ac
// https://gist.github.com/okramovic/49013098d72e2ae0e0a25d4edc5c36a5
// https://betterexplained.com/articles/an-interactive-guide-to-the-fourier-transform/
function FFT1(data) {
    if (! data || !data.length) console.error('no data for FFT', data)
  
    //data = data.slice(0,data.length/2) // get rid of mirroring effect of fft spectrum ?
    console.log('   fft d.len', data.length)
    var N = data.length;
    var frequencies = [];

    // for every frequency...
    //for (var freq = 0; freq < N; freq++) {
    for (let freq = 0; freq < N; freq+= Fstep) { // currently = 10
        var re = 0;
        var im = 0;

        // for every point in time...
        for (var t = 0; t < N; t++) {

            // Spin the signal _backwards_ at each frequency (as radians/s, not Hertz)
            var rate = -1 * (2 * Math.PI) * freq;

            // How far around the circle have we gone at time=t?
            var time = t / N;
            var distance = rate * time;

            // datapoint * e^(-i*2*pi*f) is complex, store each part
            var re_part = data[t] * Math.cos(distance);
            var im_part = data[t] * Math.sin(distance);

            // add this data point's contribution
            re += re_part;
            im += im_part;
        }

        // Close to zero? You're zero.
        if (Math.abs(re) < 1e-10) { re = 0; }
        if (Math.abs(im) < 1e-10) { im = 0; }

        // Average contribution at this frequency
        re = re / N;
        im = im / N;
        
        frequencies[freq] = Math.sqrt(re*re + im*im)
          
        /*frequencies[freq] = {
            //re: re,  // real num
            //im: im,  // imaginary part
            freq: freq,
            amp: Math.sqrt(re*re + im*im),
            //phase: Math.atan2(im, re) * 180 / Math.PI     // in degrees
        };*/
    }

    return frequencies;
}