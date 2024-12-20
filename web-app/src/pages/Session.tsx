import Grid from '@mui/material/Grid2';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { Badge, Box, Button, Card, CardContent, Typography } from '@mui/material';
import Chatbox from '../components/Chatbox';
import useSessionStore from '../stores/sessionStore';
import socket from '../socket';
import { useEffect, useState } from 'react';

enum SessionState {
    READY = 'READY',
    IN_PROGRESS = 'IN_PROGRESS',
    ENDED = 'ENDED'
}

export function Session() {
    const { sessionId, leaderboard, isHost, setQuestions, questions } = useSessionStore()

    const [sessionState, setSessionState] = useState(SessionState.READY)

    const [timer, setTimer] = useState<number | null>(null)

    const [qIndex, setQIndex] = useState(0)

    const handleStart = () => {
        socket.emit('start')
    }

    const handleRestart = () => {
        socket.emit('restart')
    }

    useEffect(() => {
        socket.on('timer', (timer) => {
            setTimer(timer.timeLeft)
        })
        socket.on('eventStarted', () => {
            setSessionState(SessionState.IN_PROGRESS)
        })
        socket.on('eventEnded', () => {
            setSessionState(SessionState.ENDED)
            setQIndex(0)
            setTimer(null)
        })
        socket.on('sessionRestarted', ({ questions }) => {
            setQuestions(questions)
            setSessionState(SessionState.READY)
        })
    })

    const handleAnswer = (answer: string) => {
        // emit answer event
        socket.emit('submit', {
            questionIdx: qIndex,
            answer
        })
        setQIndex((prev) => (prev + 1))
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Grid container spacing={2}>
                <Grid size={3}>
                    <Card>
                        <CardContent sx={{ height: 600 }}>
                            <Typography>Leaderboard</Typography>
                            <List>
                                {leaderboard.map((entry) => (
                                    <ListItem
                                        key={entry.socketId}
                                        sx={{
                                            border: '1px solid #ccc',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        <ListItemText
                                            primary={(entry.isHost ? '[Host] ' : '') + `${entry.name}`}
                                            secondary={`${entry.score} points`} />
                                        <Badge />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={6}>
                    <Card>
                        <CardContent sx={{
                            height: 600,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative'
                        }}>
                            <Box sx={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                fontSize: 20
                            }}>
                                Session ID: {sessionId}
                            </Box>
                            <Box sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                fontSize: 20
                            }}>
                                {timer}
                            </Box>
                            {(() => {
                                switch (sessionState) {
                                    case SessionState.READY:
                                        return isHost ? <Button onClick={handleStart} variant='contained' size='large' disabled={leaderboard.length < 2}>Start</Button> : 'WAITING FOR HOST'
                                    case SessionState.IN_PROGRESS:
                                        return questions[qIndex] ? (
                                            <Box>
                                                <Grid container spacing={2}>
                                                    <Grid size={12}>
                                                        <Typography variant="h5">Question {qIndex + 1}</Typography>
                                                        <Typography variant="body1">{questions[qIndex].question}</Typography>
                                                    </Grid>
                                                    {questions[qIndex].choices.map((choice, index) => (
                                                        <Grid size={6} key={index}>
                                                            <Button variant="outlined" fullWidth onClick={() => handleAnswer(choice)}>
                                                                {choice}
                                                            </Button>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </Box>
                                        ) : (
                                            <Typography variant="body1">Waiting for others to finish</Typography>
                                        )
                                    case SessionState.ENDED:
                                        return <Box display={'flex'} flexDirection={'column'}>
                                            <Typography variant='h4'>Result</Typography>
                                            {leaderboard.map((entry, index) => (
                                                <Typography key={entry.socketId} >
                                                    {index + 1}. {`${entry.name}`} - {entry.score} points
                                                </Typography>
                                            ))}
                                            {
                                                isHost && <Button onClick={handleRestart} variant='contained' size='large' sx={{ mt: 2 }}>
                                                    Restart
                                                </Button>
                                            }
                                        </Box>
                                    default:
                                        return null;
                                }
                            })()}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={3}>
                    <Card>
                        <CardContent sx={{ height: 600 }}>
                            <Chatbox />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Session;