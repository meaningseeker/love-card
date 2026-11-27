import * as THREE from 'three';

export class CameraController {
  private keys = new Set<string>();

  private readonly moveSpeed = 8;
  private readonly sprintMultiplier = 2.5;
  private readonly lookSpeed = 1.5;
  private readonly gravity = 18;
  private readonly jumpPower = 7;

  private verticalVelocity = 0;
  private jumpOffset = 0;
  private jumpCount = 0;
  private unlocked = false;

  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();

  private code = '';
  private message?: HTMLDivElement;

  constructor(private camera: THREE.PerspectiveCamera) {
    this.camera.rotation.order = 'YXZ';

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    console.log('[CameraController] 연결 완료');
  }

  private showMessage() {
    if (!this.message) {
      this.message = document.createElement('div');
      Object.assign(this.message.style, {
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '99999',
        color: 'white',
        fontSize: '28px',
        fontWeight: 'bold',
        textShadow: '0 2px 12px #000',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      });
      document.body.appendChild(this.message);
    }

    this.message.textContent = '잠금 해제';
    this.message.style.display = 'block';

    setTimeout(() => {
      if (this.message) this.message.style.display = 'none';
    }, 1800);
  }

  // 하트 모양 구름 발사
  private launchHeartCloud() {
    const cloud = document.createElement('div');

    Object.assign(cloud.style, {
      position: 'fixed',
      left: '50%',
      top: '58%',
      width: '150px',
      height: '130px',
      zIndex: '99998',
      pointerEvents: 'none',
      transform: 'translate(-50%, 0)',
      filter: 'drop-shadow(0 5px 14px rgba(255, 145, 180, 0.5))',
    });

    cloud.innerHTML = `
      <svg viewBox="0 0 180 150"
           width="100%" height="100%"
           xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="heartCloudColor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff8fb"/>
            <stop offset="55%" stop-color="#ffc6d9"/>
            <stop offset="100%" stop-color="#f49bbd"/>
          </linearGradient>
        </defs>

        <path
          d="M90 139
             C75 126 20 92 20 54
             C20 25 52 13 73 31
             C80 15 101 11 116 25
             C145 8 169 32 161 61
             C153 91 111 124 90 139Z"
          fill="url(#heartCloudColor)"
          stroke="#fff"
          stroke-width="5"
          stroke-linejoin="round"
        />

        <path
          d="M90 116
             C76 104 49 83 49 61
             C49 45 67 40 79 53
             C91 38 111 44 111 61
             C111 83 101 99 90 116Z"
          fill="#ff8fb8"
          opacity="0.85"
        />

        <circle cx="35" cy="53" r="8" fill="#fff" opacity="0.8"/>
        <circle cx="143" cy="48" r="9" fill="#fff" opacity="0.8"/>
        <circle cx="57" cy="25" r="5" fill="#fff" opacity="0.9"/>
        <circle cx="125" cy="22" r="6" fill="#fff" opacity="0.9"/>
      </svg>
    `;

    document.body.appendChild(cloud);

    const animation = cloud.animate(
      [
        {
          transform: 'translate(-50%, 0) scale(1)',
          opacity: 0,
        },
        {
          transform: 'translate(-50%, -8vh) scale(1.15)',
          opacity: 1,
          offset: 0.12,
        },
        {
          transform: 'translate(-50%, -38vh) scale(0.8)',
          opacity: 0.9,
          offset: 0.65,
        },
        {
          transform: 'translate(-50%, -75vh) scale(0.2)',
          opacity: 0,
        },
      ],
      {
        duration: 1900,
        easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        fill: 'forwards',
      },
    );

    animation.onfinish = () => cloud.remove();
  }


