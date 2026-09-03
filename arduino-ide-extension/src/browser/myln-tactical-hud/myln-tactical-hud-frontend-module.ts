import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory, bindViewContribution, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MylnTacticalHudWidget } from './myln-tactical-hud-widget';
import { MylnTacticalHudContribution } from './myln-tactical-hud-contribution';

export default new ContainerModule((bind: any) => {
  bindViewContribution(bind, MylnTacticalHudContribution);
  bind(FrontendApplicationContribution).toService(MylnTacticalHudContribution);

  bind(MylnTacticalHudWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx: any) => ({
    id: MylnTacticalHudWidget.ID,
    createWidget: () => ctx.container.get(MylnTacticalHudWidget),
  })).inSingletonScope();
});
