import { Box, Button, TextField } from "@mui/material";
import React from "react";
import socket from "../socket";
import useSessionStore from "../stores/sessionStore";

const Chatbox = () => {
    const { sessionId, messages } = useSessionStore()

    const [message, setMessage] = React.useState<string>("");

    const handleSend = () => {
        if (message.trim()) {
            setMessage("");
            socket.emit('sendMessage', { sessionId, message})
        }
    };

    return (
        <Box display={'flex'} flexDirection={'column'} height='100%' justifyContent={'space-between'}>
            <Box sx={{ overflowY: 'scroll' }}>
                {messages.map((message) => (
                    <Box key={message.timestamp}>
                        {message.name}: {message.message}
                    </Box>
                ))}
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                    size='small'
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Say something..."
                    style={{ flexGrow: 1, marginRight: '8px' }}
                />
                <Button color="primary" variant="contained" onClick={handleSend}>Send</Button>
            </Box>
        </Box>
    );
};

export default Chatbox;