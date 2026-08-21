import axios from 'axios';

export function isGeminiConfigured() {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '';
}

export function getGeminiModelName() {
  return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
}

function getMaskedApiKey(key) {
  if (!key) return '(없음)';
  if (key.length <= 8) return '****';
  return key.substring(0, 6) + '...' + key.substring(key.length - 4);
}

let rateLimitCooldownUntil = 0;
let lastApiCallTimestamp = 0;
const MIN_API_CALL_INTERVAL_MS = 25000; // ⚡ 봇 간 25초 최소 호출 간격 보장 (429 Quota 방지)

/**
 * 🧹 따옴표, 마크다운, 내부 생각 잔여물 등을 깨끗하게 제거하는 메시지 정제기
 */
export function cleanMessage(text) {
  if (!text || typeof text !== 'string') return '';
  let clean = text.trim();

  // 1. 코드블록 마크다운 제거
  clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 2. 내부 추론 과정(Thought / Draft / 1. ...) 라인 분리 및 정리
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    // 만약 여러 줄이 들어왔다면 '마지막 유의미한 대화 줄'을 선택
    const lastCandidate = lines[lines.length - 1];
    if (lastCandidate && !lastCandidate.startsWith('*') && !lastCandidate.startsWith('1.') && !lastCandidate.startsWith('2.') && !lastCandidate.startsWith('3.')) {
      clean = lastCandidate;
    }
  }

  // 3. 앞뒤 따옴표, 콜론, 별표, 마크다운 기호 제거
  clean = clean.replace(/^[:"'`\s\*\-]+/, '').replace(/[:"'`\s\*\-]+$/, '').trim();

  // 4. 쌍따옴표가 중복으로 씌워져 있는 경우 정리 (""Data_Bot님" -> Data_Bot님)
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }

  // 5. 앞머리에 붙은 영문 접두사(/Short):*, Draft: 등) 제거
  clean = clean.replace(/^[\(\/\*\s]*[A-Za-z0-9_\-\/]+\s*[:\)]\s*\*?\s*/, '').trim();
  clean = clean.replace(/^[:"'`\s\*\-]+/, '').replace(/[:"'`\s\*\-]+$/, '').trim();

  // 6. 영어 내부 생각 문장만 있거나(result yet anyway...) 1글자 이하면 필터링
  if (clean.length < 2 || (/^[A-Za-z0-9\s_\-\*\.\(\)\:\,\'\"]+$/.test(clean) && !/[가-힣]/.test(clean) && clean.length > 15)) {
    return '';
  }

  return clean;
}

/**
 * 🛠️ LLM 응답 텍스트에서 안전하게 JSON을 추출 및 복구 파싱하는 헬퍼
 */
function extractAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. rawText 내부의 모든 {...} JSON 블록 추출 시도
  const jsonBlocks = rawText.match(/\{[\s\S]*?\}/g) || [];
  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block);
      if (parsed) {
        if (parsed.message) parsed.message = cleanMessage(parsed.message);
        if (parsed.targetId) parsed.targetId = parsed.targetId.trim();
        return parsed;
      }
    } catch (e) {}
  }

  // 2. 정규식으로 "message": "..." 추출
  const msgRegex = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/i;
  const msgMatch = rawText.match(msgRegex);
  if (msgMatch && msgMatch[1]) {
    return { message: cleanMessage(msgMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ')) };
  }

  // 3. 정규식으로 "targetId": "..." 추출
  const targetRegex = /"targetId"\s*:\s*"((?:[^"\\]|\\.)*)"/i;
  const targetMatch = rawText.match(targetRegex);
  if (targetMatch && targetMatch[1]) {
    return { targetId: targetMatch[1].trim() };
  }

  // 4. 따옴표로 감싸진 대화 추출 (예: "Copilot님 말 끊긴 거 수상한데요?")
  const quoteMatches = [...rawText.matchAll(/"([^"\n]{4,120})"/g)];
  if (quoteMatches.length > 0) {
    const lastQuote = quoteMatches[quoteMatches.length - 1][1];
    return { message: cleanMessage(lastQuote) };
  }

  // 5. 일반 평문 텍스트 클리닝 후 반환
  const cleanPlain = cleanMessage(rawText);
  if (cleanPlain && cleanPlain.length > 0 && !cleanPlain.includes('Draft') && !cleanPlain.includes('Refining')) {
    return { message: cleanPlain };
  }

  return null;
}

