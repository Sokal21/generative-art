import p5 from "p5";

import { Microphone } from "./inputs/microphone";
import { Scene } from "./scenes";
// import { Midi } from "./inputs/midit";
// import { CurvesWithMic } from "./scenes/curves_with_mic";
// import { LifeGameWithMic } from "./scenes/life_game_with_mic";
// import { SinWithMic } from "./scenes/sin_with_mic";
import { CamWithEffects } from "./scenes/cam_with_effects";
import { VideoWithEffect } from "./scenes/video_with_effect";
// import { Beater } from "./scenes/beater";
import "./style.css";
import { StreamedScene } from "./scenes/streamed_scene";

// Add PeerJS type
declare const Peer: any;

let peer: any = null;

const videoUrls = [
  '/videos/loop1.webm',
  '/videos/loop2.webm',
  '/videos/loop3.mp4',
  '/videos/loop4.webm',
  '/videos/loop5.webm',
  '/videos/loop6.mp4',
  '/videos/loop7.webm',
  '/videos/loop8.webm',
];

// Create UI elements
const setupUI = () => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '50%';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -50%)';
  container.style.textAlign = 'center';
  container.style.zIndex = '1000';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.padding = '20px';
  container.style.borderRadius = '10px';
  container.style.color = 'white';

  const title = document.createElement('h2');
  title.textContent = 'Select Mode';
  container.appendChild(title);

  const senderBtn = document.createElement('button');
  senderBtn.textContent = 'Sender';
  senderBtn.style.margin = '10px';
  senderBtn.style.padding = '10px 20px';
  senderBtn.style.fontSize = '16px';
  senderBtn.style.cursor = 'pointer';
  senderBtn.onclick = () => {
    container.style.display = 'none';
    setupSender();
    // Initialize p5 only for sender
    new p5(senderSketch);
  };
  container.appendChild(senderBtn);

  const receiverBtn = document.createElement('button');
  receiverBtn.textContent = 'Receiver';
  receiverBtn.style.margin = '10px';
  receiverBtn.style.padding = '10px 20px';
  receiverBtn.style.fontSize = '16px';
  receiverBtn.style.cursor = 'pointer';
  receiverBtn.onclick = () => {
    container.style.display = 'none';
    setupReceiver();
  };
  container.appendChild(receiverBtn);

  document.body.appendChild(container);
};

