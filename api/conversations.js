const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Claude API Error 클래스
class ClaudeAPIError extends Error {
    constructor(type, message, statusCode, requestId = null) {
        super(message);
        this.name = 'ClaudeAPIError';
        this.type = type;
        this.statusCode = statusCode;
        this.requestId = requestId;
    }
}

// Claude API 호출 함수 (제목 생성용)
async function callClaudeAPIForTitle(prompt) {
    const apiKey = process.env.claude_api_key || process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        throw new ClaudeAPIError('authentication_error', 'Claude API 키가 설정되지 않았습니다.', 401);
    }

    try {
        const requestBody = {
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 50,
            messages: [{ role: 'user', content: prompt }]
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || '새 대화';
    } catch (error) {
        console.error('Claude API 제목 생성 실패:', error);
        return '새 대화';
    }
}

// 대화 제목 자동 생성
async function generateConversationTitle(messages) {
    try {
        const recentMessages = messages.slice(0, 4); // 최근 4개 메시지만 사용
        const content = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        
        const prompt = `다음 대화 내용을 보고 한글 6-8자의 간단한 제목을 만들어주세요. 맛집 관련 대화라면 지역명이나 음식명을 포함하세요.

대화 내용:
${content}

조건:
- 한글 6-8자 이내
- 구체적이고 명확하게
- 예시: "해운대 맛집", "서면 카페", "부산 여행"

제목:`;

        return await callClaudeAPIForTitle(prompt);
    } catch (error) {
        console.error('제목 생성 실패:', error);
        return '새 대화';
    }
}

