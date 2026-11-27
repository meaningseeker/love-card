import * as THREE from 'three';

export class CameraController {
  private keys = new Set<string>();

  private readonly moveSpeed = 8;
  private readonly sprintMultiplier = 2.5;
  private readonly turnSpeed = 1.5;
  private readonly lookSpeed = 1.2;

  private readonly gravity = 18;
  private readonly jumpPower = 7;

  private verticalVelocity = 0;
  private jumpOffset = 0;
  private isGrounded = true;

  private forward = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    console.log('[CameraController] 연결 완료');
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    if (
      ['w', 'a', 's', 'd', ' ', 'shift', 'arrowup', 'arrowdown'].includes(key)
    ) {
      event.preventDefault();
    }

    if (key === ' ' && !event.repeat && this.isGrounded) {
      this.verticalVelocity = this.jumpPower;
      this.isGrounded = false;
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

  update(dt: number) {
    const speed = this.moveSpeed *
      (this.keys.has('shift') ? this.sprintMultiplier : 1);

    // 바라보는 방향으로 이동
    this.camera.getWorldDirection(this.forward);

    if (this.keys.has('w')) {
      this.camera.position.addScaledVector(this.forward, speed * dt);
    }

    if (this.keys.has('s')) {
      this.camera.position.addScaledVector(this.forward, -speed * dt);
    }

    // 좌우 회전
    if (this.keys.has('a')) {
      this.camera.rotateY(this.turnSpeed * dt);
    }

    if (this.keys.has('d')) {
      this.camera.rotateY(-this.turnSpeed * dt);
    }

    // 위아래 시선 조절
    if (this.keys.has('arrowup')) {
      this.camera.rotation.x += this.lookSpeed * dt;
    }

    if (this.keys.has('arrowdown')) {
      this.camera.rotation.x -= this.lookSpeed * dt;
    }

    // 카메라가 뒤집히거나 기울어지지 않도록 제한
    this.camera.rotation.x = THREE.MathUtils.clamp(
      this.camera.rotation.x,
      -Math.PI / 2 + 0.05,
      Math.PI / 2 - 0.05
    );
    this.camera.rotation.z = 0;

    // 점프 물리
    if (!this.isGrounded) {
      const previousOffset = this.jumpOffset;

      this.verticalVelocity -= this.gravity * dt;
      this.jumpOffset += this.verticalVelocity * dt;

      if (this.jumpOffset <= 0) {
        this.jumpOffset = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }

      this.camera.position.y += this.jumpOffset - previousOffset;
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    this.keys.clear();
  }
}