const setupSender = () => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.padding = '10px';
  container.style.borderRadius = '5px';
  container.style.color = 'white';

  // Connect to PeerJS server immediately
  peer = new Peer('SENDER_PEER_ID', {
    host: '192.168.100.87',
    port: 9000,
    path: '/'
  });

  peer.on('open', (id: string) => {
    console.log('Connected to PeerJS server with ID:', id);
  });

  peer.on('error', (err: any) => {
    console.error('PeerJS error:', err);
    alert('Error connecting to PeerJS server. Please try again.');
  });

  // Keep track of active calls
  const activeCalls = new Map<string, any>();

  const prefetchVideos = async () => {
    const prefetchContainer = document.createElement('div');
    prefetchContainer.style.marginTop = '10px';
    prefetchContainer.style.padding = '10px';
    prefetchContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    prefetchContainer.style.borderRadius = '5px';

    const statusText = document.createElement('div');
    statusText.textContent = 'Prefetching videos...';
    prefetchContainer.appendChild(statusText);

    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '5px';
    progressBar.style.backgroundColor = '#333';
    progressBar.style.marginTop = '5px';
    progressBar.style.borderRadius = '2px';
    prefetchContainer.appendChild(progressBar);

    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#4CAF50';
    progressFill.style.borderRadius = '2px';
    progressBar.appendChild(progressFill);

    container.appendChild(prefetchContainer);

    const videos = new Map<string, HTMLVideoElement>();
    let loadedCount = 0;

    for (const url of videoUrls) {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = url;
      videos.set(url, video);

      video.onloadeddata = () => {
        loadedCount++;
        const progress = (loadedCount / videoUrls.length) * 100;
        progressFill.style.width = `${progress}%`;
        statusText.textContent = `Prefetching videos... ${Math.round(progress)}%`;

        if (loadedCount === videoUrls.length) {
          statusText.textContent = 'All videos prefetched!';
          setTimeout(() => {
            prefetchContainer.style.display = 'none';
          }, 2000);
        }
      };

      video.onerror = () => {
        console.error(`Failed to load video: ${url}`);
        loadedCount++;
        const progress = (loadedCount / videoUrls.length) * 100;
        progressFill.style.width = `${progress}%`;
        statusText.textContent = `Prefetching videos... ${Math.round(progress)}%`;
      };
    }
  };

  prefetchVideos();

  const startStreamBtn = document.createElement('button');
  startStreamBtn.textContent = 'Start Stream';
  startStreamBtn.style.margin = '5px';
  startStreamBtn.style.padding = '5px 10px';
  startStreamBtn.style.cursor = 'pointer';
  startStreamBtn.onclick = () => {
    const canvas = document.querySelector('#main_canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }
    const stream = canvas.captureStream(60);

    // Hang up any existing calls
    activeCalls.forEach((call, peerId) => {
      call.close();
      activeCalls.delete(peerId);
    });

    // Call all selected peers
    selectedPeers.forEach(peerId => {
      const call = peer.call(peerId, stream);
      activeCalls.set(peerId, call);

      call.on('close', () => {
        activeCalls.delete(peerId);
      });
    });
  };
  container.appendChild(startStreamBtn);

  // Add connected peers list
  const peersContainer = document.createElement('div');
  peersContainer.style.marginTop = '10px';
  
  const peersTitle = document.createElement('h3');
  peersTitle.textContent = 'Connected Peers:';
  peersTitle.style.margin = '0 0 5px 0';
  peersContainer.appendChild(peersTitle);
  
  const peersList = document.createElement('ul');
  peersList.style.listStyle = 'none';
  peersList.style.padding = '0';
  peersList.style.margin = '0';
  peersContainer.appendChild(peersList);

  // Create URL input and send button
  const urlContainer = document.createElement('div');
  urlContainer.style.marginTop = '10px';
  urlContainer.style.display = 'flex';
  urlContainer.style.gap = '5px';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.placeholder = 'Enter video URL (e.g. /videos/loop3.webm)';
  urlInput.style.flex = '1';
  urlInput.style.padding = '5px';
  urlInput.value = '/videos/loop7.webm'; // Default value

  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send to Selected';
  sendBtn.style.padding = '5px 10px';
  sendBtn.style.cursor = 'pointer';

  urlContainer.appendChild(urlInput);
  urlContainer.appendChild(sendBtn);
  container.appendChild(urlContainer);

  // Keep track of selected peers
  const selectedPeers = new Set<string>();

  const updatePeersList = (peers: string[]) => {
    peersList.innerHTML = '';
    peers.forEach(peerId => {
      const li = document.createElement('li');
      li.style.margin = '2px 0';
      li.style.padding = '5px';
      li.style.borderRadius = '3px';
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.gap = '5px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedPeers.has(peerId);
      checkbox.onchange = () => {
        if (checkbox.checked) {
          selectedPeers.add(peerId);
        } else {
          selectedPeers.delete(peerId);
          // Hang up call if peer is deselected
          const call = activeCalls.get(peerId);
          if (call) {
            call.close();
            activeCalls.delete(peerId);
          }
        }
      };

      const label = document.createElement('span');
      label.textContent = peerId;
      label.style.cursor = 'pointer';
      label.onclick = () => {
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
          selectedPeers.add(peerId);
        } else {
          selectedPeers.delete(peerId);
          // Hang up call if peer is deselected
          const call = activeCalls.get(peerId);
          if (call) {
            call.close();
            activeCalls.delete(peerId);
          }
        }
      };

      li.appendChild(checkbox);
      li.appendChild(label);
      peersList.appendChild(li);
    });
  };

  sendBtn.onclick = () => {
    const url = urlInput.value.trim();
    if (!url) {
      alert('Please enter a video URL');
      return;
    }
    if (selectedPeers.size === 0) {
      alert('Please select at least one peer');
      return;
    }

    // Hang up any existing calls
    activeCalls.forEach((call, peerId) => {
      call.close();
      activeCalls.delete(peerId);
    });

    // Send to all selected peers
    selectedPeers.forEach(peerId => {
      const conn = peer.connect(peerId);
      conn.on('open', () => {
        conn.send({
          type: 'video',
          url: url
        });
      });
    });
  };

  const queryPeersBtn = document.createElement('button');
  queryPeersBtn.textContent = 'Query Connected Peers';
  queryPeersBtn.style.margin = '5px';
  queryPeersBtn.style.padding = '5px 10px';
  queryPeersBtn.style.cursor = 'pointer';
  queryPeersBtn.onclick = async () => {
    try {
      const response = await fetch('http://192.168.100.87:9000/peerjs/peers');
      const data = await response.json();
      console.log('Server peers:', data);
      updatePeersList(data);
    } catch (error) {
      console.error('Error querying server peers:', error);
    }
  };
  container.appendChild(queryPeersBtn);
  container.appendChild(peersContainer);

  document.body.appendChild(container);
};

