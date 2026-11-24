
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app } = require("electron");
const { EdgeTTS } = require("node-edge-tts");

const VOICE_CONFIG = {
  voice: "pt-BR-FranciscaNeural",
  lang: "pt-BR",
  outputFormat: "audio-24khz-96kbitrate-mono-mp3",
  rate: "-5%",
  pitch: "default",
  volume: "default",
  timeout: 15000
};

let activePlayer = null;

function buildGreeting(name, date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return `Bom dia, ${name}! Tenha um excelente dia e bom trabalho!`;
  }

  if (hour >= 12 && hour < 18) {
    return `Boa tarde, ${name}! Espero que seu dia esteja indo bem. Bom trabalho!`;
  }

  return `Boa noite, ${name}! Que seu período seja produtivo e tranquilo.`;
}

function getAudioPath() {
  const voiceDirectory = path.join(
    app.getPath("userData"),
    "voice"
  );

  fs.mkdirSync(voiceDirectory, {
    recursive: true
  });

  return path.join(
    voiceDirectory,
    "drmc-greeting.mp3"
  );
}

function stopGreeting() {
  if (activePlayer && !activePlayer.killed) {
    activePlayer.kill();
    activePlayer = null;
  }
}

function playAudio(audioPath) {
  return new Promise((resolve, reject) => {

    stopGreeting();

    // Escapa apóstrofos para evitar problemas no comando PowerShell.
    const safePath = audioPath.replace(/'/g, "''");

    const script = `
      Add-Type -AssemblyName PresentationCore

      $audioPath = '${safePath}'

      $player = New-Object System.Windows.Media.MediaPlayer

      try {
        $player.Open([System.Uri]::new($audioPath))

        $attempts = 0

        while (
          -not $player.NaturalDuration.HasTimeSpan -and
          $attempts -lt 100
        ) {
          Start-Sleep -Milliseconds 100
          $attempts++
        }

        if (-not $player.NaturalDuration.HasTimeSpan) {
          throw "Não foi possível carregar o áudio."
        }

        $duration = [int](
          $player.NaturalDuration.TimeSpan.TotalMilliseconds
        )

        $player.Volume = 1
        $player.Play()

        Start-Sleep -Milliseconds ($duration + 500)

        $player.Stop()
        $player.Close()
      }
      catch {
        $player.Close()
        throw
      }
    `;

    const player = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-STA",
        "-Command",
        script
      ],
      {
        windowsHide: true,
        stdio: "ignore"
      }
    );

    activePlayer = player;

    player.on("error", (error) => {
      activePlayer = null;
      reject(error);
    });

    player.on("close", (code) => {
      activePlayer = null;

      if (code === 0) {
        resolve(true);
      } else {
        reject(
          new Error(
            `Reprodução do áudio finalizada com código ${code}.`
          )
        );
      }
    });

  });
}

async function speakGreeting(name) {
  if (typeof name !== "string" || !name.trim()) {
    console.warn("Saudação cancelada: nome não informado.");
    return false;
  }

  const cleanName = name.trim().slice(0, 40);
  const message = buildGreeting(cleanName);
  const audioPath = getAudioPath();

  try {
    console.log("Gerando saudação neural DRMc...");

    const tts = new EdgeTTS(VOICE_CONFIG);

    await tts.ttsPromise(
      message,
      audioPath
    );

    if (
      !fs.existsSync(audioPath) ||
      fs.statSync(audioPath).size === 0
    ) {
      throw new Error("O áudio não foi gerado corretamente.");
    }

    console.log("Saudação:", message);
    console.log("Reproduzindo voz neural DRMc...");

    await playAudio(audioPath);

    console.log("Saudação reproduzida com sucesso.");

    return true;

  } catch (error) {
    console.error(
      "Não foi possível reproduzir a saudação neural:",
      error.message
    );

    return false;
  }
}

module.exports = {
  speakGreeting,
  buildGreeting,
  stopGreeting
};
