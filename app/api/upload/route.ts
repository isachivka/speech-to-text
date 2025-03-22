import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const tempDir = path.join('/tmp', uuidv4());
  let dirCreated = false;

  try {
    await fs.mkdir(tempDir, { recursive: true });
    dirCreated = true;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalFilePath = path.join(tempDir, file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(originalFilePath, fileBuffer);

    const fileExtension = path.extname(file.name).toLowerCase();
    let wavFilePath = originalFilePath;
    if (fileExtension !== '.wav') {
      wavFilePath = path.join(tempDir, `${path.basename(file.name, fileExtension)}.wav`);
      await execPromise(`ffmpeg -i "${originalFilePath}" "${wavFilePath}"`);
    }

    // Audio preprocessing:
    // - convert to mono (-ac 1)
    // - change sample rate to 16kHz (-ar 16000)
    // - noise reduction (afftdn)
    // - frequency filtering (highpass and lowpass)
    // - volume normalization (loudnorm)
    // - silence trimming (silenceremove)
    const preprocessedWavFilePath = path.join(tempDir, `${path.basename(wavFilePath, '.wav')}_preprocessed.wav`);
    const filterChain = 'afftdn,highpass=f=200,lowpass=f=3000,loudnorm,silenceremove=1:0:-50dB';
    await execPromise(`ffmpeg -i "${wavFilePath}" -ac 1 -ar 16000 -af "${filterChain}" "${preprocessedWavFilePath}"`);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const whisperCmd = `cd ~/other/voice-recog/ && ./build/bin/whisper-cli -m models/ggml-medium.bin -t 12 -f "${preprocessedWavFilePath}" -l ru`;
          const whisperProcess = spawn('bash', ['-c', whisperCmd]);

          whisperProcess.stdout.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n');
            lines.forEach((line: string) => {
              const match = line.match(/^\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\] (.+)$/);
              if (match) {
                controller.enqueue(line + '\n');
              }
            });
          });

          whisperProcess.stderr.on('data', (data: Buffer) => {
            console.error('Whisper stderr:', data.toString());
          });

          whisperProcess.on('error', (error) => {
            controller.error(error);
          });

          whisperProcess.on('close', async () => {
            try {
              await fs.rm(tempDir, { recursive: true, force: true });
            } catch (err) {
              console.error('Error cleaning tempDir:', err);
            }
            controller.close();
          });
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error('Error processing request:', error);
    if (dirCreated) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Error cleaning tempDir after error:', err);
      }
    }
    return NextResponse.json({ error: error || 'Internal server error' }, { status: 500 });
  }
}

function execPromise(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command "${command}":`, stderr);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
