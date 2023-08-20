import p5 from "p5";

import { Microphone } from "./inputs/microphone";
import { Scene } from "./scenes";
// import { Midi } from "./inputs/midit";
import { CurvesWithMic } from "./scenes/curves_with_mic";

import "./style.css";
import { LifeGameWithMic } from "./scenes/life_game_with_mic";

let img: p5.Image;

const p5Instance = new p5(() => { });
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
          "f34f489ce77ed1ac37de4908babb1504e2303ad209e68eb3ea9ce2f190868e3a",
          bufferLength
        );

        // const curves = new CurvesWithMic(p5Instance, canvasWidth, canvasHeight, microphone);

        // scenes.push(curves);
        const gridSize = 10;
        const lifeGame = new LifeGameWithMic(
          p5Instance, microphone,
          Math.ceil((canvasWidth / gridSize) / 2),
          Math.ceil(canvasHeight / gridSize) / 2,
          gridSize,
          3,
          10,
          100,
        );
        // lifeGame.addMidiController(midiController);
        scenes.push(lifeGame);
      }
    },
    false
  );
};

p5Instance.draw = () => {
  p5Instance.background(0);
  // p5Instance.noStroke();
  // p5Instance.translate(40, 40);

  scenes.forEach((scene) => scene.draw());

  // p5Instance.blendMode(p5Instance.DODGE);
  // p5Instance.image(img, 0, 0, canvasWidth, canvasHeight);
  p5Instance.blendMode(p5Instance.BLEND);
};
