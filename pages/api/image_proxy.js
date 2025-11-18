// Vercel serverless function for proxying images to bypass CORS
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    const { url } = req.query;
    
    if (!url) {
        res.status(400).json({ error: 'URL parameter is required' });
        return;
    }
    
    // Security: Only allow specific domains
    const allowedDomains = [
        'www.visitbusan.net',
        'visitbusan.net'
    ];
    
    try {
        const targetUrl = new URL(url);
        if (!allowedDomains.includes(targetUrl.hostname)) {
            res.status(403).json({ error: 'Domain not allowed' });
            return;
        }
        
        console.log('Proxying image:', url);
        
        // Fetch the image
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Cache-Control': 'max-age=0'
            }
        });
        
        if (!response.ok) {
            console.error('Failed to fetch image:', response.status, response.statusText);
            res.status(response.status).json({ 
                error: 'Failed to fetch image',
                status: response.status,
                statusText: response.statusText
            });
            return;
        }
        
        // Get content type
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // Set appropriate headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Stream the image data
        const imageBuffer = await response.arrayBuffer();
        res.status(200).send(Buffer.from(imageBuffer));
        
        console.log('Image proxied successfully:', url);
        
    } catch (error) {
        console.error('Error proxying image:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
}