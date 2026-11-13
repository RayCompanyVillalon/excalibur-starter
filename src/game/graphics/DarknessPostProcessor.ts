import {
  ScreenShader,
  vec,
  type ExcaliburGraphicsContextWebGL,
  type PostProcessor,
  type Shader,
  type VertexLayout,
} from 'excalibur';

import { GAME } from '../config';

/**
 * Screen-space cave darkness. Everything outside a soft pool of lamplight is
 * crushed to near-black; the pool itself is warmed slightly. The light centre
 * and view size are fed to the shader in screen pixels every frame.
 */
const fragmentSource = `#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_light;
uniform vec2 u_view;
uniform float u_radius;
uniform float u_darkness;
uniform float u_time_ms;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 tex = texture(u_image, v_uv);
  vec2 px = v_uv * u_view;

  // A gentle flicker keeps the lamp from looking like a flat gradient.
  float flicker = 0.94 + 0.06 * sin(u_time_ms * 0.011) * sin(u_time_ms * 0.006 + 1.7);
  float radius = u_radius * flicker;

  float d = distance(px, u_light);
  float core = 1.0 - smoothstep(radius * 0.40, radius * 1.0, d);
  float halo = 1.0 - smoothstep(radius * 0.85, radius * 1.70, d);
  float light = clamp(core + halo * 0.16, 0.0, 1.0);

  // Ambient keeps cave silhouettes readable; lit area is warmed.
  vec3 warm = tex.rgb * vec3(1.10, 0.95, 0.72);
  float ambient = 0.28 + 0.35 * light;
  vec3 lit = mix(tex.rgb * ambient, warm, smoothstep(0.0, 1.0, light * 2.0));
  vec3 outColor = mix(tex.rgb, lit, u_darkness);

  fragColor = vec4(outColor, tex.a);
}
`;

export class DarknessPostProcessor implements PostProcessor {
  private shader: ScreenShader | null = null;

  /** Centre of the lamp in screen-space pixels. */
  light = vec(0, 0);
  /** View size in the same units as `light` (logical screen pixels). */
  view = vec(GAME.viewport.width, GAME.viewport.height);
  radius = GAME.darkness.radius;
  darkness = GAME.darkness.darkness;
  enabled = true;

  initialize(graphicsContext: ExcaliburGraphicsContextWebGL): void {
    this.shader = new ScreenShader(graphicsContext, fragmentSource);
  }

  getShader(): Shader {
    if (!this.shader) {
      throw new Error('DarknessPostProcessor used before initialize()');
    }
    return this.shader.getShader();
  }

  getLayout(): VertexLayout {
    if (!this.shader) {
      throw new Error('DarknessPostProcessor used before initialize()');
    }
    return this.shader.getLayout();
  }

  onUpdate(): void {
    if (!this.shader) {
      return;
    }
    // The engine has already bound the shader before calling onUpdate.
    const shader = this.shader.getShader();
    shader.setUniformFloatVector('u_light', this.light);
    shader.setUniformFloatVector('u_view', this.view);
    shader.setUniformFloat('u_radius', this.radius);
    shader.setUniformFloat('u_darkness', this.enabled ? this.darkness : 0);
  }
}
