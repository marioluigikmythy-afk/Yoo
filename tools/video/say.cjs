// Speaks one line with the offline Kokoro voice model (Apache-2.0) through sherpa-onnx.
// usage: node say.cjs <speaker-id> <speed> <out.wav> "<text>"
const path = require('path');
const sherpa = require('sherpa-onnx-node');
const M = path.join(path.dirname(require.resolve('n8n-nodes-ttsbro/package.json')), 'kokoro-int8-en-v0_19');
const [sid, speed, out, text] = process.argv.slice(2);
const tts = new sherpa.OfflineTts({
  model: { kokoro: { model: path.join(M, 'model.int8.onnx'), voices: path.join(M, 'voices.bin'), tokens: path.join(M, 'tokens.txt'), dataDir: path.join(M, 'espeak-ng-data') }, numThreads: 4, provider: 'cpu', debug: false },
  maxNumSentences: 1,
});
const audio = tts.generate({ text, sid: +sid, speed: +speed });
sherpa.writeWave(out, { samples: audio.samples, sampleRate: audio.sampleRate });
console.log(JSON.stringify({ out: path.basename(out), sec: +(audio.samples.length / audio.sampleRate).toFixed(2) }));
