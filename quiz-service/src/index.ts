import express, { Request, Response } from "express";
import http from 'http'
import { Server } from 'socket.io'
import Redis from 'ioredis'
import getQuizzes from "./mongo";

const questionsMock = [
    {
        question: "What is the capital of France?",
        choices: ["Paris", "London", "Berlin", "Madrid"],
        correct_choice: "Paris"
    },
    {
        question: "What is 2 + 2?",
        choices: ["3", "4", "5", "6"],
        correct_choice: "4"
    },
    {
        question: "What is the largest planet in our solar system?",
        choices: ["Earth", "Mars", "Jupiter", "Saturn"],
        correct_choice: "Jupiter"
    },
    {
        question: "Who wrote 'To Kill a Mockingbird'?",
        choices: ["Harper Lee", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald"],
        correct_choice: "Harper Lee"
    },
    {
        question: "What is the boiling point of water?",
        choices: ["90°C", "100°C", "110°C", "120°C"],
        correct_choice: "100°C"
    },
    {
        question: "What is the chemical symbol for gold?",
        choices: ["Au", "Ag", "Pb", "Fe"],
        correct_choice: "Au"
    },
    {
        question: "Who painted the Mona Lisa?",
        choices: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
        correct_choice: "Leonardo da Vinci"
    },
    {
        question: "What is the smallest prime number?",
        choices: ["0", "1", "2", "3"],
        correct_choice: "2"
    },
    {
        question: "What is the capital of Japan?",
        choices: ["Beijing", "Seoul", "Tokyo", "Bangkok"],
        correct_choice: "Tokyo"
    },
    {
        question: "What is the speed of light?",
        choices: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"],
        correct_choice: "300,000 km/s"
    }
];

const app = express();
const PORT = 3000;

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173'
    }
})
const redis = new Redis()

async function handleLeaderboardUpdate(sessionId: string) {
    const leaderboard = await redis.hgetall(`leaderboard:${sessionId}`);
    const hostId = await redis.get(`host:${sessionId}`);
 
    const leaderboardEntries = [];
    for (const [socketId, score] of Object.entries(leaderboard)) {
        leaderboardEntries.push({
            socketId,
            score,
            isHost: socketId === hostId,
            name: await redis.get(`user:${socketId}`)
        });
    }
    io.to(sessionId).emit('leaderboardUpdate', leaderboardEntries);
}


function generateSessionId () {
    return Math.random().toString(36).substring(2, 12).toUpperCase()
}

io.on('connection', (socket) => {
    socket.on('joinSession', async ({ name, sessionId }) => {
        sessionId = sessionId || generateSessionId()

        const clients = await io.in(sessionId).fetchSockets();

        let questions = []
        if (clients.length === 0) {
            // set host to client
            await redis.set(`host:${sessionId}`, socket.id);

            // set room state to ready
            await redis.set(`state:${sessionId}`, 'READY');

            questions = await getQuizzes()

            // retrieve 10 random sets of quizzes from DB and save to redis
            await redis.set(`questions:${sessionId}`, JSON.stringify(questions));
        }

        const storedQuestions = await redis.get(`questions:${sessionId}`);
        questions = storedQuestions ? JSON.parse(storedQuestions) : [];

        socket.join(sessionId)

        // Track socket-related info
        await redis.set(`room:${socket.id}`, sessionId);
        await redis.set(`user:${socket.id}`, name);

        // send list of quizzes to client
        socket.emit('sessionJoined', {
            questions: questions.map((q: any) => ({ question: q.question, choices: q.choices })),
            sessionId
        })

        // Add user to leaderboard with initial score of 0
        await redis.hset(`leaderboard:${sessionId}`, socket.id, 0);
        await handleLeaderboardUpdate(sessionId)
    });

    socket.on('disconnect', async () => {
        const sessionId = await redis.get(`room:${socket.id}`) || '';
        const clients = await io.in(sessionId).fetchSockets();
 
        await redis.del(`user:${socket.id}`);
        await redis.del(`room:${socket.id}`);
        await redis.hdel(`leaderboard:${sessionId}`, socket.id);
        if (clients.length >= 1) {
            const hostId = await redis.get(`host:${sessionId}`);

            // if there are clients left in room, assign host to them
            if (hostId === socket.id) {
                await redis.set(`host:${sessionId}`, clients[0].id);
            }
        } else {
            // clear all room data if no one is left
            await redis.del(`host:${sessionId}`);
            await redis.del(`state:${sessionId}`);
            await redis.del(`questions:${sessionId}`);
        }
        
        // leave room
        socket.leave(sessionId)

        await handleLeaderboardUpdate(sessionId)
    });

    socket.on('start', async () => {
        const sessionId = await redis.get(`room:${socket.id}`) || '';
        const state = await redis.get(`state:${sessionId}`);

        const hostId = await redis.get(`host:${sessionId}`);

        if (socket.id === hostId && state === 'READY') {
            await redis.set(`state:${sessionId}`, 'IN_PROGRESS');

            io.to(sessionId).emit('eventStarted');

            let timeLeft = 20;

            const timerInterval = setInterval(async () => {
                if (timeLeft > 0) {
                    io.to(sessionId).emit('timer', { timeLeft });
                    timeLeft--;
                } else {
                    clearInterval(timerInterval);
                    io.to(sessionId).emit('eventEnded');
                    await redis.set(`state:${sessionId}`, 'ENDED');
                }
            }, 1000);
        }
    })

    socket.on('restart', async () => {
        const sessionId = await redis.get(`room:${socket.id}`) || '';
        const hostId = await redis.get(`host:${sessionId}`);

        if (socket.id === hostId) {
            await redis.set(`state:${sessionId}`, 'READY');

            // reset scores to 0
            const participants = await redis.hkeys(`leaderboard:${sessionId}`);
            for (const participant of participants) {
                await redis.hset(`leaderboard:${sessionId}`, participant, 0);
            }

            // get 10 new questions from DB
            await redis.set(`questions:${sessionId}`, JSON.stringify(questionsMock));

            io.to(sessionId).emit('sessionRestarted', {
                questions: questionsMock.map(q => ({ question: q.question, choices: q.choices }))
            });

            await handleLeaderboardUpdate(sessionId)
        }
    })

    socket.on('submit', async ({ questionIdx, answer }) => {
        const sessionId = await redis.get(`room:${socket.id}`) || '';
        const state = await redis.get(`state:${sessionId}`);

        if (state === 'IN_PROGRESS') {
            const questions = JSON.parse(await redis.get(`questions:${sessionId}`) || '[]');
            const correctAnswer = questions[questionIdx]?.correct_choice;

            if (correctAnswer && answer === correctAnswer) {
                const currentScore = await redis.hget(`leaderboard:${sessionId}`, socket.id);
                const newScore = parseInt(currentScore || '0') + 10;
                await redis.hset(`leaderboard:${sessionId}`, socket.id, newScore);
                await handleLeaderboardUpdate(sessionId);
            }

            socket.emit('answerResult', { correct: answer === correctAnswer });
        }
    })

    socket.on('sendMessage', async ({ message }) => {
        const sessionId = await redis.get(`room:${socket.id}`) || '';
        const name = await redis.get(`user:${socket.id}`) || 'Anonymous';

        io.to(sessionId).emit('receiveMessage', { name, message });
    });
});


// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

io.listen(PORT)