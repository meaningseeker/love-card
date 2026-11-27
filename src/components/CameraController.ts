import * as THREE from 'three';

export class CameraController {
  private keys = new Set<string>();

  private readonly moveSpeed = 8;
  private readonly turnSpeed = 1.5;
  private readonly lookSpeed = 1.2;

  private forward = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    console.log('[CameraController] 연결 완료');
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown'].includes(key)) {
      event.preventDefault();
    }

    // 스페이스바: 현재 카메라 정보 출력
    if (key === ' ') {
      this.printCameraInfo();
      return;
    }

    this.keys.add(key);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };

  private onBlur = () => {
    this.keys.clear();
  };

  private printCameraInfo() {
    this.camera.updateMatrixWorld(true);

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const position = this.camera.position;
    const rotation = this.camera.rotation;

    console.log('===== CAMERA POSITION =====');
    console.log('Position:', {
      x: position.x,
      y: position.y,
      z: position.z,
    });

    console.log('Rotation (radians):', {
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
    });

    console.log('Rotation (degrees):', {
      x: THREE.MathUtils.radToDeg(rotation.x),
      y: THREE.MathUtils.radToDeg(rotation.y),
      z: THREE.MathUtils.radToDeg(rotation.z),
    });

    console.log('Direction:', {
      x: direction.x,
      y: direction.y,
      z: direction.z,
    });

    console.log('===========================');
  }

  update(dt: number) {
    this.camera.getWorldDirection(this.forward);

    if (this.keys.has('w')) {
      this.camera.position.addScaledVector(this.forward, this.moveSpeed * dt);
    }

    if (this.keys.has('s')) {
      this.camera.position.addScaledVector(this.forward, -this.moveSpeed * dt);
    }

    if (this.keys.has('a')) {
      this.camera.rotateY(this.turnSpeed * dt);
    }

    if (this.keys.has('d')) {
      this.camera.rotateY(-this.turnSpeed * dt);
    }

    if (this.keys.has('arrowup')) {
      this.camera.rotation.x += this.lookSpeed * dt;
    }

    if (this.keys.has('arrowdown')) {
      this.camera.rotation.x -= this.lookSpeed * dt;
    }

    this.camera.rotation.x = THREE.MathUtils.clamp(
      this.camera.rotation.x,
      -Math.PI / 2 + 0.05,
      Math.PI / 2 - 0.05,
    );
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    this.keys.clear();
  }
}
