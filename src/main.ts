import p5 from "p5";

import { Microphone } from "./inputs/microphone";
import { Scene } from "./scenes";
// import { Midi } from "./inputs/midit";
import { CurvesWithMic } from "./scenes/curves_with_mic";

import "./style.css";

let img: p5.Image;

const p5Instance = new p5(() => {});
const scenes: Scene[] = [];
let microphone: Microphone;
// const midiController = new Midi();

const bufferLength = 1024;
const canvasWidth = window.innerWidth / 1.3;
const canvasHeight = window.innerHeight / 1.3;

p5Instance.keyPressed = () => {
  if ((p5Instance.key = "s")) {
    p5Instance.saveGif("toto", 5, {});
  }
};

p5Instance.preload = () => {
  img = p5Instance.loadImage("/texture.webp");
};

p5Instance.setup = () => {
  p5Instance.createCanvas(canvasWidth, canvasHeight);
  p5Instance.frameRate(60);

  document.getElementById("start_mic")?.addEventListener(
    "click",
    () => {
      if (!microphone) {
        microphone = new Microphone(
          "d3159ed8e0589d9a702bcde9378b6f4fb1a6d234fafe851be466b9cccbf86f41",
          bufferLength
        );

        const curves = new CurvesWithMic(p5Instance, canvasWidth, canvasHeight);

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
        // lifeGame.addMidiController(midiController);
        // scenes.push(lifeGame);
      }
    },
    false
  );
};

p5Instance.draw = () => {
  p5Instance.background(240);
  // p5Instance.noStroke();
  // p5Instance.translate(40, 40);

  scenes.forEach((scene) => scene.draw());

  p5Instance.blendMode(p5Instance.DODGE);
  p5Instance.image(img, 0, 0, canvasWidth, canvasHeight);
  p5Instance.blendMode(p5Instance.NORMAL);
};