// 대화 세션 생성 또는 업데이트
async function createOrUpdateSession(sessionId, userId, isNewMessage = false) {
    try {
        // 기존 세션 확인
        const { data: existingSession, error: selectError } = await supabase
            .from('conversation_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            console.error('세션 조회 에러:', selectError);
            return null;
        }

        if (existingSession) {
            // 기존 세션 업데이트 (마지막 메시지 시간)
            if (isNewMessage) {
                const { error: updateError } = await supabase
                    .from('conversation_sessions')
                    .update({ last_message_at: new Date().toISOString() })
                    .eq('id', existingSession.id);

                if (updateError) {
                    console.error('세션 업데이트 에러:', updateError);
                }
            }
            return existingSession;
        } else {
            // 새 세션 생성
            const { data: newSession, error: insertError } = await supabase
                .from('conversation_sessions')
                .insert({
                    session_id: sessionId,
                    user_id: userId,
                    title: '새 대화',
                    last_message_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                console.error('세션 생성 에러:', insertError);
                return null;
            }

            return newSession;
        }
    } catch (error) {
        console.error('세션 관리 에러:', error);
        return null;
    }
}

// 대화 제목 업데이트 (AI 생성)
async function updateConversationTitle(sessionId) {
    try {
        // 해당 세션의 최근 메시지들 가져오기
        const { data: messages, error: messagesError } = await supabase
            .from('conversations')
            .select('role, content')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(6);

        if (messagesError || !messages || messages.length === 0) {
            return;
        }

        // AI로 제목 생성
        const title = await generateConversationTitle(messages);

        // 제목 업데이트
        const { error: updateError } = await supabase
            .from('conversation_sessions')
            .update({ title })
            .eq('session_id', sessionId);

        if (updateError) {
            console.error('제목 업데이트 에러:', updateError);
        } else {
            console.log(`📝 제목 업데이트: ${sessionId} -> "${title}"`);
        }
    } catch (error) {
        console.error('제목 업데이트 실패:', error);
    }
}

module.exports = async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { sessionId } = req.query;
    const googleUserId = req.headers['x-user-id'];

    if (!googleUserId) {
        return res.status(401).json({ 
            success: false, 
            error: '사용자 인증이 필요합니다.' 
        });
    }

    // 사용자 이메일로 실제 DB의 user_id 찾기
    const userEmail = req.headers['x-user-email'];
    
    if (!userEmail) {
        return res.status(401).json({ 
            success: false, 
            error: '사용자 이메일이 필요합니다.' 
        });
    }

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

    if (userError) {
        console.error('사용자 조회 에러:', userError);
        return res.status(401).json({ 
            success: false, 
            error: '사용자 정보를 찾을 수 없습니다.',
            details: userError.message
        });
    }

    if (!userData) {
        return res.status(401).json({ 
            success: false, 
            error: '등록되지 않은 사용자입니다.' 
        });
    }

    const userId = userData.id;

    try {
        switch (req.method) {
            case 'GET':
                if (sessionId) {
                    // 특정 대화의 메시지 목록 조회
                    const { data: messages, error: messagesError } = await supabase
                        .from('conversations')
                        .select('*')
                        .eq('session_id', sessionId)
                        .eq('user_id', userId)
                        .order('created_at', { ascending: true });

                    if (messagesError) {
                        return res.status(500).json({
                            success: false,
                            error: '메시지 조회 실패'
                        });
                    }

                    res.json({
                        success: true,
                        messages: messages || []
                    });
                } else {
                    // 사용자의 모든 대화 세션 목록 조회
                    const { data: sessions, error: sessionsError } = await supabase
                        .from('conversation_sessions')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('is_archived', false)
                        .order('last_message_at', { ascending: false });

                    if (sessionsError) {
                        return res.status(500).json({
                            success: false,
                            error: '대화 목록 조회 실패'
                        });
                    }

                    // 날짜별 그룹핑
                    const groupedSessions = groupSessionsByDate(sessions || []);

                    res.json({
                        success: true,
                        sessions: groupedSessions,
                        total: sessions?.length || 0
                    });
                }
                break;

            case 'POST':
                const { title, content, role, sessionId: messageSessionId, messages } = req.body;
                
                if (messages && messageSessionId) {
                    // 대화 세트 저장 (사용자 메시지 + 봇 응답)
                    console.log('💾 대화 세트 저장 요청:', { 
                        sessionId: messageSessionId, 
                        messageCount: messages.length,
                        userId: userId,
                        messages: messages.map(m => ({ role: m.role, contentPreview: m.content.substring(0, 50) }))
                    });
                    
                    // 세션 존재 여부 확인 및 생성
                    const session = await createOrUpdateSession(messageSessionId, userId, true);
                    if (!session) {
                        console.error('❌ 세션 생성/업데이트 실패');
                        return res.status(500).json({
                            success: false,
                            error: '세션 생성/업데이트 실패'
                        });
                    }
                    
                    // 여러 메시지를 한 번에 저장
                    const messagesToInsert = messages.map(msg => ({
                        session_id: messageSessionId,
                        user_id: userId,
                        role: msg.role,
                        content: msg.content,
                        metadata: msg.metadata || null // 맛집 데이터 등 메타데이터 저장
                    }));
                    
                    console.log('📝 저장할 메시지들:', messagesToInsert.map(m => ({ 
                        role: m.role, 
                        contentLength: m.content.length,
                        preview: m.content.substring(0, 30) 
                    })));
                    
                    const { data: savedMessages, error: messageError } = await supabase
                        .from('conversations')
                        .insert(messagesToInsert)
                        .select();

                    if (messageError) {
                        console.error('❌ 대화 세트 저장 에러:', messageError);
                        return res.status(500).json({
                            success: false,
                            error: '대화 세트 저장 실패',
                            details: messageError.message
                        });
                    }

                    console.log('✅ 대화 세트 저장 성공:', { 
                        count: savedMessages.length,
                        savedRoles: savedMessages.map(m => m.role)
                    });
                    
                    res.json({
                        success: true,
                        message: `${savedMessages.length}개 메시지가 저장되었습니다`,
                        data: savedMessages
                    });
                } else if (content && role && messageSessionId) {
                    // 단일 메시지 저장 (기존 방식 - 호환성 유지)
                    console.log('💾 단일 메시지 저장 요청:', { sessionId: messageSessionId, role, content: content.substring(0, 50) + '...' });
                    
                    // 세션 존재 여부 확인 및 생성
                    const session = await createOrUpdateSession(messageSessionId, userId, true);
                    if (!session) {
                        return res.status(500).json({
                            success: false,
                            error: '세션 생성/업데이트 실패'
                        });
                    }
                    
                    // 메시지 저장
                    const { data: message, error: messageError } = await supabase
                        .from('conversations')
                        .insert({
                            session_id: messageSessionId,
                            user_id: userId,
                            role: role,
                            content: content
                        })
                        .select()
                        .single();

                    if (messageError) {
                        console.error('메시지 저장 에러:', messageError);
                        return res.status(500).json({
                            success: false,
                            error: '메시지 저장 실패',
                            details: messageError.message
                        });
                    }

                    console.log('✅ 단일 메시지 저장 성공:', { messageId: message.id });
                    
                    res.json({
                        success: true,
                        message: '메시지가 저장되었습니다',
                        data: message
                    });
                } else {
                    // 새 대화 세션 생성 (기존 로직)
                    const newTitle = title || '새 대화';
                    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                    const { data: newSession, error: createError } = await supabase
                        .from('conversation_sessions')
                        .insert({
                            session_id: newSessionId,
                            user_id: userId,
                            title: newTitle
                        })
                        .select()
                        .single();

                    if (createError) {
                        console.error('대화 생성 에러:', createError);
                        return res.status(500).json({
                            success: false,
                            error: '대화 생성 실패',
                            details: createError.message,
                            code: createError.code
                        });
                    }

                    res.json({
                        success: true,
                        session: newSession
                    });
                }
                break;

            case 'PUT':
                // 대화 세션 업데이트 (제목, 즐겨찾기 등)
                if (!sessionId) {
                    return res.status(400).json({
                        success: false,
                        error: 'session_id가 필요합니다.'
                    });
                }

                const { title: newTitle, is_favorite } = req.body;
                const updateData = {};
                
                if (newTitle !== undefined) updateData.title = newTitle;
                if (is_favorite !== undefined) updateData.is_favorite = is_favorite;

                const { error: updateError } = await supabase
                    .from('conversation_sessions')
                    .update(updateData)
                    .eq('session_id', sessionId)
                    .eq('user_id', userId);

                if (updateError) {
                    return res.status(500).json({
                        success: false,
                        error: '대화 업데이트 실패'
                    });
                }

                res.json({
                    success: true,
                    message: '대화가 업데이트되었습니다.'
                });
                break;

            case 'DELETE':
                // 대화 아카이브 (소프트 삭제)
                if (!sessionId) {
                    return res.status(400).json({
                        success: false,
                        error: 'session_id가 필요합니다.'
                    });
                }

                const { error: deleteError } = await supabase
                    .from('conversation_sessions')
                    .update({ is_archived: true })
                    .eq('session_id', sessionId)
                    .eq('user_id', userId);

                if (deleteError) {
                    return res.status(500).json({
                        success: false,
                        error: '대화 삭제 실패'
                    });
                }

                res.json({
                    success: true,
                    message: '대화가 삭제되었습니다.'
                });
                break;

            default:
                res.status(405).json({
                    success: false,
                    error: '지원하지 않는 메서드입니다.'
                });
        }
    } catch (error) {
        console.error('대화 관리 API 에러:', error);
        res.status(500).json({
            success: false,
            error: '서버 오류가 발생했습니다.'
        });
    }
};

// 날짜별 그룹핑 함수
function groupSessionsByDate(sessions) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = {
        today: [],
        yesterday: [],
        thisWeek: [],
        older: []
    };

    sessions.forEach(session => {
        const sessionDate = new Date(session.last_message_at);
        const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

        if (sessionDay.getTime() === today.getTime()) {
            groups.today.push(session);
        } else if (sessionDay.getTime() === yesterday.getTime()) {
            groups.yesterday.push(session);
        } else if (sessionDate >= weekAgo) {
            groups.thisWeek.push(session);
        } else {
            groups.older.push(session);
        }
    });

    return groups;
}

// 외부에서 사용할 수 있도록 함수들 export
module.exports.createOrUpdateSession = createOrUpdateSession;
module.exports.updateConversationTitle = updateConversationTitle;