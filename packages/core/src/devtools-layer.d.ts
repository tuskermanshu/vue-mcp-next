import type { ComponentSelector, ComponentNode, ComponentState, StatePatch, RouterInfo, PiniaState, VueMcpContext } from './types';
/**
 * DevTools运行时层 - 负责与浏览器中运行的Vue应用进行实时交互
 * 基于Vue DevTools API实现运行时状态获取和修改
 */
export declare class DevToolsRuntimeLayer {
    private viteServer;
    private context;
    private devtoolsApi;
    constructor(viteServer: any, context: VueMcpContext);
    initialize(): Promise<void>;
    private injectDevToolsClient;
    private getDevToolsClientScript;
    getComponentTree(): Promise<ComponentNode[]>;
    getComponentState(selector: ComponentSelector): Promise<ComponentState>;
    updateComponentState(selector: ComponentSelector, patch: StatePatch): Promise<void>;
    highlightComponent(selector: ComponentSelector): Promise<void>;
    getRouterInfo(): Promise<RouterInfo>;
    getPiniaState(storeId?: string): Promise<PiniaState>;
    getPiniaTree(): Promise<any>;
    private sendDevToolsCommand;
    private sendToClient;
    private waitForResponse;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=devtools-layer.d.ts.map