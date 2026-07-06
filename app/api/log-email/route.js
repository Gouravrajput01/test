// app/api/log-email/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, timestamp, action } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      );
    }

    const logPath = path.join(process.cwd(), 'log.txt');
    const logEntry = `[${timestamp || new Date().toISOString()}] ${action || 'initial'} - ${email}\n`;

    fs.appendFileSync(logPath, logEntry, 'utf8');

    console.log('✅ Email logged:', email, action);

    return NextResponse.json(
      { success: true, message: 'Email logged successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error logging email:', error);
    
    try {
      const logPath = path.join(process.cwd(), 'log.txt');
      const fallbackEntry = `[${new Date().toISOString()}] ERROR: ${error.message}\n`;
      fs.appendFileSync(logPath, fallbackEntry, 'utf8');
    } catch (fsError) {
      console.error('Failed to write to log file:', fsError);
    }

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}