/**
 * 🌐 Google Gemini 공식 REST API 호출 헬퍼
 */
async function callGeminiAPI({ prompt, temperature = 0.7, jsonMode = true }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = getGeminiModelName();

  if (!apiKey) {
    console.warn('[Gemini AI] ⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 응답을 건너뜁니다.');
    return null;
  }

  // 429 Rate Limit 쿨다운 중인 경우 API 호출 건너뛰고 즉시 안전 템플릿 반환
  if (Date.now() < rateLimitCooldownUntil) {
    const remainSec = Math.ceil((rateLimitCooldownUntil - Date.now()) / 1000);
    console.log(`[Gemini AI Cooldown] ⏳ 429 쿨다운 대기 중 (${remainSec}s 남음) - 기본 템플릿 사용`);
    return null;
  }

  // ⚡ 봇 간 25초 최소 호출 간격 검사 (25초 내에 다른 봇이 이미 API를 썼다면 안전 템플릿 사용)
  const elapsedSinceLastCall = Date.now() - lastApiCallTimestamp;
  if (lastApiCallTimestamp > 0 && elapsedSinceLastCall < MIN_API_CALL_INTERVAL_MS) {
    const remainSec = Math.ceil((MIN_API_CALL_INTERVAL_MS - elapsedSinceLastCall) / 1000);
    console.log(`[Gemini AI Throttled] ⏱️ 25초 간격 보호 중 (${remainSec}s 대기 필요) - 자연스러운 기본 대화 사용`);
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: 300,
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
  };

  if (jsonMode) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  const startTime = Date.now();
  console.log(`[Gemini AI] 🚀 [${modelName}] API 요청 전송 중... (Key: ${getMaskedApiKey(apiKey)})`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      });

      lastApiCallTimestamp = Date.now();
      const elapsed = Date.now() - startTime;
      const candidate = response.data?.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text;

      if (!rawText) {
        console.warn(`[Gemini AI] ⚠️ 빈 응답 수신 (${elapsed}ms)`);
        return null;
      }

      console.log(`[Gemini AI] ✅ [${modelName}] 응답 수신 성공! (소요 시간: ${elapsed}ms)`);

      if (jsonMode) {
        const parsed = extractAndParseJSON(rawText);
        if (!parsed) {
          console.warn(`[Gemini AI Parse Warning] ⚠️ JSON 파싱 불가, 원문: "${rawText.substring(0, 100)}..."`);
        }
        return parsed;
      }

      return cleanMessage(rawText);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      const statusCode = err.response?.status;
      const errMsg = err.response?.data?.error?.message || err.message;

      // 429 할당량 초과 시 25초 쿨다운 적용
      if (statusCode === 429) {
        rateLimitCooldownUntil = Date.now() + 25000;
        console.warn(`[Gemini AI RateLimit] ⚠️ 무료 티어 호출 한도(429 Quota Exceeded) 도달. 25초간 기본 템플릿 모드로 동작합니다.`);
        return null;
      }

      // thinkingConfig 미지원 모델로 400 에러 시 제거 후 1회 재시도
      if (statusCode === 400 && payload.generationConfig?.thinkingConfig) {
        delete payload.generationConfig.thinkingConfig;
        continue;
      }

      if (attempt === 1 && (err.code === 'ECONNABORTED' || err.message.includes('timeout'))) {
        console.warn(`[Gemini AI Retry] ⏱️ 1차 시도 타임아웃 (${elapsed}ms), 재시도 중...`);
        continue;
      }

      console.error(`[Gemini AI Error] ❌ (${modelName}, Status: ${statusCode || (err.code === 'ECONNABORTED' ? 'TIMEOUT' : 'REQ_ERROR')}, ${elapsed}ms):`, errMsg);
      return null;
    }
  }

  return null;
}

/**
 * 🤖 마피아 낮 토론 대화 생성 (Gemini LLM)
 */
