import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * 消息类型
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

/**
 * 消息接口
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * 会话接口
 */
export interface Session {
  id: string;
  messages: Message[];
  mode: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 会话管理器
 */
export class SessionManager {
  private sessionsDir: string;
  private currentSession: Session | null = null;

  /**
   * 构造函数
   */
  constructor() {
    this.sessionsDir = path.join(os.homedir(), '.roo-cli', 'sessions');
    fs.ensureDirSync(this.sessionsDir);
  }

  /**
   * 创建新会话
   * @param mode 模式
   * @param cwd 工作目录
   * @param systemPrompt 系统提示
   * @returns 会话ID
   */
  createSession(mode: string, cwd: string, systemPrompt: string): string {
    const sessionId = uuidv4();
    const now = Date.now();
    
    const session: Session = {
      id: sessionId,
      messages: [
        {
          role: MessageRole.SYSTEM,
          content: systemPrompt,
        },
      ],
      mode,
      cwd,
      createdAt: now,
      updatedAt: now,
    };
    
    this.currentSession = session;
    this.saveSession(session);
    
    return sessionId;
  }

  /**
   * 获取会话
   * @param sessionId 会话ID
   * @returns 会话
   */
  getSession(sessionId: string): Session | null {
    if (this.currentSession && this.currentSession.id === sessionId) {
      return this.currentSession;
    }
    
    const sessionPath = path.join(this.sessionsDir, `${sessionId}.json`);
    
    if (fs.existsSync(sessionPath)) {
      const sessionData = fs.readJsonSync(sessionPath);
      this.currentSession = sessionData;
      return sessionData;
    }
    
    return null;
  }

  /**
   * 添加用户消息
   * @param sessionId 会话ID
   * @param content 消息内容
   * @returns 更新后的会话
   */
  addUserMessage(sessionId: string, content: string): Session | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }
    
    session.messages.push({
      role: MessageRole.USER,
      content,
    });
    
    session.updatedAt = Date.now();
    this.saveSession(session);
    
    return session;
  }

  /**
   * 添加助手消息
   * @param sessionId 会话ID
   * @param content 消息内容
   * @returns 更新后的会话
   */
  addAssistantMessage(sessionId: string, content: string): Session | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }
    
    session.messages.push({
      role: MessageRole.ASSISTANT,
      content,
    });
    
    session.updatedAt = Date.now();
    this.saveSession(session);
    
    return session;
  }

  /**
   * 添加工具消息
   * @param sessionId 会话ID
   * @param content 消息内容
   * @returns 更新后的会话
   */
  addToolMessage(sessionId: string, content: string): Session | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }
    
    session.messages.push({
      role: MessageRole.TOOL,
      content,
    });
    
    session.updatedAt = Date.now();
    this.saveSession(session);
    
    return session;
  }

  /**
   * 获取会话消息
   * @param sessionId 会话ID
   * @returns 会话消息
   */
  getMessages(sessionId: string): Message[] {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return [];
    }
    
    return session.messages;
  }

  /**
   * 获取会话工作目录
   * @param sessionId 会话ID
   * @returns 工作目录
   */
  getWorkingDirectory(sessionId: string): string | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }
    
    return session.cwd;
  }

  /**
   * 获取会话模式
   * @param sessionId 会话ID
   * @returns 模式
   */
  getMode(sessionId: string): string | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }
    
    return session.mode;
  }

  /**
   * 保存会话
   * @param session 会话
   */
  private saveSession(session: Session): void {
    const sessionPath = path.join(this.sessionsDir, `${session.id}.json`);
    fs.writeJsonSync(sessionPath, session, { spaces: 2 });
  }
}
