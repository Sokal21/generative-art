import p5 from "p5";

import { Microphone } from "./inputs/microphone";
import { Scene } from "./scenes";
// import { Midi } from "./inputs/midit";
import { CurvesWithMic } from "./scenes/curves_with_mic";
// import { LifeGameWithMic } from "./scenes/life_game_with_mic";

import "./style.css";
// import { Beater } from "./scenes/beater";

let img: p5.Image;

const p5Instance = new p5(() => {});

const scenes: Scene[] = [];
let microphone: Microphone;
// const midiController = new Midi();

const bufferLength = 1024;
const canvasWidth = window.innerWidth / 1.3;
const canvasHeight = window.innerHeight / 1.3;

// const mainCanvas = p5Instance.createGraphics(canvasWidth, canvasHeight, "webgl");
// const maskCanvas = p5Instance.createGraphics(canvasWidth, canvasHeight, "webgl");

p5Instance.keyPressed = () => {
  if ((p5Instance.key = "s")) {
    // p5Instance.saveGif("toto", 10, {});
  }
};

p5Instance.preload = () => {
  img = p5Instance.loadImage("/noise-texture.png");
};

p5Instance.setup = async () => {
  p5Instance.createCanvas(canvasWidth, canvasHeight);
  p5Instance.frameRate(60);

  try {
    // Get all audio devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    
    if (audioInputs.length > 0) {
      // Use the first available audio input device
      const firstAudioDevice = audioInputs[0];
      microphone = new Microphone(firstAudioDevice.deviceId, bufferLength);
    } else {
      console.warn('No audio input devices found');
      microphone = new Microphone('default', bufferLength);
    }

    const curves = new CurvesWithMic(p5Instance, canvasWidth, canvasHeight, microphone);
    scenes.push(curves);
  } catch (error) {
    console.error('Error getting audio devices:', error);
    microphone = new Microphone('default', bufferLength);
  }

  document.getElementById("start_mic")?.addEventListener(
    "click",
    async () => {
      if (!microphone) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(device => device.kind === 'audioinput');
          
          if (audioInputs.length > 0) {
            const firstAudioDevice = audioInputs[0];
            microphone = new Microphone(firstAudioDevice.deviceId, bufferLength);
          } else {
            console.warn('No audio input devices found');
            microphone = new Microphone('default', bufferLength);
          }

          const curves = new CurvesWithMic(p5Instance, canvasWidth, canvasHeight, microphone);
          scenes.push(curves);
        // const gridSize = 10;
        // const lifeGame = new LifeGameWithMic(
        //   p5Instance, microphone,
        //   Math.ceil((canvasWidth / gridSize) / 2),
        //   Math.ceil(canvasHeight / gridSize) / 2,
        //   gridSize,
        //   3,
        //   10,
        //   100,
        // );
        // // lifeGame.addMidiController(midiController);
        // scenes.push(lifeGame);
        } catch (error) {
          console.error('Error getting audio devices:', error);
          microphone = new Microphone('default', bufferLength);
        }
      }
    },
    false
  );
};

p5Instance.draw = () => {
  p5Instance.background(254, 249, 255);
  // p5Instance.noStroke();
  // p5Instance.translate(40, 40);

  scenes.forEach((scene) => scene.draw());

  // p5Instance.blendMode(p5Instance.SOFT_LIGHT);

  // p5Instance.tint(255, 255 * 0.25)
  // p5Instance.image(img, 0, 0, canvasWidth, canvasHeight);
  // p5Instance.blendMode(p5Instance.NORMAL);

  // mask.draw(canvasWidth, canvasHeight);

  // const image = mainCanvas.createImage(canvasWidth, canvasHeight);
  // image.mask(maskCanvas.createImage(canvasWidth, canvasHeight));

  // p5Instance.image(mainCanvas, -canvasWidth / 2 + 200, 0, canvasWidth, canvasHeight);
  // mask.period += 0.05;
};
