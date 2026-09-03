declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element extends any {}
}

declare namespace React {
  type ReactNode = any;
  interface ReactElement extends any {}
  interface CSSProperties {
    [key: string]: any;
  }
  const createElement: any;
}

declare module '@theia/core/shared/react' {
  export = React;
}

declare module '@theia/core/shared/inversify' {
  export const injectable: () => any;
  export const inject: (token: any) => any;
  export const postConstruct: () => any;
  export class ContainerModule {
    constructor(fn: (bind: any, unbind?: any, isBound?: any, rebind?: any) => void);
  }
}

declare module '@theia/core/lib/browser/widgets' {
  export class ReactWidget {
    id: string;
    title: {
      label: string;
      caption?: string;
      iconClass?: string;
      closable?: boolean;
    };
    addClass(cls: string): void;
    update(): void;
    protected render(): any;
  }
  export class Widget {}
  export class Message {}
  export class MessageLoop {}
}

declare module '@theia/core/lib/common' {
  export interface Command {
    id: string;
    label: string;
    category?: string;
  }
  export interface CommandRegistry {
    registerCommand(cmd: Command, handler: { execute: () => any }): void;
  }
  export interface MenuModelRegistry {
    registerMenuAction(path: string[], action: { commandId: string; label: string; order?: string }): void;
  }
  export class AbstractViewContribution<T = any> {
    constructor(options: any);
    registerCommands(commands: CommandRegistry): void;
    registerMenus(menus: MenuModelRegistry): void;
    toggleView(): Promise<void>;
    openView(options?: any): Promise<T>;
  }
}

declare module '@theia/core/lib/browser' {
  export const WidgetFactory: any;
  export const bindViewContribution: any;
  export const FrontendApplicationContribution: any;
}
