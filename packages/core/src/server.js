import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DevToolsRuntimeLayer } from './devtools-layer';
import { StaticAnalysisLayer } from './static-analysis-layer-simple';
export class VueMcpServer {
    constructor(options, viteServer, context) {
        this.context = context;
        // 创建MCP服务器
        this.mcpServer = new McpServer({
            name: 'vue-mcp-next',
            version: '0.1.0',
            ...options.mcpServerInfo,
        });
        // 初始化运行时层（DevTools）
        this.devtoolsLayer = new DevToolsRuntimeLayer(viteServer, context);
        // 初始化静态分析层
        this.analysisLayer = new StaticAnalysisLayer(context.projectRoot);
        this.setupTools();
    }
    setupTools() {
        // 运行时操作工具（基于DevTools）
        this.setupRuntimeTools();
        // 静态分析工具（基于AST）
        this.setupAnalysisTools();
    }
    setupRuntimeTools() {
        // 获取组件树
        this.mcpServer.registerTool('get-component-tree', {
            title: 'Get Component Tree',
            description: '获取Vue应用的组件树结构',
            inputSchema: {}
        }, async () => {
            try {
                const tree = await this.devtoolsLayer.getComponentTree();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: tree }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 获取组件状态
        this.mcpServer.registerTool('get-component-state', {
            title: 'Get Component State',
            description: '获取指定组件的状态信息',
            inputSchema: {
                componentName: z.string().describe('组件名称'),
                instanceId: z.string().optional().describe('组件实例ID')
            }
        }, async ({ componentName, instanceId }) => {
            try {
                const selector = { name: componentName, instanceId };
                const state = await this.devtoolsLayer.getComponentState(selector);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: state }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 编辑组件状态
        this.mcpServer.registerTool('edit-component-state', {
            title: 'Edit Component State',
            description: '修改指定组件的状态',
            inputSchema: {
                componentName: z.string().describe('组件名称'),
                path: z.array(z.string()).describe('状态路径数组'),
                value: z.any().describe('新值'),
                valueType: z.string().optional().describe('值类型'),
                instanceId: z.string().optional().describe('组件实例ID')
            }
        }, async ({ componentName, path, value, valueType, instanceId }) => {
            try {
                const selector = { name: componentName, instanceId };
                const patch = { path, value, valueType };
                await this.devtoolsLayer.updateComponentState(selector, patch);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: 'State updated successfully' }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 高亮组件
        this.mcpServer.registerTool('highlight-component', {
            title: 'Highlight Component',
            description: '在浏览器中高亮显示指定组件',
            inputSchema: {
                componentName: z.string().describe('组件名称'),
                instanceId: z.string().optional().describe('组件实例ID')
            }
        }, async ({ componentName, instanceId }) => {
            try {
                const selector = { name: componentName, instanceId };
                await this.devtoolsLayer.highlightComponent(selector);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: 'Component highlighted' }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 获取路由信息
        this.mcpServer.registerTool('get-router-info', {
            title: 'Get Router Info',
            description: '获取Vue Router的路由信息',
            inputSchema: {}
        }, async () => {
            try {
                const routerInfo = await this.devtoolsLayer.getRouterInfo();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: routerInfo }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 获取Pinia状态
        this.mcpServer.registerTool('get-pinia-state', {
            title: 'Get Pinia State',
            description: '获取Pinia状态管理的数据',
            inputSchema: {
                storeId: z.string().optional().describe('Store ID')
            }
        }, async ({ storeId }) => {
            try {
                const piniaState = await this.devtoolsLayer.getPiniaState(storeId);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: piniaState }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 获取Pinia树
        this.mcpServer.registerTool('get-pinia-tree', {
            title: 'Get Pinia Tree',
            description: '获取Pinia stores的树形结构',
            inputSchema: {}
        }, async () => {
            try {
                const piniaTree = await this.devtoolsLayer.getPiniaTree();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: piniaTree }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
    }
    setupAnalysisTools() {
        // 分析组件
        this.mcpServer.registerTool('analyze-component', {
            title: 'Analyze Component',
            description: '静态分析指定组件的结构和依赖',
            inputSchema: {
                filePath: z.string().describe('组件文件路径')
            }
        }, async ({ filePath }) => {
            try {
                const analysis = await this.analysisLayer.analyzeComponent(filePath);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: analysis }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 获取项目概览
        this.mcpServer.registerTool('get-project-overview', {
            title: 'Get Project Overview',
            description: '获取Vue项目的完整概览信息',
            inputSchema: {}
        }, async () => {
            try {
                const overview = await this.analysisLayer.getProjectOverview();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: overview }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 查找组件使用
        this.mcpServer.registerTool('find-component-usage', {
            title: 'Find Component Usage',
            description: '查找指定组件在项目中的使用情况',
            inputSchema: {
                componentName: z.string().describe('组件名称')
            }
        }, async ({ componentName }) => {
            try {
                const usages = await this.analysisLayer.findComponentUsage(componentName);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, data: usages }, null, 2) }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
        // 生成组件
        this.mcpServer.registerTool('generate-component', {
            title: 'Generate Component',
            description: '基于描述生成Vue组件代码',
            inputSchema: {
                description: z.string().describe('组件功能描述'),
                componentName: z.string().describe('组件名称'),
                template: z.string().optional().describe('模板类型')
            }
        }, async ({ description, componentName, template }) => {
            try {
                const code = await this.analysisLayer.generateComponent({
                    description,
                    componentName,
                    template
                });
                return {
                    content: [{ type: 'text', text: `Generated component code:\n\n\`\`\`vue\n${code}\n\`\`\`` }]
                };
            }
            catch (error) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }]
                };
            }
        });
    }
    async start() {
        // 启动DevTools层
        await this.devtoolsLayer.initialize();
        // 启动静态分析层
        await this.analysisLayer.initialize();
        console.log('Vue MCP Server started successfully');
    }
    async stop() {
        await this.devtoolsLayer.cleanup();
        await this.analysisLayer.cleanup();
    }
    getServer() {
        return this.mcpServer;
    }
}
