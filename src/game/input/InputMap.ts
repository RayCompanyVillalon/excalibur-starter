import { Keys, type Keyboard } from 'excalibur';
import type { Intent } from '../player/controller';

/** Reduce raw keyboard state to platformer intent. */
export function readIntent(keyboard: Keyboard): Intent {
  let moveX = 0;
  if (keyboard.isHeld(Keys.A) || keyboard.isHeld(Keys.Left)) moveX -= 1;
  if (keyboard.isHeld(Keys.D) || keyboard.isHeld(Keys.Right)) moveX += 1;

  const jumpHeld =
    keyboard.isHeld(Keys.Space) || keyboard.isHeld(Keys.W) || keyboard.isHeld(Keys.Up);
  const jumpPressed =
    keyboard.wasPressed(Keys.Space) ||
    keyboard.wasPressed(Keys.W) ||
    keyboard.wasPressed(Keys.Up);

  const dashPressed =
    keyboard.wasPressed(Keys.ShiftLeft) || keyboard.wasPressed(Keys.ShiftRight);

  // A press counts as held for that frame, so a jump can't be cut before it
  // has actually left the ground.
  return { moveX, jumpPressed, jumpHeld: jumpHeld || jumpPressed, dashPressed };
}
