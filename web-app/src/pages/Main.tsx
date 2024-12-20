import { Container } from '@mui/material';
import { useState, useEffect } from 'react';
import Session from './Session';
import JoinSessionForm from '../components/JoinSessionForm';
import { ToastContainer } from 'react-toastify';
import { Leaderboard, Message, Question } from '../types';
import socket from '../socket';
import useSessionStore from '../stores/sessionStore';


function Main() {
    const [name, setName] = useState('');

    const { addMessage, setLeaderboard, sessionId, setSessionId, setQuestions, setIsHost } = useSessionStore()

    const [joined, setJoined] = useState(false)

    useEffect(() => {
        const handleSessionJoined = ({
            sessionId,
            questions
        }: {
            sessionId: string,
            questions: Question[]
        }) => {
            setSessionId(sessionId)
            setJoined(true)
            setQuestions(questions)
        };
    
        const handleLeaderboardUpdate = (leaderboard: Leaderboard) => {
            leaderboard.sort((a, b) => parseInt(b.score) - parseInt(a.score));
            setLeaderboard(leaderboard);
            const isHost = leaderboard.some(player => player.isHost && player.socketId === socket.id);
            setIsHost(isHost)
        };
    
        const handleReceiveMessage = (message: Message) => {
            addMessage(message)
        };
    
        socket.on('sessionJoined', handleSessionJoined);
        socket.on('leaderboardUpdate', handleLeaderboardUpdate);
        socket.on('receiveMessage', handleReceiveMessage);

        socket.on('disconnect', () => {
            window.location.href = '/'
            window.alert('Disconnected from Server')
        })
    
        // Cleanup function to avoid multiple listeners
        return () => {
            socket.off('sessionJoined', handleSessionJoined);
            socket.off('leaderboardUpdate', handleLeaderboardUpdate);
            socket.off('receiveMessage', handleReceiveMessage);
        };
    }, []);
    

    const joinSession = () => {
        socket.emit('joinSession', { name, sessionId });
    };

    return (
        <Container style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh' 
        }}>
            {
                joined ? <Session /> : <JoinSessionForm 
                    name={name}
                    setName={setName} 
                    sessionId={sessionId} 
                    setSessionId={setSessionId} 
                    joinSession={joinSession}
                />
            }
            <ToastContainer />
        </Container>
    );
}

export default Main;