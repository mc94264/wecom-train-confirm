import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const dbPath = path.resolve(__dirname, 'dev.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

async function main() {
  // 1. 员工数据
  const employees = [
    { name: '张三', team: '施工一队', employeeCode: 'E001' },
    { name: '李四', team: '施工一队', employeeCode: 'E002' },
    { name: '王五', team: '施工二队', employeeCode: 'E003' },
    { name: '赵六', team: '施工二队', employeeCode: 'E004' },
    { name: '孙七', team: '安全部', employeeCode: 'E005' },
  ];

  const existingEmployees = await prisma.employee.findMany();
  if (existingEmployees.length === 0) {
    await prisma.employee.createMany({ data: employees });
    console.log('已创建示例员工数据');
  }

  // 2. ModelProvider 默认值
  const providers = [
    { key: 'openai', displayName: 'OpenAI', description: 'OpenAI GPT 系列', capabilities: JSON.stringify(['llm', 'chat', 'embedding']), defaultBaseUrl: 'https://api.openai.com/v1' },
    { key: 'deepseek', displayName: 'DeepSeek', description: 'DeepSeek 大模型', capabilities: JSON.stringify(['llm', 'chat']), defaultBaseUrl: 'https://api.deepseek.com' },
    { key: 'volcengine', displayName: '火山引擎', description: '字节跳动火山引擎 ASR', capabilities: JSON.stringify(['asr']), defaultBaseUrl: 'https://openspeech.bytedance.com' },
    { key: 'aliyun', displayName: '阿里云', description: '阿里云通义千问 / OSS', capabilities: JSON.stringify(['llm', 'chat', 'oss']), defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { key: 'company-gateway', displayName: '公司网关', description: '公司内部模型网关（ASR + LLM）', capabilities: JSON.stringify(['llm', 'chat', 'asr']), defaultBaseUrl: 'http://8.163.99.43:4000' },
  ];

  for (const p of providers) {
    await prisma.modelProvider.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }
  console.log('已创建 ModelProvider 默认值');

  // 3. ModelConnection - 公司网关连接
  const companyProvider = await prisma.modelProvider.findUnique({
    where: { key: 'company-gateway' },
  });

  if (companyProvider) {
    // ASR 连接
    const asrConn = await prisma.modelConnection.upsert({
      where: { id: 'company-asr' },
      update: {},
      create: {
        id: 'company-asr',
        providerId: companyProvider.id,
        displayName: '公司网关-ASR',
        baseUrl: 'http://8.163.99.43:4000',
        apiKeyRef: 'raw://sk-Smz78gDw6dpJviFWdMeIYw',
        modelName: 'telespeech-asr',
        isDefault: false,
        enabled: true,
        capabilities: JSON.stringify(['asr']),
        notes: '公司网关 ASR 转写服务',
      },
    });

    // LLM 连接 - Deepseek v4 pro
    const llmConn = await prisma.modelConnection.upsert({
      where: { id: 'company-llm' },
      update: {},
      create: {
        id: 'company-llm',
        providerId: companyProvider.id,
        displayName: '公司网关-Deepseek v4 pro',
        baseUrl: 'http://8.163.99.43:4000',
        apiKeyRef: 'raw://sk-Smz78gDw6dpJviFWdMeIYw',
        modelName: 'deepseek-v4-pro',
        isDefault: true,
        enabled: true,
        capabilities: JSON.stringify(['llm', 'chat']),
        notes: '公司网关 LLM - 默认用于总结分析',
      },
    });

    console.log('已创建公司网关 ModelConnection');

    // 4. AgentSpec - 关联到公司网关连接
    const agentSpecs = [
      { agentKey: 'extract_key_points', displayName: '提取培训重点', description: '从宣讲稿中提取 3-5 条培训重点', capability: 'llm', modelConnectionId: llmConn.id, config: JSON.stringify({ temperature: 0.3 }) },
      { agentKey: 'analyze_understanding', displayName: '理解分析', description: '分析员工复述内容与培训重点的吻合度', capability: 'llm', modelConnectionId: llmConn.id, config: JSON.stringify({ temperature: 0.2 }) },
      { agentKey: 'transcribe_audio', displayName: '语音转写', description: '将员工语音转写为文字', capability: 'asr', modelConnectionId: asrConn.id, config: JSON.stringify({}) },
    ];

    for (const a of agentSpecs) {
      await prisma.agentSpec.upsert({
        where: { agentKey: a.agentKey },
        update: {
          modelConnectionId: a.modelConnectionId,
          config: a.config,
        },
        create: a,
      });
    }
    console.log('已更新 AgentSpec 关联到公司网关');
  }

  // 5. ServiceConfig 默认值
  const serviceConfigs = [
    { serviceKey: 'wecom', displayName: '企业微信', config: JSON.stringify({ webhookUrl: '' }) },
    { serviceKey: 'storage', displayName: '文件存储', config: JSON.stringify({ type: 'local', localPath: './uploads' }) },
  ];

  for (const s of serviceConfigs) {
    await prisma.serviceConfig.upsert({
      where: { serviceKey: s.serviceKey },
      update: {},
      create: s,
    });
  }
  console.log('已创建 ServiceConfig 默认值');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
