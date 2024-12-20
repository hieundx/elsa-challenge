import { create } from 'zustand'
import { Leaderboard, Message, Question } from '../types';

interface SessionState {
    sessionId: string;
    messages: Message[];
    leaderboard: Leaderboard;
    questions: Question[];
    isHost: boolean;

    setLeaderboard: (leaderboard: any[]) => void;
    setSessionId: (id: string) => void;
    addMessage: (message: Message) => void;
    setQuestions: (questions: Question[]) => void;
    setIsHost: (isHost: boolean) => void;
}

const useSessionStore = create<SessionState>((set) => ({
    sessionId: '',
    messages: [],
    leaderboard: [],
    questions: [],
    isHost: false,

    setLeaderboard: (leaderboard: any[]) => set({ leaderboard }),
    setSessionId: (id: string) => set({ sessionId: id }),
    addMessage: (message: Message) => set((state) => ({ messages: [...state.messages, message] })),
    setQuestions: (questions: Question[]) => set({ questions }),
    setIsHost: (isHost: boolean) => set({ isHost }),
}))

export default useSessionStore