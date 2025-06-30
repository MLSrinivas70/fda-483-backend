import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { downloadPDFFromURL } from './pdfExtractor.js';


const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const askGemini = async (prompt, documents = []) => {
    const config = {
        // thinkingConfig: {
        //     thinkingBudget: 1000,   // Limit thinking time to 1 second
        // },
        // Aggressive performance optimizations
        generationConfig: {
            maxOutputTokens: 1000,  // Very limited output for speed
            temperature: 0.0,        // Zero temperature for fastest responses
            topP: 0.1,              // Very low randomness for speed
            topK: 1,                // Minimum token selection
            candidateCount: 1,      // Only generate one response
        },
        // Disable safety for maximum speed
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_NONE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
            }
        ],
        responseMimeType: 'application/json',
        systemInstruction: [
            {
                text: prompt,
            }
        ],
    }
    // Use faster model
    const model = 'gemini-1.5-flash';
    const startTime = Date.now();
    
    try {
        console.log(`[LLM] Starting Gemini processing for ${documents.length} documents`);
        
        // Prepare file data for Gemini with size limits
        const pdfDownloadStartTime = Date.now();
        const fileDataPromises = documents.map(async (document, index) => {
            const docStartTime = Date.now();
            // Download PDF from Firebase Storage URL
            const fileBuffer = await downloadPDFFromURL(document.url);
            const docEndTime = Date.now();
            console.log(`[LLM] PDF ${index + 1}/${documents.length} downloaded in ${docEndTime - docStartTime}ms (size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
            
            // Check file size and limit if too large
            const maxSize = 10 * 1024 * 1024; // 10MB limit
            if (fileBuffer.length > maxSize) {
                console.log(`[LLM] PDF ${index + 1} is too large (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB), truncating...`);
                // For now, we'll skip very large files
                return null;
            }
            
            return {
                inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType: 'application/pdf'
                }
            };
        });
        
        // Wait for all PDF downloads to complete in parallel
        const fileData = await Promise.all(fileDataPromises);
        const validFileData = fileData.filter(file => file !== null);
        
        if (validFileData.length === 0) {
            throw new Error('No valid PDF files to process (all files too large)');
        }
        
        const pdfDownloadEndTime = Date.now();
        
        // Log PDF sizes for debugging
        const totalSize = validFileData.reduce((sum, file) => {
            const base64Size = file.inlineData.data.length;
            return sum + base64Size;
        }, 0);
        console.log(`[LLM] Total PDF data size: ${(totalSize / 1024 / 1024).toFixed(2)} MB (${validFileData.length} files)`);
        
        const contents = [
            {
                role: 'user',
                parts: validFileData
            }
        ]
        console.log(`[LLM] All PDF downloads completed in ${pdfDownloadEndTime - pdfDownloadStartTime}ms (parallel processing)`);
        
        // Generate content with files
        const llmStartTime = Date.now();
        console.log(`[LLM] Starting Gemini API call with ${validFileData.length} documents using ${model}`);
        console.log(`[LLM] Config:`, JSON.stringify(config.generationConfig));
        
        // Add timeout to prevent long processing (increased to 45 seconds)
        const apiCallPromise = genAI.models.generateContent({model, contents, config});
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Gemini API timeout after 45 seconds')), 90000);
        });
        
        const response = await Promise.race([apiCallPromise, timeoutPromise]);
        
        const llmEndTime = Date.now();
        console.log(`[LLM] Gemini API call completed in ${llmEndTime - llmStartTime}ms`);
        
        const totalTime = Date.now() - startTime;
        console.log(`[LLM] Total Gemini processing time: ${totalTime}ms`);
        
        return response.text;
        
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`[LLM] Error with Gemini API after ${totalTime}ms:`, error);
        throw error;
    }
}

export const askGpt = async (prompt, documents = []) => {
    const startTime = Date.now();
    
    try {
        console.log(`[LLM] Starting GPT-4.1 processing for ${documents.length} documents`);
        
        // Prepare and upload files for OpenAI
        const pdfDownloadStartTime = Date.now();
        const fileUploadPromises = documents.map(async (document, index) => {
            try {
                const docStartTime = Date.now();
                // Download PDF from Firebase Storage URL
                console.log(`[LLM] Starting download for PDF ${index + 1}/${documents.length}`);
                const fileBuffer = await downloadPDFFromURL(document.url);
                const docEndTime = Date.now();
                console.log(`[LLM] PDF ${index + 1}/${documents.length} downloaded in ${docEndTime - docStartTime}ms (size: ${fileBuffer.length} bytes)`);
                
                // Upload file to OpenAI
                const uploadStartTime = Date.now();
                console.log(`[LLM] Starting upload for PDF ${index + 1}/${documents.length} to OpenAI`);
                
                // Create a proper file object for OpenAI
                const fileName = document.fileName || `document_${index + 1}.pdf`;
                
                return {
                    type: "file",
                    file: {
                        filename: fileName,
                        file_data: `data:application/pdf;base64,${fileBuffer.toString('base64')}`,
                    }
                };
            } catch (error) {
                console.error(`[LLM] Error processing PDF ${index + 1}/${documents.length}:`, error);
                console.error(`[LLM] Error stack:`, error.stack);
                throw error;
            }
        });
        
        // Wait for all PDF downloads and uploads to complete in parallel
        console.log(`[LLM] Waiting for all file operations to complete...`);
        const fileData = await Promise.all(fileUploadPromises);
        const pdfDownloadEndTime = Date.now();
        console.log(`[LLM] All PDF downloads and uploads completed in ${pdfDownloadEndTime - pdfDownloadStartTime}ms (parallel processing)`);
        console.log(`[LLM] File data prepared:`, fileData.length, 'files');
        
        // Generate content with files using GPT-4.1
        const llmStartTime = Date.now();
        console.log(`[LLM] Starting GPT-4.1 API call with ${documents.length} documents`);
        const max_tokens = 512 + fileData.length * 265;
        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                {
                    role: "system",
                    content:prompt
                },
                {
                    role: "user",
                    content: [
                        ...fileData
                    ]
                }
            ],
            max_tokens: max_tokens,
            temperature: 0.1
        });
        
        const llmEndTime = Date.now();
        console.log(`[LLM] GPT-4.1 API call completed in ${llmEndTime - llmStartTime}ms`);
        console.log(response.choices[0].message.content);
        const totalTime = Date.now() - startTime;
        console.log(`[LLM] Total GPT-4.1 processing time: ${totalTime}ms`);
        
        return response.choices[0].message.content;
        
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`[LLM] Error with GPT-4.1 API after ${totalTime}ms:`, error);
        console.error(`[LLM] Error details:`, error.message);
        if (error.response) {
            console.error(`[LLM] Error response:`, error.response.data);
        }
        throw error;
    }
}