export async function generateMafiaDayChat({ bot, role, alivePlayers, chatHistory = [], knownInfo = {} }) {
  if (!isGeminiConfigured()) return null;

  const aliveListStr = alivePlayers.map(p => `${p.username}${p.id === bot.id ? ' (나)' : ''}`).join(', ');
  const recentChats = chatHistory.slice(-12).map(c => `[${c.player || c.username}]: ${c.content}`).join('\n');

  let roleSecret = '';
  if (role === 'mafia') {
    roleSecret = '당신은 마피아입니다. 절대 자신이 마피아임을 들키지 마세요. 무고한 일반 시민처럼 행세하며 자연스럽게 알리바이를 대거나, 다른 사람에게 의심의 시선이 가도록 유도하세요.';
  } else if (role === 'police') {
    const investigated = knownInfo.investigations || [];
    const invStr = investigated.length > 0
      ? investigated.map(inv => `${inv.targetName} -> ${inv.isMafia ? '🚨 마피아임' : '✅ 시민임'}`).join(', ')
      : '아직 조사 내역 없음';
    roleSecret = `당신은 경찰입니다. (지금까지의 야간 조사 결과: ${invStr}). 마피아를 발견했다면 사람들을 설득해 지목하고, 아니라면 다른 사람을 관찰하세요. 단, 마피아의 표적이 될 수 있으니 신중하게 발언하세요.`;
  } else if (role === 'doctor') {
    roleSecret = '당신은 의사입니다. 밤에 시민을 치료할 수 있습니다. 자신이 의사임을 너무 일찍 밝히면 마피아에게 암살당할 수 있으므로 조용히 시민인 척 의견을 내세요.';
  } else {
    roleSecret = '당신은 무고한 시민입니다. 대화 로그를 잘 읽고 누가 부자연스럽거나 마피아처럼 유도하는지 추리하여 의견을 제시하세요.';
  }

  const prompt = `
당신은 실시간 웹 마피아 게임에 참여 중인 플레이어 "${bot.username}"입니다.
오피스/스텔스 컨셉(엑셀 데이터 분석가, IT 직장인 톤) 또는 자연스러운 한국인 게이머 말투로 대화합니다.

[게임 상태]
- 당신의 이름: ${bot.username}
- 당신의 직업: ${role}
- 현재 페이즈: 낮 대화 및 추리 토론
- 생존 플레이어: ${aliveListStr}

[비밀 역할 지침]
${roleSecret}

[최근 채팅 로그]
${recentChats || '(아직 이전 채팅이 없습니다. 먼저 분위기를 띄우거나 첫 의견을 제시하세요.)'}

[요청 사항]
1. 실제 사람처럼 1~2문장의 짧고 임팩트 있는 한국어 채팅을 작성하세요. 너무 길거나 AI 티가 나지 않게 작성하세요.
2. 이전 대화 맥락과 다른 플레이어들의 발언을 직접 언급하거나 반응하세요.
3. 반드시 아래 JSON 형식으로만 출력하세요:
{
  "message": "채팅창에 보낼 메시지 (1~2문장)"
}
`;

  const parsed = await callGeminiAPI({ prompt, temperature: 0.8, jsonMode: true });
  if (parsed && typeof parsed.message === 'string') {
    const cleaned = cleanMessage(parsed.message);
    if (cleaned.length >= 2) {
      console.log(`[Mafia AI] 💬 [${bot.username} (${role})] 대화 생성 완료: "${cleaned}"`);
      return cleaned;
    }
  }

  return null;
}

/**
 * 🗳️ 마피아 투표 지목 대상 결정 (Gemini LLM)
 */
