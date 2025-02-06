import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const tempDir = path.join('/tmp', uuidv4());
  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, fileBuffer);

  const fileExtension = path.extname(file.name).toLowerCase();
  let wavFilePath = filePath;

  if (fileExtension !== '.wav') {
    const convertedWavFilePath = path.join(tempDir, `${path.basename(file.name, fileExtension)}.wav`);
    await execPromise(`ffmpeg -i "${filePath}" "${convertedWavFilePath}"`);
    wavFilePath = convertedWavFilePath;
  }

  const wav16kFilePath = path.join(tempDir, `${path.basename(wavFilePath, '.wav')}_16k.wav`);
  await execPromise(`ffmpeg -i "${wavFilePath}" -ar 16000 "${wav16kFilePath}"`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const whisperProcess = exec(`cd ~/other/voice-recog/ && ./build/bin/whisper-cli -m models/ggml-medium.bin -f "${wav16kFilePath}" -l ru`);

        whisperProcess.stdout?.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach((line: string) => {
            const match = line.match(/^\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\] (.+)$/);
            if (match) {
              controller.enqueue(line + '\n');
            }
          });
        });

        whisperProcess.stderr?.on('data', (data) => {
          console.error(data.toString());
          // controller.enqueue(data);
        });

        whisperProcess.on('close', async () => {
          await fs.rm(tempDir, { recursive: true, force: true });
          controller.close();
        });
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new NextResponse(stream);
}

function execPromise(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
