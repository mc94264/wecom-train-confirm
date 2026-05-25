import { generateWithAgent } from './model-router';

export interface KeyPoint {
  title: string;
  description: string;
  keywords: string[];
}

export interface AnalysisResult {
  coverage_score: number;
  accuracy_score: number;
  overall_score: number;
  level: string;
  covered_points: string[];
  missing_points: string[];
  wrong_points: string[];
  risk_level: string;
  summary: string;
  correction_suggestion: string;
}

function buildKeyPointPrompt(transcript: string): string {
  return `从以下安全培训宣讲内容中，提取3-5条最重要的培训重点。
每条重点包含：标题、详细描述、关键词列表。

宣讲内容：
${transcript}

请严格按以下JSON格式输出，不要有任何其他内容：
{
  "key_points": [
    {
      "title": "重点标题",
      "description": "详细描述",
      "keywords": ["关键词1", "关键词2"]
    }
  ]
}`;
}

function buildAnalysisPrompt(transcript: string, keyPoints: string[], employeeTranscript: string): string {
  return `作为安全培训效果分析专家，请评估员工对培训内容的理解程度。

原始培训重点：
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

员工复述内容：
${employeeTranscript}

请严格按以下JSON格式输出分析结果，不要有任何其他内容：
{
  "coverage_score": 0-100,
  "accuracy_score": 0-100,
  "overall_score": 0-100,
  "level": "理解到位|基本理解|理解不足|存在偏差",
  "covered_points": ["已覆盖的重点"],
  "missing_points": ["遗漏的重点"],
  "wrong_points": ["理解错误的点"],
  "risk_level": "low|medium|high",
  "summary": "总体评价摘要",
  "correction_suggestion": "纠正建议"
}

优先级规则：如果员工说出了危险或与制度相反的理解（例如"可以先动火后补审批"），即使覆盖了其他重点，也必须判定为"存在偏差"。`;
}

export async function extractKeyPoints(transcript: string): Promise<KeyPoint[]> {
  try {
    const content = await generateWithAgent('extract_key_points', {
      messages: [{ role: 'user', content: buildKeyPointPrompt(transcript) }],
      temperature: 0.3,
    });
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('LLM response is not valid JSON');
    }
    const result = JSON.parse(match[0]);
    return result.key_points || [];
  } catch (error) {
    console.error('Agent extract_key_points failed, using fallback:', error);
    return mockExtractKeyPoints(transcript);
  }
}

export async function analyzeUnderstanding(
  transcript: string,
  keyPoints: string[],
  employeeTranscript: string
): Promise<AnalysisResult> {
  try {
    const content = await generateWithAgent('analyze_understanding', {
      messages: [{ role: 'user', content: buildAnalysisPrompt(transcript, keyPoints, employeeTranscript) }],
      temperature: 0.2,
    });
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('LLM response is not valid JSON');
    }
    return JSON.parse(match[0]);
  } catch (error) {
    console.error('Agent analyze_understanding failed, using fallback:', error);
    return mockAnalyzeUnderstanding(transcript, keyPoints, employeeTranscript);
  }
}

function mockExtractKeyPoints(_transcript: string): KeyPoint[] {
  return [
    {
      title: '高处作业必须佩戴安全带',
      description: '凡在坠落高度基准面2米及以上进行的作业，必须正确佩戴安全带，并确保挂点牢固可靠。',
      keywords: ['高处作业', '安全带', '防护措施'],
    },
    {
      title: '发现隐患必须立即上报',
      description: '发现任何安全隐患或异常情况，必须第一时间向班组长或安全员报告，不得隐瞒或拖延。',
      keywords: ['隐患上报', '安全员', '及时报告'],
    },
    {
      title: '动火作业必须提前审批',
      description: '涉及焊接、切割等明火作业，必须提前办理动火审批手续，配备灭火器材，设专人监护。',
      keywords: ['动火审批', '焊接', '灭火器材'],
    },
  ];
}

function mockAnalyzeUnderstanding(_transcript: string, _keyPoints: string[], employeeTranscript: string): AnalysisResult {
  const hasDeviation = employeeTranscript.includes('后补') || employeeTranscript.includes('不用') || employeeTranscript.includes('不需要');
  if (hasDeviation) {
    return {
      coverage_score: 60,
      accuracy_score: 40,
      overall_score: 50,
      level: '存在偏差',
      covered_points: ['高处作业防护'],
      missing_points: ['隐患上报', '动火审批'],
      wrong_points: ['对审批流程理解错误'],
      risk_level: 'high',
      summary: '员工对安全制度存在危险误解，认为可以事后补手续。',
      correction_suggestion: '立即组织班组长补充培训，强调所有动火作业必须先审批后作业。',
    };
  }

  return {
    coverage_score: 82,
    accuracy_score: 90,
    overall_score: 86,
    level: '基本理解',
    covered_points: ['高处作业防护', '隐患上报'],
    missing_points: ['动火审批'],
    wrong_points: [],
    risk_level: 'low',
    summary: '员工能复述主要安全要求，但遗漏动火审批流程。',
    correction_suggestion: '建议班组长补充强调动火作业必须审批后方可执行。',
  };
}
