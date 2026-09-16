let audioContext = null;

const getAudioContext = () => {
  const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContext) return null;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (
    audioContext.state ===
    "suspended"
  ) {
    audioContext.resume();
  }

  return audioContext;
};

export const playSound = (type) => {
  try {
    const audioContext =
      getAudioContext();

    if (!audioContext) return;

    const oscillator =
      audioContext.createOscillator();

    const gainNode =
      audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(
      audioContext.destination
    );

    let frequency = 440;
    let duration = 0.08;
    let volume = 0.08;
    let wave = "sine";

    switch (type) {
      case "move":
        frequency = 420;
        duration = 0.07;
        volume = 0.07;
        wave = "triangle";
        break;

      case "capture":
        frequency = 240;
        duration = 0.12;
        volume = 0.1;
        wave = "square";
        break;

      case "illegal":
        frequency = 130;
        duration = 0.18;
        volume = 0.1;
        wave = "sawtooth";
        break;

      case "check":
        frequency = 620;
        duration = 0.18;
        volume = 0.1;
        wave = "triangle";
        break;

      case "checkmate":
        frequency = 180;
        duration = 0.4;
        volume = 0.12;
        wave = "sawtooth";
        break;

      case "promotion":
        frequency = 700;
        duration = 0.16;
        volume = 0.1;
        wave = "triangle";
        break;

      default:
        break;
    }

    oscillator.type = wave;

    oscillator.frequency.setValueAtTime(
      frequency,
      audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(
      volume,
      audioContext.currentTime
    );

    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime +
        duration
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
        duration
    );

    oscillator.onended = () => {};
  } catch (error) {
    console.warn(
      "Sound could not be played:",
      error
    );
  }
};