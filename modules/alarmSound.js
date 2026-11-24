
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app } = require("electron");

let activePlayer = null;

const SAMPLE_RATE = 44100;
const SOUND_DURATION = 4.2;

// Melodia original DRMc: suave, inspirada no timbre de flauta.
const NOTES = [
  { frequency: 523.25, start: 0.00, duration: 0.42 },
  { frequency: 659.25, start: 0.46, duration: 0.42 },
  { frequency: 783.99, start: 0.92, duration: 0.52 },
  { frequency: 659.25, start: 1.48, duration: 0.42 },
  { frequency: 880.00, start: 1.94, duration: 0.52 },
  { frequency: 783.99, start: 2.50, duration: 0.48 },
  { frequency: 1046.50, start: 3.02, duration: 0.90 }
];

function getSoundDirectory() {
  return path.join(app.getPath("userData"), "sounds");
}

function getSoundPath() {
  return path.join(getSoundDirectory(), "drmc-alarm.wav");
}

function generateAlarmWav() {
  const directory = getSoundDirectory();
  const filePath = getSoundPath();

  fs.mkdirSync(directory, { recursive: true });

  const totalSamples = Math.floor(SAMPLE_RATE * SOUND_DURATION);
  const dataSize = totalSamples * 2;

  const buffer = Buffer.alloc(44 + dataSize);

  // Cabeçalho WAV PCM.
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < totalSamples; i++) {
    const time = i / SAMPLE_RATE;

    let sample = 0;

    for (const note of NOTES) {
      const elapsed = time - note.start;

      if (elapsed < 0 || elapsed > note.duration) {
        continue;
      }

      // Entrada e saída suaves das notas.
      const attack = Math.min(elapsed / 0.07, 1);
      const release = Math.min(
        (note.duration - elapsed) / 0.16,
        1
      );

      const envelope = Math.max(
        0,
        Math.min(attack, release)
      );

      // Vibrato discreto para dar naturalidade à flauta.
      const vibrato = Math.sin(
        2 * Math.PI * 5 * elapsed
      ) * 2.2;

      const frequency = note.frequency + vibrato;

      // Harmônicos suaves para enriquecer o timbre.
      const fundamental = Math.sin(
        2 * Math.PI * frequency * elapsed
      );

      const secondHarmonic = Math.sin(
        2 * Math.PI * frequency * 2 * elapsed
      );

      const thirdHarmonic = Math.sin(
        2 * Math.PI * frequency * 3 * elapsed
      );

      const fluteTone =
        fundamental * 0.88 +
        secondHarmonic * 0.09 +
        thirdHarmonic * 0.03;

      sample += fluteTone * envelope * 0.20;
    }

    // Evita distorção e mantém o volume controlado.
    sample = Math.max(-0.85, Math.min(0.85, sample));

    buffer.writeInt16LE(
      Math.round(sample * 32767),
      44 + i * 2
    );
  }

  fs.writeFileSync(filePath, buffer);

  return filePath;
}

function ensureAlarmSound() {
  const filePath = getSoundPath();

  // Gera novamente para aplicar a nova melodia.
  generateAlarmWav();

  return filePath;
}

function playAlarmSound() {
  if (process.platform !== "win32") {
    console.warn("Áudio DRMc disponível apenas no Windows.");
    return false;
  }

  try {
    const soundPath = ensureAlarmSound();

    // Evita sobrepor reproduções.
    if (activePlayer && !activePlayer.killed) {
      activePlayer.kill();
    }

    const escapedPath = soundPath.replace(/'/g, "''");

    const command =
      `$player = New-Object System.Media.SoundPlayer '${escapedPath}'; ` +
      "$player.PlaySync();";

    activePlayer = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-Command",
        command
      ],
      {
        windowsHide: true,
        stdio: "ignore"
      }
    );

    activePlayer.on("error", (error) => {
      console.error("Erro ao reproduzir áudio DRMc:", error);
      activePlayer = null;
    });

    activePlayer.on("close", () => {
      activePlayer = null;
    });

    return true;

  } catch (error) {
    console.error("Falha no sistema de áudio DRMc:", error);
    return false;
  }
}

function stopAlarmSound() {
  if (activePlayer && !activePlayer.killed) {
    activePlayer.kill();
    activePlayer = null;
  }
}

module.exports = {
  generateAlarmWav,
  ensureAlarmSound,
  playAlarmSound,
  stopAlarmSound
};
