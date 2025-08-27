import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VueMcpOptions, VueMcpContext } from './types';
export declare class VueMcpServer {
    private mcpServer;
    private devtoolsLayer;
    private analysisLayer;
    private context;
    constructor(options: VueMcpOptions, viteServer: any, context: VueMcpContext);
    private setupTools;
    private setupRuntimeTools;
    private setupAnalysisTools;
    start(): Promise<void>;
    stop(): Promise<void>;
    getServer(): McpServer;
}
//# sourceMappingURL=server.d.ts.map