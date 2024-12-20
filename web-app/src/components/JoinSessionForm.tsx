import { Card, CardContent, Typography, TextField, Button } from '@mui/material';
import React from 'react';

interface JoinSessionFormProps {
    name: string;
    setName: (name: string) => void;
    sessionId: string;
    setSessionId: (sessionId: string) => void;
    joinSession: () => void;
}

const JoinSessionForm: React.FC<JoinSessionFormProps> = ({
    setName,
    name,
    setSessionId,
    sessionId,
    joinSession
}) => {

    return (
        <Card>
            <CardContent sx={{ maxWidth: 400 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                    Join Session
                </Typography>
                <form
                    onSubmit={(e) => {
                        console.log(e)
                        e.preventDefault();
                        if (name) {
                            joinSession();
                        }
                    }}
                >
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                    />
                    <TextField
                        label="Session ID"
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <Button variant="contained" color="primary" type="submit" fullWidth>
                        {sessionId ? "Join with ID" : "Create Session"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default JoinSessionForm;