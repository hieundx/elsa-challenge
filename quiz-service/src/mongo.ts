import { MongoClient } from "mongodb";

async function getQuizzes() {
    const uri = 'mongodb://localhost:27017'; // Connection URL
    const client = new MongoClient(uri);

    try {
        // Connect to the MongoDB server
        await client.connect();

        // Access the database
        const database = client.db('elsa');
        const collection = database.collection('quiz');

        // Get 10 random items
        const quizzes = await collection.aggregate([{ $sample: { size: 10 } }]).toArray();
        return quizzes;

    } finally {
        // Close the connection
        await client.close();
    }
}

export default getQuizzes;