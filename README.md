### Speech to text UI for whisper.cpp

[whisper.cpp](https://github.com/ggerganov/whisper.cpp) should be installed and configured somewhere. 
Replace whisper path and model in 
```
const whisperCmd = `cd ~/other/voice-recog/ && ./build/bin/whisper-cli -m models/ggml-small.bin -f "${preprocessedWavFilePath}" -l ru`;
```

`ffmpeg` should be installed and configured in the system.