export async function generateMafiaVoteTarget({ bot, role, alivePlayers, chatHistory = [], knownInfo = {} }) {
  if (!isGeminiConfigured()) return null;

  const candidates = alivePlayers.filter(p => p.id !== bot.id);
  if (candidates.length === 0) return null;

  const candidateListStr = candidates.map(p => `- ID: "${p.id}", 이름: "${p.username}"`).join('\n');
  const recentChats = chatHistory.slice(-20).map(c => `[${c.player || c.username}]: ${c.content}`).join('\n');

  let roleSecret = '';
  if (role === 'mafia') {
    roleSecret = '당신은 마피아입니다. 마피아 동료가 있다면 동료를 피하고, 가장 위협적인 시민 또는 여론이 몰린 무고한 시민을 투표해 탈락시키세요.';
  } else if (role === 'police') {
    const investigated = knownInfo.investigations || [];
    roleSecret = `당신은 경찰입니다. (조사 결과: ${JSON.stringify(investigated)}). 조사에서 마피아로 확인된 사람이 있다면 무조건 그 사람을 투표하세요.`;
  } else {
    roleSecret = '당신은 시민 진영입니다. 채팅 로그에서 가장 거짓말을 하거나 수상한 사람을 논리적으로 투표하세요.';
  }

  const prompt = `
마피아 게임 투표 시간입니다. 당신("${bot.username}", 직업: ${role})이 투표할 대상을 1명 선택하세요.

[투표 가능 대상]
${candidateListStr}

[비밀 역할 지침]
${roleSecret}

[오늘 진행된 채팅 로그]
${recentChats || '(채팅 없음)'}

반드시 아래 JSON 형식으로만 출력하세요. targetId는 위 투표 가능 대상의 ID 중 하나여야 합니다:
{
  "targetId": "대상 ID",
  "reason": "선택 이유 한 줄 요약"
}
`;

  const parsed = await callGeminiAPI({ prompt, temperature: 0.3, jsonMode: true });
  if (parsed && parsed.targetId && candidates.some(c => c.id === parsed.targetId)) {
    const targetPlayer = candidates.find(c => c.id === parsed.targetId);
    console.log(`[Mafia AI] 🗳️ [${bot.username} (${role})] 투표 대상 결정: "${targetPlayer?.username}" (이유: ${parsed.reason || '없음'})`);
    return parsed.targetId;
  }

  return null;
}

/**
 * 🌙 마피아 야간 행동 결정 (마피아 암살, 의사 치료, 경찰 조사)
 */
export async function generateMafiaNightAction({ bot, role, alivePlayers, knownInfo = {} }) {
  if (!isGeminiConfigured()) return null;

  let candidates = [];
  if (role === 'mafia') {
    candidates = alivePlayers.filter(p => p.role !== 'mafia');
  } else if (role === 'doctor') {
    candidates = alivePlayers; // 의사는 자기 자신도 치료 가능
  } else if (role === 'police') {
    candidates = alivePlayers.filter(p => p.id !== bot.id);
  }

  if (candidates.length === 0) return null;

  const candidateListStr = candidates.map(p => `- ID: "${p.id}", 이름: "${p.username}"`).join('\n');

  const prompt = `
마피아 게임의 밤입니다. 당신은 "${bot.username}" (직업: ${role})입니다.
이번 밤에 당신의 능력을 사용할 대상을 선택하세요.

[역할별 목표]
- 마피아: 가장 위협적이거나 똑똑한 시민을 제거.
- 의사: 마피아의 공격을 받을 것 같은 사람(또는 본인)을 보호.
- 경찰: 마피아일 것 같은 의심 인물을 조사.

[선택 가능 대상]
${candidateListStr}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "targetId": "선택한 대상의 ID",
  "reason": "선택 이유"
}
`;

  const parsed = await callGeminiAPI({ prompt, temperature: 0.4, jsonMode: true });
  if (parsed && parsed.targetId && candidates.some(c => c.id === parsed.targetId)) {
    const targetPlayer = candidates.find(c => c.id === parsed.targetId);
    console.log(`[Mafia AI] 🌙 [${bot.username} (${role})] 야간 행동 결정: "${targetPlayer?.username}" (이유: ${parsed.reason || '없음'})`);
    return parsed.targetId;
  }

  return null;
}

/**
 * 🤥 라이어 게임 발언 힌트 생성 (Gemini LLM)
 */
