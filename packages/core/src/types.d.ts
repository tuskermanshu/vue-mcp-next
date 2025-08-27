import type { App } from 'vue';
import type { ViteDevServer } from 'vite';
export interface VueMcpOptions {
    port?: number;
    mcpServerInfo?: {
        name?: string;
        version?: string;
    };
    features?: {
        devtools?: boolean;
        codeAnalysis?: boolean;
        performanceMonitoring?: boolean;
    };
    /** 客户端脚本注入目标文件 */
    appendTo?: string | RegExp;
}
export interface VueMcpContext {
    apps: Map<string, App>;
    viteServer?: ViteDevServer;
    projectRoot: string;
}
export interface ComponentSelector {
    name?: string;
    id?: string;
    domSelector?: string;
    instanceId?: string;
}
export interface ComponentNode {
    id: string;
    name: string;
    type: string;
    props?: Record<string, any>;
    children?: ComponentNode[];
    file?: string;
    line?: number;
}
export interface ComponentState {
    data?: Record<string, any>;
    props?: Record<string, any>;
    computed?: Record<string, any>;
    methods?: string[];
    emits?: string[];
}
export interface StatePatch {
    path: string[];
    value: any;
    valueType?: string | number | boolean | object | [];
}
export interface RouterInfo {
    currentRoute: {
        path: string;
        name?: string;
        params?: Record<string, any>;
        query?: Record<string, any>;
    };
    routes: Array<{
        path: string;
        name?: string;
        component?: string;
    }>;
}
export interface PiniaState {
    stores: Record<string, {
        id: string;
        state: Record<string, any>;
        getters?: Record<string, any>;
        actions?: string[];
    }>;
}
export interface ComponentAnalysis {
    file: string;
    name: string;
    props: PropDefinition[];
    emits: EmitDefinition[];
    dependencies: string[];
    usages: UsageLocation[];
    suggestions: OptimizationSuggestion[];
}
export interface PropDefinition {
    name: string;
    type: string;
    required: boolean;
    default?: any;
    description?: string;
}
export interface EmitDefinition {
    name: string;
    payload?: string;
    description?: string;
}
export interface UsageLocation {
    file: string;
    line: number;
    column: number;
    context: string;
}
export interface OptimizationSuggestion {
    type: 'performance' | 'style' | 'structure';
    message: string;
    file: string;
    line?: number;
    fix?: string;
}
export interface McpToolResult {
    success: boolean;
    data?: any;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map