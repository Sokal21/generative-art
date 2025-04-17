import p5 from "p5";

import { Microphone } from "./inputs/microphone";
import { Scene } from "./scenes";
// import { Midi } from "./inputs/midit";
// import { CurvesWithMic } from "./scenes/curves_with_mic";
// import { LifeGameWithMic } from "./scenes/life_game_with_mic";
// import { SinWithMic } from "./scenes/sin_with_mic";
import { CamWithEffects } from "./scenes/cam_with_effects";
import "./style.css";
// import { Beater } from "./scenes/beater";

new p5((p: p5) => {
  let img: p5.Image;
  let myShader: p5.Shader;
  const scenes: Scene[] = [];
  let microphone: Microphone;
  const bufferLength = 1024;
  const canvasWidth = window.innerWidth / 1.3;
  const canvasHeight = window.innerHeight / 1.3;

  p.preload = () => {
    img = p.loadImage("/noise-texture.png");
    // myShader = p.loadShader('/shaders/red_hue_with_waves/effect.vert', '/shaders/red_hue_with_waves/effect.frag');
    myShader = p.loadShader('/shaders/simple/effect.vert', '/shaders/simple/effect.frag');
  };

  p.setup = async () => {
    p.noCanvas()
    const canvas = p.createCanvas(canvasWidth, canvasHeight, p.WEBGL);
    // p.frameRate(60);
    canvas.id("main_canvas");


    // try {
    //   // Get all audio devices
    //   const devices = await navigator.mediaDevices.enumerateDevices();
    //   const audioInputs = devices.filter(device => device.kind === 'audioinput');
  
    //   console.log(audioInputs);
  
    //   if (audioInputs.length > 0) {
    //     // Use the first available audio input device
    //     const firstAudioDevice = audioInputs[0];
    //     microphone = new Microphone(firstAudioDevice.deviceId, bufferLength);
    //   } else {
    //     console.warn('No audio input devices found');
    //     microphone = new Microphone('default', bufferLength);
    //   }
  
    //   const curves = new CurvesWithMic(p, canvasWidth, canvasHeight, microphone);
    //   scenes.push(curves);
    // } catch (error) {
    //   console.error('Error getting audio devices:', error);
    //   microphone = new Microphone('default', bufferLength);
    // }

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
  
            // const sin = new SinWithMic(p, canvasWidth, canvasHeight, microphone);
            // scenes.push(sin);
  
            const cam = new CamWithEffects(p, canvasWidth, canvasHeight, microphone, myShader);
            scenes.push(cam);
  
            // const curves = new CurvesWithMic(p, canvasWidth, canvasHeight, microphone);
            // scenes.push(curves);
            // const gridSize = 10;
            // const lifeGame = new LifeGameWithMic(
            //   p, microphone,
            //   Math.ceil((canvasWidth / gridSize) / 2),
            //   Math.ceil(canvasHeight / gridSize) / 2,
            //   gridSize,
            //   3,
            //   10,
            //   100,
            // );
            // lifeGame.addMidiController(midiController);
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

  p.keyPressed = () => {
    if ((p.key = "s")) {
      // p.saveGif("toto", 10, {});
    }
  };

  p.draw = () => {
    p.background(254, 249, 255);
    // p.noStroke();
    // p.translate(40, 40);

    scenes.forEach((scene) => scene.draw());

    // p.blendMode(p.SOFT_LIGHT);

    // p.tint(255, 255 * 0.25)
    // p.image(img, 0, 0, canvasWidth, canvasHeight);
    // p.blendMode(p.NORMAL);

    // mask.draw(canvasWidth, canvasHeight);

    // const image = mainCanvas.createImage(canvasWidth, canvasHeight);
    // image.mask(maskCanvas.createImage(canvasWidth, canvasHeight));

    // p.image(mainCanvas, -canvasWidth / 2 + 200, 0, canvasWidth, canvasHeight);
    // mask.period += 0.05;
  };
});

// const midiController = new Midi();
// const mainCanvas = p5Instance.createGraphics(canvasWidth, canvasHeight, "webgl");
// const maskCanvas = p5Instance.createGraphics(canvasWidth, canvasHeight, "webgl");
