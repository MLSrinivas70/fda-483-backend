import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocumentsByDateRange, downloadPDFFromURL, getDocumentsByFeiNumbers } from '../utils/pdfExtractor.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const askGemini = async (prompt, documents = []) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    try {
        // Prepare file data for Gemini
        const fileData = [];
        
        for (const document of documents) {
            // Download PDF from Firebase Storage URL
            const fileBuffer = await downloadPDFFromURL(document.url);
            
            fileData.push({
                inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType: 'application/pdf'
                }
            });
        }
        
        // Generate content with files
        const result = await model.generateContent([prompt, ...fileData]);
        const response = await result.response;
        return response.text();
        
    } catch (error) {
        console.error('Error with Gemini API:', error);
        throw error;
    }
}

const getDocumentResult = async(documents) => {

    const categories = [
        'Poor Documentation',
        'Procedures Not Followed',
        'Inadequate Investigations (CAPA)',
        'Lack of Training',
        'Facility & Equipment Issues',
        'Validation Failures',
        'Inadequate Testing',
        'Improper Handling & Storage',
        'Poor Record-Keeping',
        'Adverse Event Reporting Failures'
    ];
    
    const output = [
        {
            companyName: 'Company Name from the PDF',
            dateOfInspection: 'YYYY-MM-DD (date when inspection was conducted)',
            pdfFileName: 'exact filename of the PDF',
            inspectionNumber: 'inspection number if available, otherwise null',
            inspectionDate: 'YYYY-MM-DD (date when 483 was issued)',
            summary: '2-line summary focusing on key compliance violations and critical issues',
            category: 'category',
            repeatFinding: 'repeatFinding',
        }
    ]

    // Create prompt for analysis
    const prompt = `
    Analyze the following FDA 483 inspection report PDF files.
    
    The result should return same as this format ${JSON.stringify(output)}

    For each PDF file, extract:
    1. Company name
    2. Date of inspection (when the inspection was conducted)
    3. Inspection date (when the 483 was issued)
    4. Inspection number (if available)
    5. Provide a 2-line summary focusing on key compliance violations and critical issues
    
    Note: For Each Individual Observation:
    a. Summarize: Rephrase the finding into a clear, concise summary of less than 40 words, Dont repeat the same observation for the same company and dont combine the observations of the same company, generate a new object for each observation.
    b. Categorize: Assign the finding to the single best-fit primary category from the following list: ${JSON.stringify(categories)}. Adhere to the rule: if a finding could fit multiple categories, choose the one representing the most direct and immediate failure (e.g., failure to follow a cleaning SOP is categorized as Procedures Not Followed, not Facility & Equipment Issues).The category should be manditory for each observation.
    c. repeatFinding: Identify and tag any observation that is explicitly described as a "Repeat Finding" in the source text.

    The category should be manditory for each observation and should be one of the following: ${JSON.stringify(categories)}
    `;
    
    // Get AI analysis with PDF files
    const result = await askGemini(prompt, documents);
    
    // Try to parse the JSON response
    let parsedResult;
    try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[0]);
        } else {
            parsedResult = JSON.parse(result);
        }
    } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
    }
    
    return parsedResult
}

export const fetchTimeAnalysis = async (startDate, endDate) => {
    console.log(startDate, endDate, 'startDate, endDate');
    
    try {
        // Get documents from Firestore based on date range
        const documents = await getDocumentsByDateRange(startDate, endDate);
        console.log('Documents found in date range:', documents);
        
        if (documents.length === 0) {
            return { error: `No documents found in Firebase Firestore for the date range: ${startDate} to ${endDate}` };
        }
        console.log(documents, 'documentsdocuments')
        
        console.log('Processing documents from Firestore:', documents.map(d => d.companyName));
        const result = await getDocumentResult(documents);

        return result;        
    } catch (error) {
        console.error('Error in fetchTimeAnalysis:', error);
        return { error: 'Failed to process request', details: error.message };
    }
}

export const fetchFeiNumbers = async(feiNumbers) => {
    try {
        const documents = await getDocumentsByFeiNumbers(feiNumbers);
        if (documents.length === 0) {
            return { error: `No documents found in Firebase Firestore for the feiNumbers: ${feiNumbers}` };
        }
        const result = await getDocumentResult(documents);
        return result;
    } catch (error) {
        console.error('Error in fetchFeiNumbers:', error);
        return { error: 'Failed to process request', details: error.message };
    }
}
