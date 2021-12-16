import * as THREE from "three";
import fragment from "@three/shaders/fragment.glsl?raw";
import vertex from "@three/shaders/vertex.glsl?raw";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from "dat.gui";
import gsap from "gsap";
import front from "@assets/img/ribbon1.png";
import back from "@assets/img/ribbon2.png";

export default class Sketch {

    constructor() {
        this.scene = new THREE.Scene();

        this.container = document.querySelector("#default-layout");
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setPixelRatio(2);
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0xeeeeee, 1);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.001,
            1000
        );
        this.camera.position.set(0, 0, 3);
        //orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false;

        this.clock = new THREE.Clock();
        this.setupRaycaster();
        this.settings();
        this.setupResize();
        this.addLights();

    }
    setupRaycaster = () => {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        window.addEventListener("mousemove", this.onMouseMove, false);
    };
    onMouseMove = (event) => {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    addLights = () => {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.86));
        let dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(0, 10, 10);
        this.scene.add(dirLight);
    };
    settings = () => {
        this.settings = {
            progress: 0,
        };
        this.gui = new dat.GUI();
        this.gui.add(this.settings, "progress", 0, 1, 0.01);

    };

    setupResize = () => {
        window.addEventListener("resize", this.resize);
    };

    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
    }

    addObjects = () => {

        const frontTexture = new THREE.TextureLoader().load(front);
        const backTexture = new THREE.TextureLoader().load(back);

        [frontTexture, backTexture].forEach(t => {
            t.wrapS = 1000;
            t.wrapT = 1000;
            t.repeat.set(1, -1);
            t.offset.setX(0.5);
            t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            //t.generateMipmaps = false;
            //t.mipmaps = [t];
        });
        backTexture.repeat.set(-1, -1);

        let frontMaterial = new THREE.MeshStandardMaterial({
            map: frontTexture,
            side: THREE.BackSide,
            roughness: 0.65,
            metalness: 0.25,
            alphaTest: true,
            flatShading: true
        });
        let backMaterial = new THREE.MeshStandardMaterial({
            map: backTexture,
            side: THREE.FrontSide,
            roughness: 0.65,
            metalness: 0.25,
            alphaTest: true,
            flatShading: true
        });
        const num = 7;
        let curvePoints = [];
        for (let index = 0; index < num; index++) {
            let theta = index / num * Math.PI * 2;
            curvePoints.push(new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 + 0.5 * (Math.random() - 0.5), theta));
        }
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        curve.tension = 0.7;
        curve.closed = true;
        const number = 1000;
        let frenetFrames = curve.computeFrenetFrames(number, true);
        let spacedPoints = curve.getSpacedPoints(number);
        let tempPlane = new THREE.PlaneBufferGeometry(1, 1, number, 1);
        this.materials = [frontMaterial, backMaterial];
        tempPlane.addGroup(0, 6000, 0);
        tempPlane.addGroup(0, 6000, 1);
        let dimensions = [-0.2, 0.2];
        let point = new THREE.Vector3();
        let binormalShift = new THREE.Vector3();
        let finalPoints = [];
        dimensions.forEach(d => {
            for (let i = 0; i <= number; i++) {
                point = spacedPoints[i];
                binormalShift.copy(frenetFrames.binormals[i]).multiplyScalar(d);

                finalPoints.push(new THREE.Vector3().copy(point).add(binormalShift).normalize());
            }
        });
        finalPoints[0].copy(finalPoints[number]);
        finalPoints[number + 1].copy(finalPoints[2 * number + 1]);
        tempPlane.setFromPoints(finalPoints);
        this.finalMesh = new THREE.Mesh(tempPlane, this.materials);
        this.scene.add(this.finalMesh);
    };

    render = () => {
        this.time = this.clock.getElapsedTime();
        const offset = this.time * 0.1;
        this.materials.forEach((m, i) => {
            m.map.offset.setX(offset);
            if (i > 0) m.map.offset.setX(-offset);
        });
        // this.camera.rotation.x += (this.mouse.x * 2 - this.camera.rotation.x);
        this.finalMesh.rotation.y = this.lerp(this.finalMesh.rotation.y, this.mouse.x, 0.1);
        this.finalMesh.rotation.x = this.lerp(this.finalMesh.rotation.x, -this.mouse.y * 0.5, 0.05);;
        requestAnimationFrame(this.render);
        this.renderer.render(this.scene, this.camera);
    };
    lerp = (start, end, amt) => {
        return (1 - amt) * start + amt * end;
    };
    goTo = route => {
        switch (route) {
            case 'home':
                this.addObjects();
        }
        this.render();
    };

}