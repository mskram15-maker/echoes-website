import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.MeshoptDecoder = MeshoptDecoder;
window.ECHOES_BASE_URL = import.meta.env.BASE_URL;
document.documentElement.style.setProperty(
  "--forest-background",
  `url("${import.meta.env.BASE_URL}assets/forest/forest_ground_diffuse_1k.jpg")`
);

const gameScript = document.createElement("script");
gameScript.src = `${import.meta.env.BASE_URL}game.js`;
document.body.appendChild(gameScript);
