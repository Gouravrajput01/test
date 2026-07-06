// app/api/log-email/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, timestamp, message, violations } = body;
    
    const logEntry = `[${timestamp || new Date().toISOString()}] ${message || 'Email entered'} | Email: ${email} | Violations: ${violations || 0}\n`;
    
    // Log to file (server-side)
    const logPath = path.join(process.cwd(), 'logs', 'emails.txt');
    
    // Ensure logs directory exists
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append to file
    fs.appendFileSync(logPath, logEntry, 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email logged successfully',
      entry: logEntry.trim()
    });
    
  } catch (error) {
    console.error('Log error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}