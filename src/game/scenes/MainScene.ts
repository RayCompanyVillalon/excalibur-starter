import { Color, Font, FontUnit, Label, Scene, Vector } from 'excalibur';
import { GAME } from '../config';
import { Player } from '../actors/Player';

export class MainScene extends Scene {
  private player!: Player;
  private readout!: Label;

  override onInitialize(): void {
    this.backgroundColor = Color.fromHex(GAME.background);

    this.player = new Player();
    this.add(this.player);

    const title = new Label({
      text: 'EXCALIBUR STARTER',
      pos: new Vector(32, 28),
      font: new Font({
        family: 'monospace',
        size: 28,
        unit: FontUnit.Px,
        color: Color.fromHex(GAME.player.color),
        bold: true,
      }),
    });
    this.add(title);

    this.readout = new Label({
      text: 'wasd to move · r to reset',
      pos: new Vector(32, 68),
      font: new Font({
        family: 'monospace',
        size: 16,
        unit: FontUnit.Px,
        color: Color.fromHex(GAME.hud.muted),
      }),
    });
    this.add(this.readout);
  }

  override onPostUpdate(): void {
    const { x, y } = this.player.pos;
    this.readout.text = `x ${x.toFixed(0)}  y ${y.toFixed(0)}   wasd to move · r to reset`;
  }
}