const setupReceiver = () => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '50%';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -50%)';
  container.style.textAlign = 'center';
  container.style.zIndex = '1000';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.padding = '20px';
  container.style.borderRadius = '10px';
  container.style.color = 'white';

  let scenes: Scene[] = [];
  let p5Instance: p5;
  let shader: p5.Shader;
  const microphone = new Microphone('default', 1024);

  // Prefetch videos
  const prefetchVideos = async () => {
    const prefetchContainer = document.createElement('div');
    prefetchContainer.style.marginTop = '10px';
    prefetchContainer.style.padding = '10px';
    prefetchContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    prefetchContainer.style.borderRadius = '5px';

    const statusText = document.createElement('div');
    statusText.textContent = 'Prefetching videos...';
    prefetchContainer.appendChild(statusText);

    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '5px';
    progressBar.style.backgroundColor = '#333';
    progressBar.style.marginTop = '5px';
    progressBar.style.borderRadius = '2px';
    prefetchContainer.appendChild(progressBar);

    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = '#4CAF50';
    progressFill.style.borderRadius = '2px';
    progressBar.appendChild(progressFill);

    container.appendChild(prefetchContainer);

    const videos = new Map<string, HTMLVideoElement>();
    let loadedCount = 0;

    for (const url of videoUrls) {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = url;
      videos.set(url, video);

      video.onloadeddata = () => {
        loadedCount++;
        const progress = (loadedCount / videoUrls.length) * 100;
        progressFill.style.width = `${progress}%`;
        statusText.textContent = `Prefetching videos... ${Math.round(progress)}%`;

        if (loadedCount === videoUrls.length) {
          statusText.textContent = 'All videos prefetched!';
          setTimeout(() => {
            prefetchContainer.style.display = 'none';
          }, 2000);
        }
      };

      video.onerror = () => {
        console.error(`Failed to load video: ${url}`);
        loadedCount++;
        const progress = (loadedCount / videoUrls.length) * 100;
        progressFill.style.width = `${progress}%`;
        statusText.textContent = `Prefetching videos... ${Math.round(progress)}%`;
      };
    }
  };

  // Create p5 sketch for receiver
  new p5((p: p5) => {
    p5Instance = p;
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    p.preload = () => {
      shader = p.loadShader('/shaders/red_effect/effect.vert', '/shaders/red_effect/effect.frag');
    };

    p.setup = () => {
      const canvas = p.createCanvas(canvasWidth, canvasHeight, p.WEBGL);
      canvas.id("main_canvas");
      p.pixelDensity(1);
      p.frameRate(60);
    };

    p.draw = () => {
      p.translate(-p.width/2, -p.height/2);
      scenes.forEach((scene) => scene.draw());
    };
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter Peer ID';
  input.style.padding = '10px';
  input.style.fontSize = '16px';
  input.style.marginRight = '10px';
  container.appendChild(input);

  const connectBtn = document.createElement('button');
  connectBtn.textContent = 'Connect';
  connectBtn.style.padding = '10px 20px';
  connectBtn.style.fontSize = '16px';
  connectBtn.style.cursor = 'pointer';
  connectBtn.onclick = () => {
    const peerId = input.value.trim();
    if (!peerId) {
      alert('Please enter a Peer ID');
      return;
    }

    peer = new Peer(peerId, {
      host: '192.168.100.87',
      port: 9000,
      path: '/'
    });

    peer.on('open', () => {
      console.log('Connected to PeerJS server');
      container.style.display = 'none';
      // Start prefetching videos after connection
      prefetchVideos();
    });

    peer.on('error', (err: any) => {
      console.error('PeerJS error:', err);
      alert('Error connecting to PeerJS server. Please try again.');
    });

    peer.on('connection', (conn: any) => {
      conn.on('data', (data: any) => {
        if (data.type === 'video') {
          // Clear existing scenes
          scenes.forEach((scene) => scene.delete());
          scenes = [];

          // Create new video scene with the received URL
          const videoScene = new VideoWithEffect(
            p5Instance,
            p5Instance.width,
            p5Instance.height,
            microphone,
            shader,
            data.url,
            {}
          );
          scenes = [videoScene];
        }
      });
    });

    peer.on('call', (call: any) => {
      call.answer();
      console.log('call', call);
      call.on('stream', (remoteStream: MediaStream) => {
        // Create a video element from the stream

        scenes.forEach((scene) => scene.delete());

        console.log('remoteStream', remoteStream);

        scenes = [];
        scenes = [
          new StreamedScene(p5Instance, p5Instance.width, p5Instance.height, remoteStream)
        ];
        // Add the stream to the canvas
        
      });
    });
  };
  container.appendChild(connectBtn);

  document.body.appendChild(container);
};

// Initialize the UI
setupUI();

// Sender sketch
const senderSketch = (p: p5) => {
  let img: p5.Image;
  let shader: p5.Shader;
  const scenes: Scene[] = [];
  let microphone: Microphone;
  const bufferLength = 1024;
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;

  p.preload = () => {
    img = p.loadImage("/noise-texture.png");
    shader = p.loadShader('/shaders/red_hue_with_waves/effect.vert', '/shaders/red_hue_with_waves/effect.frag');
  };

  p.setup = async () => {
    p.noCanvas()
    const canvas = p.createCanvas(canvasWidth, canvasHeight, p.WEBGL);
    p.pixelDensity(1);
    p.frameRate(60);
    canvas.id("main_canvas");

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

      // Create camera scene with shader
      const camScene = new CamWithEffects(
        p,
        canvasWidth,
        canvasHeight,
        microphone,
        shader,
        {}
      );
      scenes.push(camScene);
    } catch (error) {
      console.error('Error getting audio devices:', error);
      microphone = new Microphone('default', bufferLength);
    }
  };

  p.draw = () => {
    p.translate(-p.width/2, -p.height/2);
    scenes.forEach((scene) => scene.draw());
  };
};

// const midiController = new Midi();
// const mainCanvas = p5Instance.createGraphics(canvasWidth, canvasHeight, "webgl");
// const maskCanvas = p5Instance.createGraphics(canvasWidth, canvasHeight, "webgl");
