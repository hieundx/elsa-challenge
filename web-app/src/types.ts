export type Leaderboard = {
    name: string;
    socketId: string;
    score: string;
    isHost: boolean
}[]

export type Message = { message: string; name: string, timestamp: number | string }

export type Question = {
    question: string,
    choices: string[]
}