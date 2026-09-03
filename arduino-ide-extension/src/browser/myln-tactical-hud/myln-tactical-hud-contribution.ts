import { injectable } from '@theia/core/shared/inversify';
import {
  AbstractViewContribution,
  Command,
  CommandRegistry,
  MenuModelRegistry,
} from '@theia/core/lib/common';
import { MylnTacticalHudWidget } from './myln-tactical-hud-widget';

export const MylnTacticalHudCommand: Command = {
  id: 'myln.tactical.hud.toggle',
  label: 'PRJ_MYLN: Toggle Tactical HUD Panel',
  category: 'PRJ_MYLN Tactical'
};

@injectable()
export class MylnTacticalHudContribution extends AbstractViewContribution<MylnTacticalHudWidget> {
  constructor() {
    super({
      widgetId: MylnTacticalHudWidget.ID,
      widgetName: MylnTacticalHudWidget.LABEL,
      defaultWidgetOptions: {
        area: 'right',
        rank: 500
      },
      toggleCommandId: MylnTacticalHudCommand.id
    });
  }

  override registerCommands(commands: CommandRegistry): void {
    super.registerCommands(commands);
    commands.registerCommand(MylnTacticalHudCommand, {
      execute: () => this.toggleView()
    });
  }

  override registerMenus(menus: MenuModelRegistry): void {
    super.registerMenus(menus);
    menus.registerMenuAction(['view'], {
      commandId: MylnTacticalHudCommand.id,
      label: 'PRJ_MYLN Tactical HUD',
      order: '99'
    });
  }
}
