import express from 'express';
import { fetchFeiNumbers, fetchFirebaseData, fetchTimeAnalysis } from '../controllers/index.js';

const router = express.Router();

router.get('/timeAnalysis', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    try {
        const result = await fetchTimeAnalysis(startDate, endDate);
        if (result.error) {
            return res.status(500).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('Route error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

router.post('/browseDocuments', async (req, res) => {
    const { feiNumbers } = req.body;
    
    // Parse feiNumbers if it's a string
    let parsedFeiNumbers = feiNumbers;
    if (typeof feiNumbers === 'string') {
        try {
            parsedFeiNumbers = JSON.parse(feiNumbers);
        } catch (error) {
            console.error('Error parsing feiNumbers:', error);
            return res.status(400).json({ error: 'Invalid feiNumbers format' });
        }
    }
    
    // Convert FEI numbers to numbers (Firestore stores them as numbers)
    if (Array.isArray(parsedFeiNumbers)) {
        parsedFeiNumbers = parsedFeiNumbers.map(fei => {
            const num = parseInt(fei, 10);
            if (isNaN(num)) {
                throw new Error(`Invalid FEI number: ${fei}`);
            }
            return num;
        });
    }
    
    if (!parsedFeiNumbers || parsedFeiNumbers.length === 0) {
        return res.status(400).json({ error: 'FEI Numbers are required' });
    }
    
    console.log('Parsed FEI numbers (as numbers):', parsedFeiNumbers);
    
    try {
        const result = await fetchFeiNumbers(parsedFeiNumbers);
        res.json(result);
    } catch (error) {
        console.error('Error listing documents from Firestore:', error);
        res.status(500).json({ error: 'Failed to list documents from Firestore', details: error.message });
    }
});

router.get('/firebaseData', async (req, res) => {
    const result = await fetchFirebaseData();
    if (result.error) {
        return res.status(500).json(result);
    }
    res.json(result);
});

export default router;