export async function generateLiarTalkMessage({ bot, isLiar, word, wordDef, players, chatHistory = [] }) {
  if (!isGeminiConfigured()) return null;

  const playerListStr = players.map(p => p.username).join(', ');
  const recentChats = chatHistory.slice(-10).map(c => `[${c.username || c.player}]: ${c.message || c.content}`).join('\n');

  let roleInstruction = '';
  if (!isLiar) {
    roleInstruction = `
당신은 '시민'입니다!
- 진짜 제시어: "${word}" (사전 의미: ${wordDef || '일상 명사'})
- 역할 지침: 제시어를 모르는 라이어에게 정답을 직접적으로 들키지 않으면서도, 다른 시민들은 이해할 수 있는 재치 있고 은근한 힌트(특징, 느낌, 쓰임새, 경험 등)를 1문장으로 말하세요.
- ⚠️ 절대 단어 "${word}" 자체를 직접 언급하거나 너무 노골적인 설명은 피하세요!
`;
  } else {
    roleInstruction = `
당신은 '라이어(Liar)'입니다!
- ⚠️ 당신은 진짜 제시어를 모릅니다! (당신에게 주어지는 가짜 단어는 "${word}"입니다).
- 역할 지침: 다른 시민들의 이전 발언 로그를 주의 깊게 읽고, 대략 어떤 느낌/범주의 단어인지 눈치껏 파악하여 들키지 않도록 자연스럽고 그럴듯한 1문장 힌트를 말하세요.
- "저도 일상에서 자주 접하는 편이에요", "약간 호불호가 갈릴 수도 있죠", "요즘 같은 때 특히 생각나네요" 같이 자연스럽게 공감대를 형성하세요.
`;
  }

  const prompt = `
당신은 실시간 웹 라이어 게임에 참여 중인 플레이어 "${bot.username}"입니다.
한국인 게이머 말투로 자연스럽고 재치 있는 1문장의 힌트 발언을 작성하세요.

[게임 참가자]
${playerListStr}

[당신의 역할 및 지침]
${roleInstruction}

[지금까지의 플레이어들 발언 기록]
${recentChats || '(아직 이전 발언이 없습니다. 첫 번째 힌트를 제시하세요.)'}

반드시 아래 JSON 형식으로만 출력하세요:
{
  "message": "발언할 힌트 내용 (1문장, 자연스러운 한국어)"
}
`;

  const parsed = await callGeminiAPI({ prompt, temperature: 0.8, jsonMode: true });
  if (parsed && typeof parsed.message === 'string') {
    const cleaned = cleanMessage(parsed.message);
    if (cleaned.length >= 2) {
      console.log(`[Liar AI] 💬 [${bot.username} (${isLiar ? '라이어' : '시민'})] 힌트 발언 생성: "${cleaned}"`);
      return cleaned;
    }
  }

  return null;
}

/**
 * 🗳️ 라이어 게임 라이어 지목 투표 (Gemini LLM)
 */
export async function generateLiarVoteTarget({ bot, isLiar, word, players, chatHistory = [] }) {
  if (!isGeminiConfigured()) return null;

  const candidates = players.filter(p => p.id !== bot.id);
  if (candidates.length === 0) return null;

  const candidateListStr = candidates.map(p => `- ID: "${p.id}", 이름: "${p.username}"`).join('\n');
  const fullChats = chatHistory.slice(-25).map(c => `[${c.username || c.player}]: ${c.message || c.content}`).join('\n');

  let roleInstruction = '';
  if (!isLiar) {
    roleInstruction = `당신은 제시어 "${word}"를 알고 있는 시민입니다. 위 발언 기록 중 "${word}"의 특징과 전혀 맞지 않거나, 너무 얼버무리며 눈치를 보거나 엉뚱한 힌트를 말한 사람을 1명 골라 투표하세요.`;
  } else {
    roleInstruction = `당신은 라이어입니다. 자신이 라이어로 지목되지 않도록, 다른 시민 중 발언이 애매하거나 의심을 받고 있는 플레이어를 1명 골라 투표하세요.`;
  }

  const prompt = `
라이어 게임 투표 시간입니다. 당신("${bot.username}")이 생각하는 라이어 1명을 지목하세요.

[투표 가능 대상]
${candidateListStr}

[지침]
${roleInstruction}

[전체 발언 기록]
${fullChats || '(발언 없음)'}

반드시 아래 JSON 형식으로만 출력하세요. targetId는 위 투표 가능 대상의 ID 중 하나여야 합니다:
{
  "targetId": "지목할 대상 ID",
  "reason": "지목 이유 한 줄"
}
`;

  const parsed = await callGeminiAPI({ prompt, temperature: 0.3, jsonMode: true });
  if (parsed && parsed.targetId && candidates.some(c => c.id === parsed.targetId)) {
    const targetPlayer = candidates.find(c => c.id === parsed.targetId);
    console.log(`[Liar AI] 🗳️ [${bot.username}] 라이어 지목 투표: "${targetPlayer?.username}" (이유: ${parsed.reason || '없음'})`);
    return parsed.targetId;
  }

  return null;
}