  private logCameraSettings() {
    this.camera.updateMatrixWorld(true);

    const p = this.camera.position;
    const r = this.camera.rotation;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const degrees = THREE.MathUtils.radToDeg;

    console.group('📷 CAMERA SETTINGS');
    console.log('Position:', {
      x: p.x, y: p.y, z: p.z
    });
    console.log('Rotation (radians):', {
      x: r.x, y: r.y, z: r.z
    });
    console.log('Rotation (degrees):', {
      x: degrees(r.x), y: degrees(r.y), z: degrees(r.z)
    });
    console.log('Rotation order:', r.order);
    console.log('Look direction:', direction);
    console.log('Camera settings:', {
      fov: this.camera.fov,
      aspect: this.camera.aspect,
      near: this.camera.near,
      far: this.camera.far,
      zoom: this.camera.zoom
    });

    console.log('복사용 코드:');
    console.log(
      `camera.position.set(${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)});`
    );
    console.log(
      `camera.rotation.set(${r.x.toFixed(4)}, ${r.y.toFixed(4)}, ${r.z.toFixed(4)});`
    );
    console.groupEnd();
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    if (key === '5' && !event.repeat) {
      this.logCameraSettings();
      return;
    }


    if (
      [
        'w',
        'a',
        's',
        'd',
        ' ',
        'shift',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        'enter',
      ].includes(key)
    ) {
      event.preventDefault();
    }

    if (/^[0-9]$/.test(key)) {
      this.code = (this.code + key).slice(-4);
    }

    if (key === 'enter') {
      if (event.repeat) return;

      if (this.code === '1219' && !this.unlocked) {
        this.unlocked = true;
        this.showMessage();
        console.log('잠금 해제 완료! 더블 점프 활성화');
      } else if (this.unlocked) {
        this.launchHeartCloud();
        console.log('하트 구름 발사!');
      }

      this.code = '';
      return;
    }

    if (key === ' ' && !event.repeat) {
      const maxJumps = this.unlocked ? 2 : 1;

      if (this.jumpCount < maxJumps) {
        this.verticalVelocity = this.jumpPower;
        this.jumpCount++;
      }
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
    const speed =
      this.moveSpeed * (this.keys.has('shift') ? this.sprintMultiplier : 1);

    if (this.keys.has('arrowleft')) {
      this.camera.rotation.y += this.lookSpeed * dt;
    }

    if (this.keys.has('arrowright')) {
      this.camera.rotation.y -= this.lookSpeed * dt;
    }

    if (this.keys.has('arrowup')) {
      this.camera.rotation.x += this.lookSpeed * dt;
    }

    if (this.keys.has('arrowdown')) {
      this.camera.rotation.x -= this.lookSpeed * dt;
    }

    this.camera.rotation.x = THREE.MathUtils.clamp(
      this.camera.rotation.x,
      -1.45,
      1.45,
    );

    this.camera.rotation.z = 0;

    this.forward.set(
      -Math.sin(this.camera.rotation.y),
      0,
      -Math.cos(this.camera.rotation.y),
    );

    this.right.set(
      Math.cos(this.camera.rotation.y),
      0,
      -Math.sin(this.camera.rotation.y),
    );

    if (this.keys.has('w')) {
      this.camera.position.addScaledVector(this.forward, speed * dt);
    }
    if (this.keys.has('s')) {
      this.camera.position.addScaledVector(this.forward, -speed * dt);
    }
    if (this.keys.has('a')) {
      this.camera.position.addScaledVector(this.right, -speed * dt);
    }
    if (this.keys.has('d')) {
      this.camera.position.addScaledVector(this.right, speed * dt);
    }

    if (this.jumpCount > 0 || this.jumpOffset > 0) {
      const previousOffset = this.jumpOffset;

      this.verticalVelocity -= this.gravity * dt;
      this.jumpOffset += this.verticalVelocity * dt;

      if (this.jumpOffset <= 0) {
        this.jumpOffset = 0;
        this.verticalVelocity = 0;
        this.jumpCount = 0;
      }

      this.camera.position.y += this.jumpOffset - previousOffset;
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    this.message?.remove();
    this.keys.clear();
  }
}
